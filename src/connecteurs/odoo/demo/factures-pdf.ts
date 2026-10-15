import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import jetons from "@brand/tokens.json";

// PDF des factures et avoirs de démonstration (FR-032, principe V) :
// mention « FICTIVE » en en-tête et en filigrane sur chaque page.
// Les couleurs proviennent de docs/brand/tokens.json (principe VII).

export const MENTION_FICTIVE = "FICTIVE";

function couleur(hexa: string) {
  const n = Number.parseInt(hexa.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const ENCRE = couleur(jetons.color.text.ink);
const SECONDAIRE = couleur(jetons.color.text.muted);
const ACTION = couleur(jetons.color.brand.deepStrong);
const FILIGRANE = couleur(jetons.color.brand.euca);
const TRAIT = couleur(jetons.color.surface.line);

/** Les polices standard du PDF ne connaissent pas les espaces fines insécables. */
function texteSur(s: string): string {
  return s.replace(/[  ]/g, " ");
}

export function euros(centimes: number): string {
  return texteSur(
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(centimes / 100),
  );
}

export type DonneesFacturePdf = {
  numero: string;
  type: "facture" | "avoir";
  date: Date;
  client: { nom: string; adresse: string[]; rpps: string | null; siret: string | null };
  commandeRef: string | null;
  lignes: {
    libelle: string;
    reference: string;
    quantite: number;
    prixUnitaireHtCentimes: number;
    remiseCentimes: number;
    totalHtCentimes: number;
  }[];
  montantHt: number;
  tva: number;
  montantTtc: number;
};

function filigrane(page: PDFPage, police: PDFFont) {
  const { width, height } = page.getSize();
  const taille = 110;
  const largeur = police.widthOfTextAtSize(MENTION_FICTIVE, taille);
  page.drawText(MENTION_FICTIVE, {
    x: width / 2 - (largeur / 2) * Math.cos(Math.PI / 4),
    y: height / 2 - (largeur / 2) * Math.sin(Math.PI / 4),
    size: taille,
    font: police,
    color: FILIGRANE,
    opacity: 0.25,
    rotate: degrees(45),
  });
}

export async function genererPdfFacture(f: DonneesFacturePdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${f.type === "avoir" ? "Avoir" : "Facture"} ${f.numero} — ${MENTION_FICTIVE}`);
  pdf.setAuthor("ExploCardio.fr (démonstration)");
  pdf.setSubject("Document fictif de démonstration, sans valeur comptable");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  const marge = 50;
  let y = 790;
  const ecrire = (texte: string, x: number, opts: { taille?: number; police?: PDFFont; couleur?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(texteSur(texte), {
      x,
      y,
      size: opts.taille ?? 10,
      font: opts.police ?? normal,
      color: opts.couleur ?? ENCRE,
    });

  filigrane(page, gras);

  // En-tête : mention FICTIVE bien visible
  ecrire(`${MENTION_FICTIVE} — DOCUMENT DE DÉMONSTRATION SANS VALEUR`, marge, { taille: 11, police: gras, couleur: ACTION });
  y -= 30;
  ecrire("ExploCardio.fr", marge, { taille: 18, police: gras });
  ecrire(`${f.type === "avoir" ? "AVOIR" : "FACTURE"} ${MENTION_FICTIVE}`, 340, { taille: 14, police: gras });
  y -= 18;
  ecrire("Explorations fonctionnelles cardiaques (hors imagerie)", marge, { couleur: SECONDAIRE });
  ecrire(`N° ${f.numero}`, 340);
  y -= 14;
  ecrire(`Date : ${f.date.toLocaleDateString("fr-FR")}`, 340);
  if (f.commandeRef) {
    y -= 14;
    ecrire(`Commande : ${f.commandeRef}`, 340);
  }

  y -= 36;
  ecrire("Client (fictif)", marge, { police: gras });
  y -= 14;
  for (const ligne of [f.client.nom, ...f.client.adresse]) {
    ecrire(ligne, marge);
    y -= 13;
  }
  if (f.client.rpps) {
    ecrire(`RPPS (fictif) : ${f.client.rpps}`, marge, { couleur: SECONDAIRE });
    y -= 13;
  }
  if (f.client.siret) {
    ecrire(`SIRET (fictif) : ${f.client.siret}`, marge, { couleur: SECONDAIRE });
    y -= 13;
  }

  // Tableau des lignes
  y -= 20;
  const colonnes = [marge, 300, 360, 430, 500];
  ["Désignation", "Qté", "PU HT", "Remise", "Total HT"].forEach((t, i) => ecrire(t, colonnes[i]!, { police: gras }));
  y -= 6;
  page.drawLine({ start: { x: marge, y }, end: { x: 545, y }, color: TRAIT, thickness: 1 });
  y -= 14;
  for (const l of f.lignes) {
    if (y < 140) {
      page = pdf.addPage([595.28, 841.89]);
      filigrane(page, gras);
      y = 790;
      ecrire(`${MENTION_FICTIVE} — suite ${f.numero}`, marge, { police: gras, couleur: ACTION });
      y -= 24;
    }
    const libelle = l.libelle.length > 48 ? `${l.libelle.slice(0, 47)}…` : l.libelle;
    ecrire(libelle, colonnes[0]!);
    ecrire(String(l.quantite), colonnes[1]!);
    ecrire(euros(l.prixUnitaireHtCentimes), colonnes[2]!);
    ecrire(l.remiseCentimes ? euros(-l.remiseCentimes) : "—", colonnes[3]!);
    ecrire(euros(l.totalHtCentimes), colonnes[4]!);
    y -= 11;
    ecrire(l.reference, colonnes[0]!, { taille: 8, couleur: SECONDAIRE });
    y -= 15;
  }

  y -= 6;
  page.drawLine({ start: { x: 330, y }, end: { x: 545, y }, color: TRAIT, thickness: 1 });
  y -= 16;
  for (const [libelle, montant, police] of [
    ["Total HT", f.montantHt, normal],
    ["TVA", f.tva, normal],
    ["Total TTC", f.montantTtc, gras],
  ] as const) {
    ecrire(libelle, 360, { police });
    ecrire(euros(montant), 470, { police });
    y -= 16;
  }

  y = 60;
  ecrire(
    `Document ${MENTION_FICTIVE} généré par le site de démonstration ExploCardio.fr. Aucune valeur comptable ni fiscale.`,
    marge,
    { taille: 8, couleur: SECONDAIRE },
  );

  return pdf.save();
}
