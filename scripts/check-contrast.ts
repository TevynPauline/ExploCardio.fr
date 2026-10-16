/**
 * Contrôle des contrastes de la charte (principe VIII, WCAG 2.2 AA).
 * - Vérifie chaque paire texte/fond et composant/fond autorisée par docs/brand/design-system.md
 *   (≥ 4,5:1 pour le texte, ≥ 3:1 pour le grand texte et les composants).
 * - Échoue si une couleur pastel (euca, sage, blue, mint) sert de couleur de texte dans le code,
 *   sauf l'accent eucalyptus sur bloc sombre prévu par la charte.
 * Usage : npm run check:contrast
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import jetons from "../docs/brand/tokens.json" with { type: "json" };

const c = jetons.color;

type Paire = { nom: string; texte: string; fond: string; minimum: 4.5 | 3 };

const PAIRES: Paire[] = [
  { nom: "Texte principal sur ivoire", texte: c.text.ink, fond: c.surface.bg, minimum: 4.5 },
  { nom: "Texte principal sur carte blanche", texte: c.text.ink, fond: c.surface.card, minimum: 4.5 },
  { nom: "Texte principal sur eucalyptus pâle (héros)", texte: c.text.ink, fond: c.surface.pale, minimum: 4.5 },
  { nom: "Texte principal sur encart d'information", texte: c.text.ink, fond: c.surface.blueSoft, minimum: 4.5 },
  { nom: "Texte principal sur encart promo (lin)", texte: c.text.ink, fond: c.surface.lin, minimum: 4.5 },
  { nom: "Texte secondaire sur ivoire", texte: c.text.muted, fond: c.surface.bg, minimum: 4.5 },
  { nom: "Texte secondaire sur carte blanche", texte: c.text.muted, fond: c.surface.card, minimum: 4.5 },
  { nom: "Lien / action sur ivoire", texte: c.brand.deepStrong, fond: c.surface.bg, minimum: 4.5 },
  { nom: "Lien / action sur carte blanche", texte: c.brand.deepStrong, fond: c.surface.card, minimum: 4.5 },
  { nom: "Surtitre (action) sur eucalyptus pâle", texte: c.brand.deepStrong, fond: c.surface.pale, minimum: 4.5 },
  { nom: "Texte blanc sur bouton principal", texte: c.text.onDark, fond: c.brand.deepStrong, minimum: 4.5 },
  { nom: "Texte blanc sur bouton principal survolé", texte: c.text.onDark, fond: c.text.ink, minimum: 4.5 },
  { nom: "Texte blanc sur bloc sombre", texte: c.text.onDark, fond: c.surface.dark, minimum: 4.5 },
  { nom: "Accent eucalyptus sur bloc sombre", texte: c.text.accentOnDark, fond: c.surface.dark, minimum: 4.5 },
  { nom: "Accent vert (grand texte ou gras) sur ivoire", texte: c.brand.deep, fond: c.surface.bg, minimum: 3 },
  { nom: "Accent vert (grand texte ou gras) sur carte blanche", texte: c.brand.deep, fond: c.surface.card, minimum: 3 },
  { nom: "Texte de la pastille (badge)", texte: c.brand.deepStrong, fond: c.surface.card, minimum: 4.5 },
  // --ec-ph-text (#9A9385) n'atteint pas 4,5:1 sur --ec-ph-fill : le texte des emplacements photo
  // utilise --ec-ink (app/globals.css).
  { nom: "Texte d'emplacement photo", texte: c.text.ink, fond: c.placeholder.fill, minimum: 4.5 },
  { nom: "Contour de focus sur ivoire", texte: c.brand.deepStrong, fond: c.surface.bg, minimum: 3 },
  { nom: "Contour du bouton secondaire sur ivoire", texte: c.text.ink, fond: c.surface.bg, minimum: 3 },
  // F01 : tuiles d'accès rapide (texte principal sur les quatre encarts doux)
  { nom: "Texte principal sur tuile menthe", texte: c.text.ink, fond: c.surface.mint, minimum: 4.5 },
  { nom: "Pastille sur encart lin (offre de bienvenue)", texte: c.brand.deepStrong, fond: c.surface.lin, minimum: 4.5 },
  { nom: "Lien du bandeau promotionnel (texte principal sur lin)", texte: c.text.ink, fond: c.surface.lin, minimum: 4.5 },
];

function luminance(hexa: string): number {
  const n = Number.parseInt(hexa.replace("#", ""), 16);
  const canaux = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canaux[0]! + 0.7152 * canaux[1]! + 0.0722 * canaux[2]!;
}

export function contraste(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (clair + 0.05) / (fonce + 0.05);
}

let erreurs = 0;
console.log("Contrastes de la charte (WCAG 2.2 AA)\n");
for (const p of PAIRES) {
  const r = contraste(p.texte, p.fond);
  const ok = r >= p.minimum;
  if (!ok) erreurs++;
  console.log(`${ok ? "✓" : "✗"} ${r.toFixed(2)}:1 (min ${p.minimum}:1)  ${p.nom}`);
}

// Pastels utilisés comme couleur de texte dans le code
const PASTELS = /\btext-(euca|sage|blue|mint)\b|color:\s*var\(--ec-(euca|sage|blue|mint)\)/;
const DOSSIERS = ["app", "src", "styles"];
const fichiers: string[] = [];
function parcourir(dossier: string) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else if (/\.(tsx?|css)$/.test(nom)) fichiers.push(chemin);
  }
}
DOSSIERS.forEach((d) => {
  try {
    parcourir(d);
  } catch {
    /* dossier absent */
  }
});
console.log("\nCouleurs pastel employées comme couleur de texte");
let pastels = 0;
for (const f of fichiers) {
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((ligne, i) => {
      if (PASTELS.test(ligne) && !ligne.includes("ec-dark")) {
        pastels++;
        console.log(`✗ ${f}:${i + 1}  ${ligne.trim()}`);
      }
    });
}
if (!pastels) console.log("✓ aucune");

if (erreurs + pastels > 0) {
  console.error(`\n${erreurs + pastels} non-conformité(s).`);
  process.exit(1);
}
console.log("\nTout est conforme.");
