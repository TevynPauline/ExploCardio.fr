import { dbSite } from "@/lib/db/site";
import { emailsComptes } from "@/emails/modeles-comptes";
import { MESSAGE_NUMERO_INVALIDE } from "./inscription";
import { normaliserNumero, siretOuSirenValide } from "./numeros";
import { notifier } from "./securite";

// Numéro d'entreprise des comptes (F16, US7, FR-023 à FR-026, FR-034) : SIRET ou SIREN saisi à
// l'inscription, dans Mon compte ou dans le tunnel ; vérifié après coup par l'équipe. Tant qu'il
// n'est pas vérifié, les appareils loués ne sont pas expédiés. Un refus suspend le compte.

export class NumeroRefuse extends Error {}

type Auteur = { id: string; libelle: string };

async function journal(auteur: Auteur | null, action: string, compteId: string, detail: object) {
  await dbSite().journalAction.create({
    data: { auteurId: auteur?.id ?? null, auteur: auteur?.libelle ?? "client", action, objet: compteId, detail: JSON.parse(JSON.stringify(detail)) },
  });
}

/** Enregistre un numéro (nouveau ou modifié) : il repasse « à vérifier ». */
export async function enregistrerNumero(compteId: string, saisie: string, auteur: Auteur | null = null): Promise<string> {
  const numero = normaliserNumero(saisie);
  if (!siretOuSirenValide(numero)) throw new NumeroRefuse(MESSAGE_NUMERO_INVALIDE);
  const avant = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (avant.siret === numero && avant.numeroVerification) return numero;
  await dbSite().compteClient.update({
    where: { id: compteId },
    data: { siret: numero, numeroVerification: "a_verifier", numeroVerifieLe: null, numeroVerifiePar: null, motifRefusNumero: null },
  });
  await journal(auteur, "comptes.numero_saisi", compteId, { avant: avant.siret, apres: numero });
  // F02 : le cadeau de bienvenue suit le numéro (un par numéro) ; il s'ouvre dès sa saisie.
  const { ouvrirDroitSiEligible } = await import("./bienvenue");
  await ouvrirDroitSiEligible(compteId);
  return numero;
}

/** Numéro vérifié par l'équipe : les locations en attente sont expédiables (FR-034). */
export async function verifierNumero(compteId: string, auteur: Auteur): Promise<void> {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (!c.siret) throw new NumeroRefuse("Ce compte n'a pas encore de numéro d'entreprise.");
  await dbSite().compteClient.update({ where: { id: compteId }, data: { numeroVerification: "verifie", numeroVerifieLe: new Date(), numeroVerifiePar: auteur.libelle, motifRefusNumero: null } });
  await journal(auteur, "comptes.numero_verifie", compteId, { numero: c.siret });
  const { surCompteValide } = await import("../location/validation");
  await surCompteValide(compteId);
}

/**
 * Numéro refusé (motif obligatoire) : compte suspendu pour les commandes suivantes, client
 * prévenu ; les locations pas encore expédiées sont annulées et remboursées (F05, FR-045) ; les
 * autres commandes sont traitées au cas par cas par l'équipe.
 */
export async function refuserNumero(compteId: string, auteur: Auteur, motif: string): Promise<void> {
  if (motif.trim().length < 3) throw new NumeroRefuse("Indiquez le motif du refus.");
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  await dbSite().compteClient.update({
    where: { id: compteId },
    data: { numeroVerification: "refuse", numeroVerifieLe: new Date(), numeroVerifiePar: auteur.libelle, motifRefusNumero: motif.trim(), ...(c.statut === "valide" ? { statut: "suspendu" as const } : {}) },
  });
  await dbSite().decisionCompte.create({ data: { compteId, decision: "suspension", motif: `Numéro refusé : ${motif.trim()}`, auteurId: auteur.id } });
  await notifier(c.utilisateur.email, await emailsComptes.numeroRefuse(motif.trim()), "numéro d'entreprise refusé");
  await journal(auteur, "comptes.numero_refuse", compteId, { numero: c.siret, motif: motif.trim() });
  const { surCompteRefuse } = await import("../location/validation");
  await surCompteRefuse(compteId, `Numéro d'entreprise refusé : ${motif.trim()}`);
  if (c.statut === "valide") {
    const { surCompteSuspendu } = await import("../cloud/comptes");
    await surCompteSuspendu(compteId, { id: auteur.id, libelle: "numéro d'entreprise refusé" });
  }
}

/** Numéro absent : à demander dans le tunnel avant le paiement (FR-025). */
export function numeroManquant(compte: { siret: string | null }): boolean {
  return !compte.siret;
}
