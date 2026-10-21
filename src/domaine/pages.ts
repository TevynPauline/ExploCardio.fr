import { revalidatePath } from "next/cache";
import { dbSite } from "@/lib/db/site";
import { texteOrigine } from "./textes";

// Textes des pages (F13, US2, D8) : chaque texte de `contenus/<nom>.md` est la version d'origine ;
// le back-office enregistre un brouillon, le prévisualise, le publie ou revient à l'origine.
// Verrou optimiste : un enregistrement fondé sur une version périmée est refusé (D9).

export class PageRefusee extends Error {}

export const PAGES_TEXTE: Record<string, { libelle: string; chemin: string }> = {
  "qui-sommes-nous": { libelle: "Qui sommes-nous", chemin: "/qui-sommes-nous" },
  services: { libelle: "Services", chemin: "/services" },
  assistance: { libelle: "Assistance et SAV", chemin: "/services/assistance" },
  "installation-formation": { libelle: "Installation et formation", chemin: "/services/installation-formation" },
  "hebergement-donnees-sante": { libelle: "Hébergement des données de santé", chemin: "/services/hebergement-donnees-sante" },
  financement: { libelle: "Financement", chemin: "/financement" },
  "mise-a-disposition": { libelle: "Mise à disposition", chemin: "/mise-a-disposition" },
  catalogue: { libelle: "Catalogue", chemin: "/catalogue" },
  "holter-ecg": { libelle: "Holter ECG", chemin: "/holter-ecg" },
  "ecg-de-repos": { libelle: "ECG de repos", chemin: "/holter-ecg/ecg-de-repos" },
  "holter-tensionnel": { libelle: "Holter tensionnel / MAPA", chemin: "/holter-tensionnel" },
  "epreuve-effort": { libelle: "Épreuve et écho d'effort", chemin: "/epreuve-effort" },
  "accessoires-consommables": { libelle: "Accessoires et consommables", chemin: "/accessoires-consommables" },
  "mentions-legales": { libelle: "Mentions légales", chemin: "/mentions-legales" },
  cgv: { libelle: "Conditions générales de vente", chemin: "/cgv" },
  cgu: { libelle: "Conditions générales d'utilisation", chemin: "/cgu" },
  confidentialite: { libelle: "Politique de confidentialité", chemin: "/confidentialite" },
  cookies: { libelle: "Gestion des cookies", chemin: "/cookies" },
};

type Auteur = { id: string; libelle: string };

/** Rafraîchit la page publique ; sans effet hors d'une requête (tests, tâches). */
function rafraichir(nom: string) {
  try {
    revalidatePath(PAGES_TEXTE[nom]!.chemin);
  } catch {
    // Hors du contexte de Next.js.
  }
}

function verifierNom(nom: string) {
  if (!PAGES_TEXTE[nom]) throw new PageRefusee("Page inconnue.");
}

export async function etatPage(nom: string) {
  verifierNom(nom);
  const [origine, page] = await Promise.all([texteOrigine(nom), dbSite().contenu.findUnique({ where: { type_cle: { type: "page", cle: nom } } })]);
  const publie = page?.etat === "publie" ? page.corps : null;
  return { origine, publie, brouillon: page?.brouillon ?? null, enVigueur: publie ?? origine, modifieLe: page?.modifieLe ?? null, publieLe: page?.etat === "publie" ? page.publieLe : null };
}

async function journal(auteur: Auteur, action: string, nom: string) {
  await dbSite().journalAction.create({ data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet: nom, detail: {} } });
}

/** Refuse si la page a changé depuis la lecture du formulaire (D9) : qui, et quand. */
async function verifierVersion(nom: string, modifieLeLu: string | null) {
  const page = await dbSite().contenu.findUnique({ where: { type_cle: { type: "page", cle: nom } }, select: { modifieLe: true } });
  const actuelle = page?.modifieLe.toISOString() ?? "";
  if ((modifieLeLu ?? "") === actuelle) return;
  const derniere = await dbSite().journalAction.findFirst({ where: { objet: nom, action: { startsWith: "contenus.page" } }, orderBy: { date: "desc" } });
  const quand = page?.modifieLe.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  throw new PageRefusee(`Cette page a été modifiée${derniere ? ` par ${derniere.auteur}` : ""}${quand ? ` à ${quand}` : ""} depuis que vous l'avez ouverte. Votre saisie n'a pas été enregistrée : rechargez la page pour repartir de la dernière version.`);
}

export async function enregistrerBrouillon(nom: string, markdown: string, modifieLeLu: string | null, auteur: Auteur): Promise<void> {
  verifierNom(nom);
  const texte = markdown.replace(/\r\n/g, "\n").trim();
  if (!/^# \S/.test(texte)) throw new PageRefusee("La première ligne doit être le titre de la page, précédé de « # ».");
  if (texte.length > 50_000) throw new PageRefusee("Texte trop long (50 000 caractères au plus).");
  await verifierVersion(nom, modifieLeLu);
  await dbSite().contenu.upsert({
    where: { type_cle: { type: "page", cle: nom } },
    create: { type: "page", cle: nom, titre: PAGES_TEXTE[nom]!.libelle, corps: "", brouillon: texte, etat: "preparation" },
    update: { brouillon: texte },
  });
  await journal(auteur, "contenus.page.brouillon", nom);
}

export async function publierPage(nom: string, modifieLeLu: string | null, auteur: Auteur, maintenant = new Date()): Promise<void> {
  verifierNom(nom);
  await verifierVersion(nom, modifieLeLu);
  const page = await dbSite().contenu.findUnique({ where: { type_cle: { type: "page", cle: nom } } });
  if (!page?.brouillon) throw new PageRefusee("Aucun brouillon à publier.");
  await dbSite().contenu.update({ where: { id: page.id }, data: { corps: page.brouillon, brouillon: null, etat: "publie", publieLe: maintenant } });
  await journal(auteur, "contenus.page.publiee", nom);
  rafraichir(nom);
}

export async function revenirOrigine(nom: string, auteur: Auteur): Promise<void> {
  verifierNom(nom);
  await dbSite().contenu.deleteMany({ where: { type: "page", cle: nom } });
  await journal(auteur, "contenus.page.origine", nom);
  rafraichir(nom);
}
