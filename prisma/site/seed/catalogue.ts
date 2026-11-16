import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@generated/site/client";
import { slugArticle } from "@/domaine/slugs";
import { MODELES } from "../../demo/seed/catalogue";

// Contenus de départ du catalogue (F03, T007, D2) : chaque article de la base fictive reçoit
// une adresse lisible (D3), une description courte provisoire tirée d'Odoo et l'emplacement
// photo de la charte, puis est publié pour que la démonstration ne soit pas vide.
// L'administrateur les remplace ensuite ; un contenu existant n'est jamais écrasé.

/** Articles jamais vendus : le tensiomètre est offert (F02, offre de bienvenue). */
const NON_PUBLIES = new Set(["EC-BIENVENUE-TENSIOMETRE"]);

/** Contenu du pack de mise à disposition par défaut (FR-014). */
const PACK_MAD = "Enregistreur, accès au logiciel Cloud et formation à la prise en main.";

/**
 * Deux fiches complètes pour la démonstration (onglets d'information, documents) : textes
 * PROVISOIRES, à remplacer par ceux d'ExploCardio.fr et des fabricants.
 */
const FICHES_COMPLETES: Record<string, { textes: Record<string, unknown>; documents: boolean }> = {
  "EC-SUN-OSCAR2": {
    textes: {
      caracteristiques: [
        { libelle: "Mesure", valeur: "Oscillométrique, validée selon les protocoles internationaux (texte provisoire)" },
        { libelle: "Durée d'enregistrement", valeur: "Jusqu'à 48 heures" },
        { libelle: "Alimentation", valeur: "2 piles AA" },
        { libelle: "Transfert", valeur: "Câble USB" },
      ],
      contenuCoffret: "Enregistreur Oscar 2, brassard Orbit adulte, pochette et ceinture, câble USB, guide de démarrage.",
      logicielAssocie: "Analyse et compte rendu sur la plateforme Cloud : vous retrouvez vos enregistrements depuis n'importe quel poste du cabinet.",
      garantie: "Garantie constructeur de 2 ans, pièces et main-d'œuvre. Extension de garantie disponible.",
    },
    documents: true,
  },
  "EC-DMS-3002E": {
    textes: {
      caracteristiques: [
        { libelle: "Dérivations", valeur: "3 voies (texte provisoire)" },
        { libelle: "Durée d'enregistrement", valeur: "Jusqu'à 7 jours" },
      ],
      contenuCoffret: "Enregistreur, câble patient, carte mémoire, pochette, guide de démarrage.",
      garantie: "Garantie constructeur de 2 ans.",
    },
    documents: true,
  },
};

/** Notice de démonstration (document fictif), fichier statique du site : public/demonstration/. */
const NOTICE_DEMO = "/demonstration/notice-demonstration.pdf";

async function notice(): Promise<{ chemin: string; octets: number }> {
  const { size } = await stat(join(process.cwd(), "public", NOTICE_DEMO));
  return { chemin: NOTICE_DEMO, octets: size };
}

export async function remplirContenusCatalogue(db: PrismaClient) {
  const ordres = new Map<string, number>();
  for (const m of MODELES) {
    const defaultCode = m.variantes[0]!.defaultCode;
    const ordre = (ordres.get(m.categorie) ?? 0) + 1;
    ordres.set(m.categorie, ordre);
    if (await db.contenuProduit.findUnique({ where: { defaultCode } })) continue;
    const publie = !NON_PUBLIES.has(defaultCode);
    const complete = FICHES_COMPLETES[defaultCode];
    const documents = complete?.documents ? [{ ...(await notice()), titre: `Notice ${m.nom} (démonstration)`, type: "notice" }] : [];
    await db.contenuProduit.create({
      data: {
        defaultCode,
        slug: slugArticle(m.marque, m.nom),
        textes: {
          descriptionCourte: m.description,
          ...(m.formules.includes("mise_a_disposition") ? { contenuPackMad: PACK_MAD } : {}),
          ...(complete?.textes ?? {}),
        },
        documents,
        compatibilites: [],
        produitsAssocies: [],
        ordre,
        etat: publie ? "publie" : "preparation",
        publieLe: publie ? new Date() : null,
      },
    });
  }
}
