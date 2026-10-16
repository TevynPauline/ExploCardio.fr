// Consentement aux cookies (F01, US3, R5). Les finalités soumises au consentement sont
// DÉCLARÉES ICI. Tant que la liste est vide (décision D3 : pas de mesure d'audience), le site
// n'utilise que des cookies strictement nécessaires et le bandeau se contente d'informer.

export type Finalite = { cle: string; libelle: string; description: string };

export const FINALITES: Finalite[] = [
  // Exemple, à activer seulement après décision :
  // { cle: "audience", libelle: "Mesure d'audience", description: "Statistiques de fréquentation anonymes." },
];

export const COOKIE_CONSENTEMENT = "ec_consentement";
export const VERSION_CONSENTEMENT = 1;
export const DUREE_CONSENTEMENT_S = 182 * 24 * 3600; // 6 mois (CNIL)

export type ChoixConsentement = { v: number; date: string; finalites: Record<string, boolean> };

export function lireChoix(valeur: string | undefined | null): ChoixConsentement | null {
  if (!valeur) return null;
  try {
    const choix = JSON.parse(decodeURIComponent(valeur)) as ChoixConsentement;
    if (choix.v !== VERSION_CONSENTEMENT) return null;
    if (Date.now() - new Date(choix.date).getTime() > DUREE_CONSENTEMENT_S * 1000) return null;
    return choix;
  } catch {
    return null;
  }
}

export function ecrireChoix(finalites: Record<string, boolean>): string {
  const choix: ChoixConsentement = { v: VERSION_CONSENTEMENT, date: new Date().toISOString(), finalites };
  return `${COOKIE_CONSENTEMENT}=${encodeURIComponent(JSON.stringify(choix))}; Max-Age=${DUREE_CONSENTEMENT_S}; Path=/; SameSite=Lax`;
}

export function accepte(choix: ChoixConsentement | null, finalite: string): boolean {
  return choix?.finalites[finalite] === true;
}
