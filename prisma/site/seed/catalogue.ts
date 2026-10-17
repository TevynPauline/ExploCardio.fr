import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { PrismaClient } from "@generated/site/client";
import { slugArticle, versSlug } from "@/domaine/slugs";
import { MODELES } from "../../demo/seed/catalogue";

// Contenus de départ du catalogue (F03, T007, D2) : chaque article de la base fictive reçoit
// une adresse lisible (D3), une description courte provisoire tirée d'Odoo et l'emplacement
// photo de la charte, puis est publié pour que la démonstration ne soit pas vide.
// L'administrateur les remplace ensuite ; un contenu existant n'est jamais écrasé.

/** Articles jamais vendus : le tensiomètre est offert (F02, offre de bienvenue). */
const NON_PUBLIES = new Set(["EC-BIENVENUE-TENSIOMETRE"]);

/** Contenu du pack de mise à disposition par défaut (FR-014). */
const PACK_MAD = "Enregistreur, accès au logiciel Cloud et formation à la prise en main.";

export const SOUS_CATEGORIES: Record<string, { libelle: string; slug: string; articles: string[] }[]> = {
  "holter-ecg": [
    { libelle: "Enregistreurs", slug: "enregistreurs", articles: ["DMS 300-2e", "DMS 300-3A", "DMS 300-4L", "DMS 300-2W"] },
    { libelle: "Logiciels Cloud", slug: "logiciels-cloud", articles: ["CardioScan Holter ECG (logiciel Cloud)", "CardioVision / Cardiac Rehab (logiciel Cloud)"] },
  ],
  effort: [
    { libelle: "Systèmes d'épreuve d'effort", slug: "systemes", articles: ["CardioScan Stress Test 12 dérivations", "ECG d'effort Norav (modèle à préciser)", "Tango M2"] },
    { libelle: "Ergocycles et tapis", slug: "ergocycles-et-tapis", articles: ["ULTRA KOCH EXERCISE", "KORELE 8000", "KORELE 7000", "Banc de Koch PURE", "Ergocycle Ergoline (modèle à préciser)", "Matériel d'effort RAM (modèle à préciser)"] },
    { libelle: "Environnement", slug: "environnement", articles: ["Chariot d'épreuve d'effort", "Défibrillateur automatisé externe"] },
  ],
  accessoires: [
    { libelle: "Électrodes", slug: "electrodes", articles: ["Électrodes Holter", "Poires et pinces ECG", "Kit consommables Holter (mise à disposition)"] },
    { libelle: "Brassards", slug: "brassards", articles: ["Brassard MAPA Orbit", "Brassard MAPA 12-19 cm"] },
    { libelle: "Sacoches et pochettes", slug: "sacoches", articles: ["Pochette Oscar 2", "Ceinture Oscar 2", "Bandoulière Oscar 2", "Pochette d'enregistreur"] },
    { libelle: "Câbles et alimentation", slug: "cables-et-alimentation", articles: ["Batterie rechargeable DMS 300-2W", "Chargeur pour batteries DMS 300-2W", "Câble patient Holter ECG", "Câble de transfert USB HDMI", "Câble patient ECG d'effort", "Câble patient ECG fiche banane", "Carte SD"] },
    { libelle: "Garanties", slug: "garanties", articles: ["Extension de garantie Oscar 2"] },
  ],
};

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

/** Petit PDF de démonstration (document fictif) déposé dans le stockage. */
async function notice(nom: string): Promise<{ chemin: string; octets: number }> {
  const texte = `Notice de demonstration - ${nom} - document fictif`;
  const flux = `BT /F1 14 Tf 72 720 Td (${texte}) Tj ET`;
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const dossier = join(resolve(process.env.STORAGE_DIR || "./stockage"), "documents");
  await mkdir(dossier, { recursive: true });
  const fichier = `notice-demonstration-${versSlug(nom)}.pdf`;
  await writeFile(join(dossier, fichier), pdf, "latin1");
  return { chemin: `/stockage/documents/${fichier}`, octets: Buffer.byteLength(pdf, "latin1") };
}

export async function remplirContenusCatalogue(db: PrismaClient) {
  const sousCategories = new Map<string, string>();
  for (const [categorie, liste] of Object.entries(SOUS_CATEGORIES)) {
    for (const [i, sc] of liste.entries()) {
      const ligne = await db.sousCategorie.upsert({
        where: { categorie_slug: { categorie, slug: sc.slug } },
        create: { categorie, libelle: sc.libelle, slug: sc.slug, ordre: i + 1 },
        update: {},
      });
      for (const nom of sc.articles) sousCategories.set(`${categorie}|${nom}`, ligne.id);
    }
  }
  const ordres = new Map<string, number>();
  for (const m of MODELES) {
    const defaultCode = m.variantes[0]!.defaultCode;
    const ordre = (ordres.get(m.categorie) ?? 0) + 1;
    ordres.set(m.categorie, ordre);
    if (await db.contenuProduit.findUnique({ where: { defaultCode } })) continue;
    const publie = !NON_PUBLIES.has(defaultCode);
    const complete = FICHES_COMPLETES[defaultCode];
    const documents = complete?.documents ? [{ ...(await notice(m.nom)), titre: `Notice ${m.nom} (démonstration)`, type: "notice" }] : [];
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
        sousCategorieId: sousCategories.get(`${m.categorie}|${m.nom}`) ?? null,
        ordre,
        etat: publie ? "publie" : "preparation",
        publieLe: publie ? new Date() : null,
      },
    });
  }
}
