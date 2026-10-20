import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { PREFERENCES_PAR_DEFAUT, type PreferencesTypes } from "./decision";

// Préférences et consentements (F10, FR-009, FR-013, FR-014, FR-022 à FR-024, D8). Chaque
// changement est prouvé par une ligne `Consentement` datée avec son origine. L'abonnement à la
// newsletter reste porté par `Consentement` (comptes) et `InscriptionNewsletter` (pied de page).

export type TypePreference = keyof PreferencesTypes;
export type OrigineConsentement = "mon_compte" | "lien_email" | "desinscription_un_clic" | "equipe";

export const TEXTES_PREFERENCES: Record<TypePreference, string> = {
  reapprovisionnement: "Relances de réapprovisionnement",
  panierAbandonne: "Rappel de panier en attente",
  alerteBons: "Alerte d'expiration des bons d'achat",
  alerteDroits: "Alerte de fin des droits d'assistance",
};

const normaliser = (email: string) => email.trim().toLowerCase();

export async function lirePreferences(email: string): Promise<PreferencesTypes> {
  const p = await dbSite().preferencesEmail.findUnique({ where: { email: normaliser(email) } });
  return p ? { reapprovisionnement: p.reapprovisionnement, panierAbandonne: p.panierAbandonne, alerteBons: p.alerteBons, alerteDroits: p.alerteDroits } : { ...PREFERENCES_PAR_DEFAUT };
}

async function compteDeLAdresse(email: string): Promise<{ id: string } | null> {
  const u = await dbSite().utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { compteClient: { select: { id: true } } } });
  return u?.compteClient ?? null;
}

export async function changerPreference(emailBrut: string, type: TypePreference, actif: boolean, origine: OrigineConsentement): Promise<void> {
  const email = normaliser(emailBrut);
  const avant = await lirePreferences(email);
  if (avant[type] === actif) return;
  const compte = await compteDeLAdresse(email);
  await dbSite().$transaction([
    dbSite().preferencesEmail.upsert({
      where: { email },
      create: { email, compteId: compte?.id ?? null, ...avant, [type]: actif },
      update: { [type]: actif },
    }),
    dbSite().consentement.create({
      data: {
        compteId: compte?.id ?? null,
        email,
        objet: `email:${type}`,
        etat: actif,
        origine,
        textePresente: `${TEXTES_PREFERENCES[type]} : ${actif ? "activé" : "désactivé"}`,
      },
    }),
  ]);
}

/** Abonné confirmé à la newsletter : par son compte (dernier consentement) ou par le pied de page. */
export async function estAbonne(emailBrut: string): Promise<boolean> {
  const email = normaliser(emailBrut);
  const compte = await compteDeLAdresse(email);
  if (compte) {
    const d = await dbSite().consentement.findFirst({ where: { compteId: compte.id, objet: "newsletter" }, orderBy: { date: "desc" } });
    if (d) return d.etat;
  }
  const i = await dbSite().inscriptionNewsletter.findUnique({ where: { email } });
  return i?.etat === "confirmee";
}

/**
 * Abonnés confirmés à la newsletter (D7) : comptes dont le dernier consentement est positif, et
 * inscrits du pied de page. Les comptes suspendus, refusés ou supprimés sont exclus.
 */
export async function abonnesNewsletter(): Promise<{ email: string; compteId: string | null }[]> {
  const derniers = await dbSite().$queryRaw<{ compteId: string; etat: boolean }[]>`
    SELECT DISTINCT ON ("compteId") "compteId", etat FROM consentement
    WHERE "compteId" IS NOT NULL AND objet = 'newsletter' ORDER BY "compteId", date DESC`;
  const abonnes = derniers.filter((d) => d.etat).map((d) => d.compteId);
  const comptes = await dbSite().compteClient.findMany({
    where: { id: { in: abonnes }, statut: { notIn: ["suspendu", "refuse", "supprime"] } },
    select: { id: true, utilisateur: { select: { email: true } } },
  });
  const resultat = new Map<string, { email: string; compteId: string | null }>();
  for (const c of comptes) resultat.set(c.utilisateur.email.toLowerCase(), { email: c.utilisateur.email.toLowerCase(), compteId: c.id });
  const desabonnes = new Set(derniers.filter((d) => !d.etat).map((d) => d.compteId));
  const pied = await dbSite().inscriptionNewsletter.findMany({ where: { etat: "confirmee" }, select: { email: true } });
  for (const p of pied) {
    const email = p.email.toLowerCase();
    if (resultat.has(email)) continue;
    const compte = await compteDeLAdresse(email);
    if (compte && desabonnes.has(compte.id)) continue;
    resultat.set(email, { email, compteId: compte?.id ?? null });
  }
  return [...resultat.values()];
}

/** Désabonnement de la newsletter, quel que soit le chemin d'abonnement (compte ou pied de page). */
export async function desabonnerNewsletter(emailBrut: string, origine: OrigineConsentement, maintenant = new Date()): Promise<void> {
  const email = normaliser(emailBrut);
  const compte = await compteDeLAdresse(email);
  const inscription = await dbSite().inscriptionNewsletter.findUnique({ where: { email } });
  if (!(await estAbonne(email)) && inscription?.etat !== "confirmee") return;
  await dbSite().$transaction([
    ...(inscription?.etat === "confirmee"
      ? [dbSite().inscriptionNewsletter.update({ where: { id: inscription.id }, data: { etat: "desinscrite", desinscriteLe: maintenant } })]
      : []),
    dbSite().consentement.create({
      data: { compteId: compte?.id ?? null, email, objet: "newsletter", etat: false, origine, textePresente: "Désinscription de la newsletter" },
    }),
  ]);
  await synchroniserContact(email, { newsletter: false });
}

/** Reflet des consentements dans l'outil d'emailing (sans effet en démonstration). */
export async function synchroniserContact(email: string, consentements: Record<string, boolean>): Promise<void> {
  try {
    await registre.emailing().mettreAJourContact({ email, consentements });
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
  }
}
