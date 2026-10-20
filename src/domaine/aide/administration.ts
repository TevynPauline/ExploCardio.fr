import { randomUUID } from "node:crypto";
import { dbSite } from "@/lib/db/site";
import { deposerDocument, deposerImage, deposerSousTitres, deposerVideo } from "@/lib/stockage";
import type { ContenuAide, ThemeAide, TypeContenuAide } from "@generated/site/client";
import { journaliser, SaisieRefusee } from "../admin-contenus";
import { invaliderIndexRecherche } from "../recherche";
import { versSlug } from "../slugs";
import { etapesDe, THEMES, TYPES, type Etape } from "./lecture";

// Contenus du centre d'aide gérés au back-office (F09, US4, FR-013, FR-015, FR-016) : saisie,
// téléversements (vidéo, sous-titres, PDF, images des étapes), publication contrôlée, journal.

type Auteur = { id: string; libelle: string };
export const ETAPES_MAX = 10;

export type SaisieAide = {
  type: string;
  titre: string;
  resume: string;
  theme: string;
  references: string;
  transcription: string;
  reponse: string;
  etapes: { texte: string; texteRemplacement: string; image: File | null; imageActuelle: string | null }[];
  video: File | null;
  sousTitres: File | null;
  document: File | null;
};

const fichier = (f: File | null) => (f && f.size > 0 ? f : null);

function texte(valeur: string, libelle: string, max: number, obligatoire = true): string | null {
  const v = valeur.trim();
  if (!v && obligatoire) throw new SaisieRefusee(`${libelle} : champ obligatoire.`);
  if (v.length > max) throw new SaisieRefusee(`${libelle} : ${max} caractères au plus.`);
  return v || null;
}

async function slugLibre(titre: string, id: string | null): Promise<string> {
  const base = versSlug(titre).slice(0, 100) || "aide";
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const existant = await dbSite().contenuAide.findUnique({ where: { slug } });
    if (!existant || existant.id === id) return slug;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/** Crée ou modifie un contenu (il reste dans son état ; la publication est une action à part). */
export async function enregistrerContenuAide(id: string | null, s: SaisieAide, auteur: Auteur): Promise<ContenuAide> {
  if (!(s.type in TYPES)) throw new SaisieRefusee("Type : choisissez un type de contenu.");
  if (!(s.theme in THEMES)) throw new SaisieRefusee("Thème : choisissez un thème.");
  const titre = texte(s.titre, "Titre", 120)!;
  const resume = texte(s.resume, "Résumé", 300)!;
  const references = [...new Set(s.references.split(/[\s,;]+/).map((r) => r.trim().toUpperCase()).filter(Boolean))].slice(0, 30);
  if (references.some((r) => !/^[A-Z0-9-]{2,64}$/.test(r))) throw new SaisieRefusee("Références : codes d'articles d'Odoo séparés par des virgules (ex. EC-DMS-3004L).");
  const avant = id ? await dbSite().contenuAide.findUniqueOrThrow({ where: { id } }) : null;
  const type = s.type as TypeContenuAide;

  // Étapes (mode d'emploi) : texte, image et texte de remplacement.
  const etapes: Etape[] = [];
  for (const [i, e] of s.etapes.slice(0, ETAPES_MAX).entries()) {
    const t = e.texte.trim();
    if (!t) continue;
    if (t.length > 1000) throw new SaisieRefusee(`Étape ${i + 1} : 1 000 caractères au plus.`);
    const image = fichier(e.image) ? await deposerImage(e.image!, "aide") : e.imageActuelle;
    const alt = e.texteRemplacement.trim();
    if (image && !alt) throw new SaisieRefusee(`Étape ${i + 1} : décrivez l'image (texte de remplacement).`);
    etapes.push({ texte: t, image, texteRemplacement: alt.slice(0, 200) });
  }

  const data = {
    type,
    titre,
    resume,
    theme: s.theme as ThemeAide,
    references,
    transcription: texte(s.transcription, "Transcription", 20_000, false),
    reponse: texte(s.reponse, "Réponse", 5_000, false),
    etapes,
    video: fichier(s.video) ? await deposerVideo(s.video!) : (avant?.video ?? null),
    sousTitres: fichier(s.sousTitres) ? await deposerSousTitres(s.sousTitres!) : (avant?.sousTitres ?? null),
    document: fichier(s.document) ? (await deposerDocument(s.document!)).chemin : (avant?.document ?? null),
    slug: await slugLibre(titre, id),
  };
  // Un contenu déjà publié doit rester complet après modification (vérifié avant d'enregistrer).
  if (avant?.etat === "publie") verifierPubliable(data);
  const c = id ? await dbSite().contenuAide.update({ where: { id }, data }) : await dbSite().contenuAide.create({ data });
  await journaliser(auteur, id ? "aide.modifie" : "aide.cree", c.id, avant ? { titre: avant.titre, etat: avant.etat } : null, { titre: c.titre, type: c.type });
  if (c.etat === "publie") invaliderIndexRecherche();
  return c;
}

/** Règles de publication : chaque type doit être complet ; une vidéo a sous-titres et transcription (FR-015). */
export function verifierPubliable(c: Pick<ContenuAide, "type" | "video" | "sousTitres" | "transcription" | "etapes" | "document" | "reponse">) {
  if (c.type === "video" && (!c.video || !c.sousTitres || !c.transcription)) {
    throw new SaisieRefusee("Publication refusée : une vidéo doit avoir son fichier, ses sous-titres (WebVTT) et sa transcription.");
  }
  if (c.type === "mode_emploi") {
    const etapes = etapesDe(c);
    if (!etapes.length) throw new SaisieRefusee("Publication refusée : ajoutez au moins une étape.");
    if (etapes.some((e) => !e.image)) throw new SaisieRefusee("Publication refusée : chaque étape doit avoir son image.");
  }
  if (c.type === "notice" && !c.document) throw new SaisieRefusee("Publication refusée : ajoutez le document PDF.");
  if (c.type === "faq" && !c.reponse) throw new SaisieRefusee("Publication refusée : rédigez la réponse.");
}

export async function publierContenuAide(id: string, auteur: Auteur) {
  const c = await dbSite().contenuAide.findUniqueOrThrow({ where: { id } });
  verifierPubliable(c);
  await dbSite().contenuAide.update({ where: { id }, data: { etat: "publie", publieLe: c.publieLe ?? new Date() } });
  await journaliser(auteur, "aide.publie", id, { etat: c.etat }, { etat: "publie" });
  invaliderIndexRecherche();
}

export async function retirerContenuAide(id: string, auteur: Auteur) {
  const c = await dbSite().contenuAide.findUniqueOrThrow({ where: { id } });
  await dbSite().contenuAide.update({ where: { id }, data: { etat: "preparation" } });
  await journaliser(auteur, "aide.retire", id, { etat: c.etat }, { etat: "preparation" });
  invaliderIndexRecherche();
}
