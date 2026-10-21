import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, ROLES_EQUIPE } from "@/lib/auth";

// Gardes de rôle (T025). Le back-office est réservé à l'équipe ; la double authentification
// y est obligatoire (F13).

export type Role = "client" | "admin" | "commercial" | "support";

export async function sessionCourante() {
  return auth.api.getSession({ headers: await headers() });
}

export function estEquipe(role: string | null | undefined): role is (typeof ROLES_EQUIPE)[number] {
  return ROLES_EQUIPE.includes(role as (typeof ROLES_EQUIPE)[number]);
}

/**
 * Exige un membre de l'équipe (avec double authentification active), et l'un des rôles
 * demandés s'ils sont précisés. Redirige sinon.
 */
export async function exigerEquipe(roles?: readonly Role[]) {
  const session = await sessionCourante();
  if (!session) redirect("/connexion?retour=/admin");
  const role = (session.user as { role?: string }).role;
  if (!estEquipe(role)) redirect("/");
  // Membre désactivé (F13, D4) : ses sessions sont supprimées ; par prudence, on le refuse ici aussi.
  if ((session.user as { desactiveLe?: Date | null }).desactiveLe) redirect("/connexion");
  if (!session.user.twoFactorEnabled) redirect("/connexion/activer-double-authentification");
  if (roles && !roles.includes(role)) redirect("/admin?acces=refuse");
  return { ...session, role };
}

export async function exigerAdministrateur() {
  return exigerEquipe(["admin"]);
}
