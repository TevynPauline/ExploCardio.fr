import { createOTP } from "@better-auth/utils/otp";
import type { APIRequestContext, BrowserContext } from "@playwright/test";

// Connexion des comptes de démonstration pour les parcours (double authentification comprise).
// Les identifiants viennent de l'environnement, jamais du dépôt.

export const COMPTES = {
  admin: "admin@demo.explocardio.test",
  support: "support@demo.explocardio.test",
  clientDroits: "client.droits@demo.explocardio.test",
  clientSansDroits: "client.sans-droits@demo.explocardio.test",
  attente: "attente@demo.explocardio.test",
} as const;

/**
 * Les routes d'authentification sont limitées à quelques essais par période (protection contre
 * les attaques) : on patiente quand la limite est atteinte, sans la désactiver.
 */
export async function postAvecPatience(
  request: APIRequestContext,
  chemin: string,
  data: object,
  headers: Record<string, string>,
) {
  let r = await request.post(chemin, { data, headers });
  for (let essai = 0; r.status() === 429 && essai < 8; essai++) {
    const attente = Number(r.headers()["x-retry-after"] ?? 5);
    await new Promise((fin) => setTimeout(fin, (attente + 1) * 1000));
    r = await request.post(chemin, { data, headers });
  }
  return r;
}

export async function connecter(request: APIRequestContext, email: string, baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100") {
  // Better Auth vérifie l'origine des requêtes (protection CSRF).
  const headers = { origin: baseURL };
  const motDePasse = process.env.DEMO_ACCOUNTS_PASSWORD;
  if (!motDePasse) throw new Error("DEMO_ACCOUNTS_PASSWORD est absent : impossible de connecter un compte de démonstration.");
  const r = await postAvecPatience(request, "/api/auth/sign-in/email", { email, password: motDePasse }, headers);
  if (!r.ok()) throw new Error(`Connexion refusée pour ${email} (${r.status()}).`);
  const corps = (await r.json()) as { twoFactorRedirect?: boolean };
  if (corps.twoFactorRedirect) {
    const secret = process.env.DEMO_TOTP_SECRET;
    if (!secret) throw new Error("DEMO_TOTP_SECRET est absent : impossible de passer la double authentification.");
    const code = await createOTP(secret).totp();
    const v = await request.post("/api/auth/two-factor/verify-totp", { data: { code }, headers });
    if (!v.ok()) throw new Error(`Double authentification refusée pour ${email} (${v.status()}).`);
  }
}

/** Connecte le contexte du navigateur (les cookies de la requête sont partagés). */
export async function connecterNavigateur(contexte: BrowserContext, email: string) {
  await connecter(contexte.request, email);
}
