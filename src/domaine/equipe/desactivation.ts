import { dbSite } from "@/lib/db/site";

// Compte d'équipe désactivé (F13, D4) : lu par l'authentification, qui refuse la connexion avec le
// message habituel. Fichier séparé pour éviter une dépendance circulaire avec `@/lib/auth`.

export async function estDesactive(email: string): Promise<boolean> {
  const u = await dbSite().utilisateur.findUnique({ where: { email: email.trim().toLowerCase() }, select: { desactiveLe: true } });
  return Boolean(u?.desactiveLe);
}
