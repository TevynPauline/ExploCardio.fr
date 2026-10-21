import { cookies, draftMode, headers } from "next/headers";

// Aperçu des contenus en préparation (F13, D7) : le mode brouillon de Next.js, activé seulement
// par la route /api/apercu réservée à l'équipe (son cookie est signé par le serveur). L'aperçu
// ne vaut que dans les cadres d'aperçu du back-office, ou dans l'onglet ouvert exprès par
// « Ouvrir dans un onglet » : ailleurs, le membre de l'équipe voit le site comme un visiteur.
// En aperçu, les lectures publiques incluent les brouillons et ne passent pas par le cache.

export const COOKIE_APERCU_ONGLET = "ec_apercu_onglet";

export async function enApercu(): Promise<boolean> {
  try {
    if (!(await draftMode()).isEnabled) return false;
    if ((await headers()).get("sec-fetch-dest") === "iframe") return true;
    return (await cookies()).get(COOKIE_APERCU_ONGLET)?.value === "1";
  } catch {
    // Hors requête (tâches de fond, tests) : jamais d'aperçu.
    return false;
  }
}
