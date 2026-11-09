import { unstable_cache } from "next/cache";
import { enApercu } from "@/lib/apercu";
import { ETIQUETTES } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { textesAnimation, type TextesAnimation } from "./textes-animation";
import { verifierLien } from "./liens";

// Vignettes du carrousel de l'accueil (F16, US2, US3) : contenus réels du site, gérés au
// back-office (Contenus → Carrousel). Une vignette s'affiche si elle est publiée et dans sa
// période ; celle de l'offre de bienvenue suit l'activation de l'offre ; son bouton est omis si
// la page liée n'existe plus.

export const CLE_OFFRE_BIENVENUE = "offre-bienvenue";

export type Vignette = {
  id: string;
  titre: string;
  phrase: string;
  lien: string | null;
  libelleLien: string | null;
  image: { url: string; texteRemplacement: string } | null;
  fond: string | null;
};

type Visibilite = { etat: string; debut: Date | null; fin: Date | null; cle: string | null };

export function vignetteVisible(v: Visibilite, maintenant: Date, bienvenueActive: boolean): boolean {
  if (v.etat !== "publie") return false;
  if (v.debut && v.debut > maintenant) return false;
  if (v.fin && v.fin < maintenant) return false;
  if (v.cle === CLE_OFFRE_BIENVENUE && !bienvenueActive) return false;
  return true;
}

/** Page du site, fiche produit publiée ou adresse https:// : le bouton peut être affiché. */
export function lienDisponible(lien: string | null, fiches: ReadonlySet<string>): boolean {
  if (!lien) return false;
  if (verifierLien(lien).ok) return true;
  const chemin = lien.split(/[?#]/)[0]!.replace(/\/$/, "");
  return lien.startsWith("/") && !lien.startsWith("//") && fiches.has(chemin);
}

/** Chemins des fiches publiées ; vide si le catalogue est momentanément injoignable. */
export async function cheminsFichesPubliees(): Promise<Set<string>> {
  try {
    const { cheminsDesFiches } = await import("./catalogue/lecture");
    return new Set((await cheminsDesFiches()).values());
  } catch {
    return new Set();
  }
}

type Ligne = Awaited<ReturnType<typeof lireLignes>>[number];

async function lireLignes(etats: ("publie" | "preparation")[]) {
  return dbSite().contenu.findMany({ where: { type: "vignette", etat: { in: etats } }, orderBy: [{ ordre: "asc" }, { creeLe: "asc" }] });
}

const lireLignesPubliees = unstable_cache(
  async () =>
    (await lireLignes(["publie"])).map((l) => ({ ...l, debut: l.debut?.toISOString() ?? null, fin: l.fin?.toISOString() ?? null })),
  ["contenus:vignettes"],
  { tags: [ETIQUETTES.contenus], revalidate: 300 },
);

function enVignette(l: Pick<Ligne, "id" | "titre" | "corps" | "lien" | "libelleLien" | "images" | "fond">, fiches: ReadonlySet<string>): Vignette {
  const image = ((l.images as { url: string; texteRemplacement: string }[] | null) ?? [])[0] ?? null;
  const lien = lienDisponible(l.lien, fiches) ? l.lien : null;
  return { id: l.id, titre: l.titre, phrase: l.corps, lien, libelleLien: lien ? l.libelleLien : null, image, fond: l.fond };
}

/** Vignettes à afficher maintenant ; en aperçu de l'équipe (F13), avec celles en préparation, sans dates. */
export async function lireVignettes(maintenant = new Date()): Promise<Vignette[]> {
  const [fiches, bienvenue] = await Promise.all([cheminsFichesPubliees(), lireParametre("bienvenue.active")]);
  const bienvenueActive = bienvenue !== "false";
  if (await enApercu()) {
    return (await lireLignes(["publie", "preparation"]))
      .filter((l) => l.cle !== CLE_OFFRE_BIENVENUE || bienvenueActive)
      .map((l) => enVignette(l, fiches));
  }
  return (await lireLignesPubliees())
    .filter((l) => vignetteVisible({ etat: l.etat, debut: l.debut ? new Date(l.debut) : null, fin: l.fin ? new Date(l.fin) : null, cle: l.cle }, maintenant, bienvenueActive))
    .map((l) => enVignette(l, fiches));
}

// Animation « Les trois temps » de l'accueil (F20, FR-017, FR-018) : phrase d'accroche et trois
// mots, contenus réels modifiables au back-office (Contenus → Accueil). Un texte manquant ou vide
// reprend sa valeur de départ.

export { ARGUMENTS_ANIMATION, LONGUEURS_ANIMATION, TEXTES_ANIMATION_DEFAUT, textesAnimation, type CinqArguments, type TextesAnimation } from "./textes-animation";

export const lireAnimation = unstable_cache(
  async (): Promise<TextesAnimation> => textesAnimation(await dbSite().contenu.findMany({ where: { type: "argument" } })),
  ["contenus:animation"],
  { tags: [ETIQUETTES.contenus], revalidate: 300 },
);
