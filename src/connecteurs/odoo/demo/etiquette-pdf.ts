import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import jetons from "@brand/tokens.json";

// Étiquette de retour de démonstration (F05, D10) : « FICTIVE » en en-tête et en filigrane ;
// le vrai transporteur fournira l'étiquette préaffranchie en mode réel.

function couleur(hexa: string) {
  const n = Number.parseInt(hexa.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export type DonneesEtiquette = {
  abonnementRef: string;
  appareil: string;
  numeroSerie: string | null;
  expediteur: string;
  dateLimite: Date | null;
};

export async function genererPdfEtiquette(e: DonneesEtiquette): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Étiquette de retour ${e.abonnementRef}`);
  const page = pdf.addPage([420, 298]);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const encre = couleur(jetons.color.text.ink);
  page.drawText("FICTIVE", { x: 90, y: 60, size: 72, font: gras, color: couleur(jetons.color.brand.euca), opacity: 0.25, rotate: degrees(20) });
  let y = 262;
  const ligne = (texte: string, police = normal, taille = 11) => {
    page.drawText(texte, { x: 24, y, size: taille, font: police, color: encre });
    y -= taille + 8;
  };
  ligne("ÉTIQUETTE DE RETOUR — FICTIVE (démonstration)", gras, 13);
  ligne("Colis préaffranchi — transporteur de démonstration");
  ligne(`Expéditeur : ${e.expediteur}`);
  ligne("Destinataire : ExploCardio.fr — Service retours (adresse fictive)");
  ligne(`Location : ${e.abonnementRef}`, gras);
  ligne(`Appareil : ${e.appareil}${e.numeroSerie ? ` — n° ${e.numeroSerie}` : ""}`);
  if (e.dateLimite) ligne(`À déposer avant le ${e.dateLimite.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`);
  ligne(`Code de suivi : FICT-RETOUR-${e.abonnementRef}`);
  return pdf.save();
}
