// Exécuté une fois au démarrage du serveur Next.js.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { activerGardeReseau } = await import("@/connecteurs/garde-reseau");
  activerGardeReseau();
  const { demarrerTravailleurs } = await import("@/file-attente/travailleurs");
  demarrerTravailleurs().catch((e: unknown) => console.error("[file d'attente] démarrage impossible", e));
}
