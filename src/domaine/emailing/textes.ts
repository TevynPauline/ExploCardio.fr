import { Prisma } from "@generated/site/client";
import { EXEMPLES } from "@/emails/exemples";
import type { EmailRendu } from "@/emails/rendu";
import { avecTextes, fusionner, variablesDe, variablesDesTextes, type TextesModele } from "@/emails/textes";
import { TEXTES_PAR_DEFAUT } from "@/emails/textes-par-defaut";
import { dbSite } from "@/lib/db/site";
import { demanderEnvoi } from "./envoi";

// Textes des modèles d'emails au back-office (F10, US8, FR-026, SC-009, D2) : brouillon, aperçu
// avec des données d'exemple, email de test, publication, retour au texte d'origine. Chaque
// publication est journalisée. La mise en page, les tableaux et les boutons restent fixes.

export class TexteRefuse extends Error {}

type Auteur = { id: string; libelle: string; email: string };

export type EtatModele = { defaut: TextesModele; publie: TextesModele | null; brouillon: TextesModele | null; publieLe: Date | null; publiePar: string | null };

export function textesParDefaut(code: string): TextesModele {
  const d = TEXTES_PAR_DEFAUT[code];
  if (!d) throw new TexteRefuse("Ce modèle n'a pas de textes modifiables.");
  return d;
}

/** Contrôle d'un texte avant enregistrement ou publication. */
export function validerTextes(code: string, saisie: TextesModele): TextesModele {
  const defaut = textesParDefaut(code);
  const t = fusionner(defaut, saisie);
  if (!t.objet || t.objet.length > 120) throw new TexteRefuse("Objet : obligatoire, 120 caractères au plus.");
  if (t.apercu.length > 150) throw new TexteRefuse("Texte d'aperçu : 150 caractères au plus.");
  for (const [nom, texte] of Object.entries(t.blocs)) {
    if (texte.length > 2000) throw new TexteRefuse(`Paragraphe « ${nom} » : 2 000 caractères au plus.`);
  }
  const champs = [t.objet, t.apercu, t.titre ?? "", ...Object.values(t.blocs)];
  if (champs.some((c) => /https?:\/\/|www\.|<[a-z]/i.test(c))) throw new TexteRefuse("Pas de lien ni de balise dans les textes : les boutons du modèle mènent aux bonnes pages.");
  const autorisees = new Set(variablesDesTextes(defaut));
  const inconnues = [...new Set(champs.flatMap(variablesDe))].filter((v) => !autorisees.has(v));
  if (inconnues.length) throw new TexteRefuse(`Variable inconnue : ${inconnues.map((v) => `{{${v}}}`).join(", ")}.`);
  const utilisees = new Set(champs.flatMap(variablesDe));
  const retirees = [...autorisees].filter((v) => !utilisees.has(v));
  if (retirees.length) throw new TexteRefuse(`Ces informations doivent rester dans l'email : ${retirees.map((v) => `{{${v}}}`).join(", ")}.`);
  if (/\{\{|\}\}/.test(champs.join(" ").replace(/\{\{\s*[a-z_]+\s*\}\}/g, ""))) throw new TexteRefuse("Variable mal écrite : utilisez {{nom}}.");
  return t;
}

export async function etatModele(code: string): Promise<EtatModele> {
  const defaut = textesParDefaut(code);
  const m = await dbSite().modeleEmail.findUnique({ where: { code } });
  return {
    defaut,
    publie: m?.textesPublies ? fusionner(defaut, m.textesPublies as Partial<TextesModele>) : null,
    brouillon: m?.textesBrouillon ? fusionner(defaut, m.textesBrouillon as Partial<TextesModele>) : null,
    publieLe: m?.publieLe ?? null,
    publiePar: m?.publiePar ?? null,
  };
}

async function journal(auteur: Auteur, action: string, code: string, detail: Record<string, unknown> = {}) {
  await dbSite().journalAction.create({ data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet: code, detail: JSON.parse(JSON.stringify(detail)) } });
}

const json = (t: TextesModele) => JSON.parse(JSON.stringify(t)) as Prisma.InputJsonValue;

export async function enregistrerBrouillon(code: string, saisie: TextesModele, auteur: Auteur): Promise<void> {
  const t = validerTextes(code, saisie);
  await dbSite().modeleEmail.upsert({
    where: { code },
    create: { code, textesBrouillon: json(t), modifiePar: auteur.libelle },
    update: { textesBrouillon: json(t), modifiePar: auteur.libelle },
  });
}

export async function publierModele(code: string, auteur: Auteur, maintenant = new Date()): Promise<void> {
  const { brouillon } = await etatModele(code);
  if (!brouillon) throw new TexteRefuse("Aucun brouillon à publier.");
  const t = validerTextes(code, brouillon);
  await dbSite().modeleEmail.update({ where: { code }, data: { textesPublies: json(t), textesBrouillon: Prisma.DbNull, publieLe: maintenant, publiePar: auteur.libelle, modifiePar: auteur.libelle } });
  await journal(auteur, "emailing.modele_publie", code, { objet: t.objet });
}

export async function revenirAuTexteOrigine(code: string, auteur: Auteur): Promise<void> {
  textesParDefaut(code);
  await dbSite().modeleEmail.deleteMany({ where: { code } });
  await journal(auteur, "emailing.modele_origine", code);
}

/** Aperçu d'un modèle avec ses données d'exemple, et des textes donnés (brouillon) ou en vigueur. */
export async function apercuModele(code: string, textes?: TextesModele): Promise<EmailRendu> {
  const exemple = EXEMPLES[code];
  if (!exemple) throw new TexteRefuse("Pas d'aperçu pour ce modèle.");
  return textes ? avecTextes(code, validerTextes(code, textes), exemple) : exemple();
}

/** Email de test du brouillon (ou du texte en vigueur) à l'administrateur. */
export async function envoyerTestModele(code: string, auteur: Auteur, maintenant = new Date()): Promise<void> {
  const { brouillon } = await etatModele(code);
  const rendu = await apercuModele(code, brouillon ?? undefined);
  await demanderEnvoi({ modele: code, destinataire: auteur.email, rendu, cle: `modele-test:${code}:${maintenant.getTime()}`, declencheur: "email de test d'un modèle", test: true }, maintenant);
  await journal(auteur, "emailing.modele_teste", code);
}
