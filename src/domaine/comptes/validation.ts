import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { envoyerTache } from "@/file-attente";
import { dbSite } from "@/lib/db/site";
import { emailsComptes } from "@/emails/modeles-comptes";
import { ouvrirDroitSiEligible } from "./bienvenue";
import { notifier } from "./securite";
import { exigerTransition, type Statut } from "./statuts";

// Décisions de l'équipe sur les comptes (F02, US2, R3).

export const FILE_FICHE_CLIENT = "fiche-client";

type Auteur = { id: string; libelle: string } | null;

async function journal(auteur: Auteur, action: string, compteId: string, detail: object) {
  await dbSite().journalAction.create({
    data: { auteurId: auteur?.id ?? null, auteur: auteur?.libelle ?? "validation automatique", action, objet: compteId, detail: JSON.parse(JSON.stringify(detail)) },
  });
}

/** Crée ou retrouve la fiche client dans Odoo et enregistre sa référence (FR-015). */
export async function creerFicheClient(compteId: string): Promise<string> {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true, adresses: true } });
  const { ref } = await registre.odoo().clients.creerOuRetrouverPartenaire(
    {
      nom: c.nomCabinet && c.type === "structure" ? c.nomCabinet : c.utilisateur.name,
      email: c.utilisateur.email,
      telephone: c.utilisateur.telephone ?? undefined,
      rpps: c.rpps ?? undefined,
      siret: c.siret ?? undefined,
      cabinet: c.nomCabinet ?? undefined,
      adresses: c.adresses.map((a) => ({ type: a.type, ligne1: a.ligne1, ligne2: a.ligne2 ?? undefined, codePostal: a.codePostal, ville: a.ville })),
    },
    `compte:${c.id}`,
  );
  await dbSite().compteClient.update({ where: { id: compteId }, data: { odooPartnerRef: ref } });
  return ref;
}

async function changerStatut(compteId: string, vers: Statut, data: object = {}) {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  exigerTransition(c.statut as Statut, vers);
  await dbSite().compteClient.update({ where: { id: compteId }, data: { statut: vers, ...data } });
  return c;
}

/** `prevenir: false` : validation à la confirmation de l'email (F16), sans email « compte validé ». */
export async function valider(compteId: string, auteur: Auteur, options: { prevenir?: boolean } = {}): Promise<void> {
  const c = await changerStatut(compteId, "valide", { valideLe: new Date(), motifRefus: null });
  await dbSite().decisionCompte.create({ data: { compteId, decision: "validation", auteurId: auteur?.id ?? null } });
  try {
    await creerFicheClient(compteId);
  } catch (e) {
    // Odoo indisponible : la validation est conservée, la fiche est rejouée par la file d'attente.
    if (!estErreurConnecteur(e)) throw e;
    await envoyerTache(FILE_FICHE_CLIENT, { compteId }, `fiche:${compteId}`);
  }
  await ouvrirDroitSiEligible(compteId);
  if (options.prevenir !== false) await notifier(c.utilisateur.email, await emailsComptes.compteValide(), "compte validé");
  await journal(auteur, "comptes.valide", compteId, { de: c.statut });
  // F16 (FR-034) : les expéditions de location attendent la vérification du numéro, pas la
  // validation du compte ; elles sont débloquées par verification-numero.ts.
}

export async function refuser(compteId: string, auteur: Exclude<Auteur, null>, motif: string): Promise<void> {
  if (motif.trim().length < 3) throw new Error("Indiquez le motif du refus.");
  const c = await changerStatut(compteId, "refuse", { motifRefus: motif.trim() });
  await dbSite().decisionCompte.create({ data: { compteId, decision: "refus", motif: motif.trim(), auteurId: auteur.id } });
  await notifier(c.utilisateur.email, await emailsComptes.compteRefuse(), "compte refusé");
  await journal(auteur, "comptes.refuse", compteId, { motif });
  // F05 (FR-045) : locations payées avant le refus, annulées et intégralement remboursées.
  const { surCompteRefuse } = await import("../location/validation");
  await surCompteRefuse(compteId, motif.trim());
}

export async function suspendre(compteId: string, auteur: Exclude<Auteur, null>, motif: string): Promise<void> {
  if (motif.trim().length < 3) throw new Error("Indiquez le motif de la suspension.");
  const c = await changerStatut(compteId, "suspendu");
  await dbSite().decisionCompte.create({ data: { compteId, decision: "suspension", motif: motif.trim(), auteurId: auteur.id } });
  await notifier(c.utilisateur.email, await emailsComptes.compteSuspendu(), "compte suspendu");
  await journal(auteur, "comptes.suspendu", compteId, { motif });
  const { surCompteSuspendu } = await import("../cloud/comptes");
  await surCompteSuspendu(compteId, { id: auteur.id, libelle: "suspension du compte" });
}

export async function retablir(compteId: string, auteur: Exclude<Auteur, null>): Promise<void> {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (c.statut !== "suspendu") throw new Error("Seul un compte suspendu peut être rétabli.");
  const u = await changerStatut(compteId, "valide");
  await dbSite().decisionCompte.create({ data: { compteId, decision: "retablissement", auteurId: auteur.id } });
  await notifier(u.utilisateur.email, await emailsComptes.compteRetabli(), "compte rétabli");
  await journal(auteur, "comptes.retabli", compteId, {});
  const { surCompteRetabli } = await import("../cloud/comptes");
  await surCompteRetabli(compteId, { id: auteur.id, libelle: "rétablissement du compte" });
}

