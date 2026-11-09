import { unstable_cache } from "next/cache";
import { enApercu } from "@/lib/apercu";
import { dbSite } from "@/lib/db/site";
import { ETIQUETTES } from "@/lib/cache";
import { MOTIF_HORS_METROPOLE } from "./comptes/adresses";
import { CLE_ORGANISATION, normaliserOrganisation, type PlaceBloc } from "./organisation-accueil";
import { CLES_RAISONS, textesRaisons, type Raison } from "./textes-raisons";

// Lecture des contenus éditoriaux publiés (F01, T007). Mis en cache avec l'étiquette
// « contenus », invalidée à chaque enregistrement du mini back-office (SC-003 : < 1 minute).

export type MessageBandeau = { id: string; texte: string; lien: string | null };
export type Tuile = {
  id: string;
  titre: string;
  phrase: string;
  lien: string;
  badge: string | null;
  fond: string | null;
  /** F16 : image facultative, fondue au-dessus du texte. */
  image: { url: string; texteRemplacement: string } | null;
};
export type MarqueAffichee = { id: string; nom: string; logo: string | null; familles: string[] };

type ContenuBandeau = { etat: string; debut: Date | null; fin: Date | null };

/** Un message du bandeau est visible s'il est publié et dans sa période (FR-002). */
export function messageVisible(m: ContenuBandeau, maintenant = new Date()): boolean {
  if (m.etat !== "publie") return false;
  if (m.debut && m.debut > maintenant) return false;
  if (m.fin && m.fin < maintenant) return false;
  return true;
}

const enCache = <T>(cle: string, lecture: () => Promise<T>) =>
  unstable_cache(lecture, [`contenus:${cle}`], { tags: [ETIQUETTES.contenus], revalidate: 300 });

const lireBandeauPublie = enCache("bandeau", async () => {
  const messages = await dbSite().contenu.findMany({
    where: { type: "bandeau", etat: "publie" },
    orderBy: { ordre: "asc" },
  });
  return messages.map((m) => ({
    id: m.id,
    texte: m.corps,
    lien: m.lien,
    debut: m.debut?.toISOString() ?? null,
    fin: m.fin?.toISOString() ?? null,
  }));
});

/** Messages du bandeau visibles maintenant : les dates sont vérifiées à chaque affichage. */
export async function lireBandeau(maintenant = new Date()): Promise<MessageBandeau[]> {
  // Aperçu de l'équipe (F13, D7) : messages publiés et en préparation, sans cache ni dates.
  if (await enApercu()) {
    const messages = await dbSite().contenu.findMany({ where: { type: "bandeau", etat: { in: ["publie", "preparation"] } }, orderBy: { ordre: "asc" } });
    return messages.map((m) => ({ id: m.id, texte: m.corps, lien: m.lien }));
  }
  return (await lireBandeauPublie())
    .filter((m) =>
      messageVisible({ etat: "publie", debut: m.debut ? new Date(m.debut) : null, fin: m.fin ? new Date(m.fin) : null }, maintenant),
    )
    .map(({ id, texte, lien }) => ({ id, texte, lien }));
}

/** Organisation des blocs de l'accueil (F23, D1), lue avec tolérance (repli sur l'ordre de départ). */
export const lireOrganisation = enCache("organisation", async (): Promise<PlaceBloc[]> => {
  const p = await dbSite().parametre.findUnique({ where: { cle: CLE_ORGANISATION } });
  return normaliserOrganisation(p?.valeur);
});

/** Textes des six cartes « Pourquoi choisir ExploCardio.fr ? » (F23, D8). */
export const lireRaisons = enCache("raisons", async (): Promise<Raison[]> => {
  const lignes = await dbSite().contenu.findMany({ where: { type: "argument", cle: { in: [...CLES_RAISONS] } } });
  return textesRaisons(lignes);
});

/** Gammes phares (F23, FR-006) : trois cartes, autrefois six tuiles d'accès rapide. */
export const lireTuiles = enCache("tuiles", async (): Promise<Tuile[]> => {
  const tuiles = await dbSite().contenu.findMany({ where: { type: "tuile" }, orderBy: { ordre: "asc" }, take: 3 });
  return tuiles.map((t) => ({
    id: t.id,
    titre: t.titre,
    phrase: t.corps,
    lien: t.lien ?? "/",
    badge: t.badge,
    fond: t.fond,
    image: ((t.images as { url: string; texteRemplacement: string }[] | null) ?? [])[0] ?? null,
  }));
});

export const lireMarques = enCache("marques", async (): Promise<MarqueAffichee[]> => {
  const marques = await dbSite().marque.findMany({ where: { visible: true }, orderBy: { ordre: "asc" } });
  return marques.map((m) => ({ id: m.id, nom: m.nom, logo: m.logo, familles: m.familles }));
});

const CLES_PARAMETRES = [
  "contact.email",
  "contact.telephone",
  "contact.adresse",
  "contact.motifs",
  "contact.whatsapp",
  "accueil.offre_bienvenue",
  "accueil.badge_hebergement",
  "accueil.badge_logiciel_cloud",
] as const;

export type ParametresPublics = {
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  motifs: string[];
  offreBienvenue: string;
  badgeHebergement: string | null;
  /** F23 (FR-013) : badge de l'élément « Logiciel Cloud » de l'offre digitale. */
  badgeLogicielCloud: string | null;
};

/** F16 (FR-029) : le motif « Commande hors métropole » est toujours proposé, avant « Autre ». */
function avecMotifHorsMetropole(motifs: string[]): string[] {
  if (motifs.includes(MOTIF_HORS_METROPOLE)) return motifs;
  const autre = motifs.indexOf("Autre");
  return autre < 0 ? [...motifs, MOTIF_HORS_METROPOLE] : [...motifs.slice(0, autre), MOTIF_HORS_METROPOLE, ...motifs.slice(autre)];
}

export const lireParametresPublics = enCache("parametres", async (): Promise<ParametresPublics> => {
  const lignes = await dbSite().parametre.findMany({ where: { cle: { in: [...CLES_PARAMETRES] } } });
  const v = (cle: (typeof CLES_PARAMETRES)[number]) => lignes.find((l) => l.cle === cle)?.valeur.trim() || null;
  let motifs: string[] = [];
  try {
    motifs = JSON.parse(v("contact.motifs") ?? "[]") as string[];
  } catch {
    motifs = [];
  }
  return {
    email: v("contact.email"),
    telephone: v("contact.telephone"),
    adresse: v("contact.adresse"),
    motifs: avecMotifHorsMetropole(motifs.length ? motifs : ["Autre"]),
    offreBienvenue: v("accueil.offre_bienvenue") ?? "",
    badgeHebergement: v("accueil.badge_hebergement"),
    badgeLogicielCloud: v("accueil.badge_logiciel_cloud"),
  };
});
