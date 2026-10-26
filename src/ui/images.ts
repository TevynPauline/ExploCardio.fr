/**
 * Images du back-office : les photos (PNG, JPEG, WebP) passent par l'optimiseur de Next.js
 * (taille adaptée à l'écran, WebP ou AVIF) ; un SVG est servi tel quel (l'optimiseur le refuse).
 */
export function sansOptimisation(chemin: string): boolean {
  return chemin.toLowerCase().endsWith(".svg");
}
