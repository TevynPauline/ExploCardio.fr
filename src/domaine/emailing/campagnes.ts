import type { Campagne, Envoi, TypeCampagne } from "@generated/site/client";
import { urlDuSite } from "@/emails/charte";
import { emailsEmailing } from "@/emails/modeles-emailing";
import type { EmailRendu } from "@/emails/rendu";
import { dbSite } from "@/lib/db/site";
import { prochainCreneau } from "./decision";
import { demanderEnvoi, lireReglesEnvoi } from "./envoi";
import { piedPreferences } from "./liens";
import { abonnesNewsletter } from "./preferences";

// Campagnes commerciales (F10, US3, D7, FR-011, FR-013) : promotion, vente flash ou nouveauté,
// préparées et lancées par l'administrateur, réservées aux abonnés confirmés à la newsletter.
// Un email de test est exigé avant de programmer. Chaque destinataire a son envoi, réévalué au
// moment de partir : une désinscription entre-temps l'annule.

export class CampagneRefusee extends Error {}

export type SaisieCampagne = { type: TypeCampagne; objet: string; titre: string; texte: string; lien: string | null; libelleLien: string | null };

export const TYPES_CAMPAGNE: Record<TypeCampagne, string> = { promotion: "Promotion", vente_flash: "Vente flash", nouveaute: "Nouveauté" };

type Auteur = { id: string; libelle: string; email: string };

function valider(s: SaisieCampagne): SaisieCampagne {
  const objet = s.objet.trim();
  const titre = s.titre.trim();
  const texte = s.texte.trim();
  if (!(s.type in TYPES_CAMPAGNE)) throw new CampagneRefusee("Type de campagne inconnu.");
  if (!objet || objet.length > 120) throw new CampagneRefusee("Objet : obligatoire, 120 caractères au plus.");
  if (!titre || titre.length > 120) throw new CampagneRefusee("Titre : obligatoire, 120 caractères au plus.");
  if (texte.length < 20 || texte.length > 4000) throw new CampagneRefusee("Texte : entre 20 et 4 000 caractères.");
  let lien = s.lien?.trim() || null;
  if (lien) {
    // Liens vers le site uniquement (pas de redirection vers un site tiers).
    if (lien.startsWith("/")) lien = urlDuSite(lien);
    if (!lien.startsWith(urlDuSite("/"))) throw new CampagneRefusee("Lien : une page du site (exemple : /accessoires-consommables).");
  }
  return { type: s.type, objet, titre, texte, lien, libelleLien: s.libelleLien?.trim().slice(0, 60) || null };
}

async function journal(auteur: Auteur, action: string, objet: string, detail: Record<string, unknown> = {}) {
  await dbSite().journalAction.create({ data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

export async function creerCampagne(saisie: SaisieCampagne, auteur: Auteur): Promise<Campagne> {
  const c = await dbSite().campagne.create({ data: { ...valider(saisie), creePar: auteur.libelle } });
  await journal(auteur, "emailing.campagne_creee", c.id, { objet: c.objet });
  return c;
}

export async function modifierCampagne(id: string, saisie: SaisieCampagne, auteur: Auteur): Promise<void> {
  const c = await dbSite().campagne.findUniqueOrThrow({ where: { id } });
  if (c.etat !== "brouillon") throw new CampagneRefusee("Seule une campagne en brouillon peut être modifiée.");
  // Toute modification exige un nouvel email de test.
  await dbSite().campagne.update({ where: { id }, data: { ...valider(saisie), testEnvoyeLe: null } });
  await journal(auteur, "emailing.campagne_modifiee", id);
}

function rendu(c: Campagne, destinataire: string): Promise<EmailRendu> {
  return emailsEmailing.campagne({ objet: c.objet, titre: c.titre, texte: c.texte, lien: c.lien, libelleLien: c.libelleLien, pied: piedPreferences(destinataire, "campagne") });
}

/** Email de test à l'adresse de l'administrateur (boîte de démonstration en phase 1). */
export async function envoyerTestCampagne(id: string, auteur: Auteur, maintenant = new Date()): Promise<void> {
  const c = await dbSite().campagne.findUniqueOrThrow({ where: { id } });
  await demanderEnvoi(
    { modele: "campagne", destinataire: auteur.email, rendu: await rendu(c, auteur.email), cle: `campagne-test:${id}:${maintenant.getTime()}`, declencheur: "email de test d'une campagne", test: true },
    maintenant,
  );
  await dbSite().campagne.update({ where: { id }, data: { testEnvoyeLe: maintenant } });
  await journal(auteur, "emailing.campagne_testee", id);
}

/** Programme l'envoi : une ligne d'envoi par abonné, à la date ramenée dans les plages autorisées. */
export async function programmerCampagne(id: string, date: Date | null, auteur: Auteur, maintenant = new Date()): Promise<{ destinataires: number }> {
  const c = await dbSite().campagne.findUniqueOrThrow({ where: { id } });
  if (c.etat !== "brouillon") throw new CampagneRefusee("Cette campagne a déjà été programmée.");
  if (!c.testEnvoyeLe) throw new CampagneRefusee("Envoyez-vous d'abord un email de test.");
  const quand = prochainCreneau(date && date > maintenant ? date : maintenant, await lireReglesEnvoi());
  const abonnes = await abonnesNewsletter();
  await dbSite().campagne.update({ where: { id }, data: { etat: "programmee", programmeePour: quand, destinataires: abonnes.length } });
  for (const a of abonnes) {
    await demanderEnvoi(
      {
        modele: "campagne",
        destinataire: a.email,
        compteId: a.compteId ?? undefined,
        variables: { campagneId: id },
        campagneId: id,
        cle: `campagne:${id}:${a.email}`,
        declencheur: `campagne « ${c.objet} »`,
        programmeLe: quand,
      },
      maintenant,
    );
  }
  await journal(auteur, "emailing.campagne_programmee", id, { quand, destinataires: abonnes.length });
  return { destinataires: abonnes.length };
}

export async function annulerCampagne(id: string, auteur: Auteur): Promise<void> {
  const c = await dbSite().campagne.findUniqueOrThrow({ where: { id } });
  if (!["brouillon", "programmee", "en_cours"].includes(c.etat)) throw new CampagneRefusee("Cette campagne ne peut plus être annulée.");
  await dbSite().$transaction([
    dbSite().campagne.update({ where: { id }, data: { etat: "annulee" } }),
    dbSite().envoi.updateMany({ where: { campagneId: id, etat: "programme" }, data: { etat: "annule", motif: "campagne annulée" } }),
  ]);
  await journal(auteur, "emailing.campagne_annulee", id);
}

/** Après chaque relève : une campagne dont tous les envois sont partis ou annulés est envoyée. */
export async function mettreAJourCampagnes(): Promise<void> {
  const enCours = await dbSite().campagne.findMany({ where: { etat: { in: ["programmee", "en_cours"] } }, select: { id: true, etat: true } });
  for (const c of enCours) {
    const [restants, partis] = await Promise.all([
      dbSite().envoi.count({ where: { campagneId: c.id, etat: "programme" } }),
      dbSite().envoi.count({ where: { campagneId: c.id, etat: { in: ["envoye", "remis", "rejete"] } } }),
    ]);
    const etat = restants === 0 ? "envoyee" : partis > 0 ? "en_cours" : c.etat;
    if (etat !== c.etat) await dbSite().campagne.update({ where: { id: c.id }, data: { etat } });
  }
}

// Rendu et validité au moment de l'envoi (rendus.ts).
const campagneDe = async (envoi: Envoi) => (envoi.campagneId ? dbSite().campagne.findUnique({ where: { id: envoi.campagneId } }) : null);

export async function objetValide(envoi: Envoi): Promise<boolean> {
  const c = await campagneDe(envoi);
  return Boolean(c && c.etat !== "annulee");
}

export async function rendre(envoi: Envoi): Promise<EmailRendu> {
  const c = await campagneDe(envoi);
  if (!c) throw new Error("Campagne introuvable.");
  return rendu(c, envoi.destinataire);
}
