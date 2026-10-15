import jetons from "@brand/tokens.json";

// Valeurs de la charte pour les emails : les clients de messagerie n'interprètent pas les
// variables CSS, on lit donc docs/brand/tokens.json (principe VII). Aucune valeur en dur.

export const charte = {
  police: `${jetons.font.family}, Helvetica, Arial, sans-serif`,
  fond: jetons.color.surface.bg,
  carte: jetons.color.surface.card,
  encre: jetons.color.text.ink,
  secondaire: jetons.color.text.muted,
  action: jetons.color.brand.deepStrong,
  surAction: jetons.color.text.onDark,
  trait: jetons.color.surface.line,
  sombre: jetons.color.surface.dark,
  accentSurSombre: jetons.color.text.accentOnDark,
  rayon: jetons.radius.md,
  pilule: jetons.radius.pill,
} as const;

export function urlDuSite(chemin = ""): string {
  return `${(process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}${chemin}`;
}
