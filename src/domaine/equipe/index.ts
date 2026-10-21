import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";
import type { RoleEquipe } from "@/lib/droits";

// Équipe du back-office (F13, US9, FR-023, D4) : invitation (lien pour choisir son mot de passe,
// double authentification à la première connexion), changement de rôle, désactivation,
// réactivation. Au moins un administrateur actif à tout moment. Tout est journalisé.

export class EquipeRefusee extends Error {}

export type Auteur = { id: string; libelle: string };
export const ROLES_EQUIPE_LIBELLES: Record<RoleEquipe, string> = { admin: "Administrateur", commercial: "Commercial", support: "Support" };

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function journal(auteur: Auteur, action: string, objet: string, detail: Record<string, unknown> = {}) {
  await dbSite().journalAction.create({ data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

export async function listerEquipe() {
  return dbSite().utilisateur.findMany({
    where: { role: { in: ["admin", "commercial", "support"] } },
    select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true, desactiveLe: true, inviteLe: true, createdAt: true },
    orderBy: [{ desactiveLe: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}

async function administrateursActifs(sauf?: string): Promise<number> {
  return dbSite().utilisateur.count({ where: { role: "admin", desactiveLe: null, ...(sauf ? { id: { not: sauf } } : {}) } });
}

/** Lien d'invitation : le parcours « mot de passe oublié » de Better Auth, marqué invitation. */
async function envoyerInvitation(email: string) {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reinitialiser-mot-de-passe?invitation=1" } });
}

export async function inviter(saisie: { nom: string; email: string; role: RoleEquipe }, auteur: Auteur, maintenant = new Date()): Promise<string> {
  const nom = saisie.nom.trim();
  const email = saisie.email.trim().toLowerCase();
  if (nom.length < 2 || nom.length > 80) throw new EquipeRefusee("Nom : entre 2 et 80 caractères.");
  if (!ADRESSE.test(email)) throw new EquipeRefusee("Adresse email invalide.");
  if (!(saisie.role in ROLES_EQUIPE_LIBELLES)) throw new EquipeRefusee("Rôle inconnu.");
  if (await dbSite().utilisateur.findUnique({ where: { email } })) throw new EquipeRefusee("Cette adresse a déjà un compte sur le site.");
  const ctx = await auth.$context;
  // Mot de passe aléatoire jamais communiqué : la personne choisit le sien par le lien d'invitation.
  const hache = await ctx.password.hash(randomBytes(24).toString("base64url"));
  const id = randomUUID();
  await dbSite().utilisateur.create({
    data: {
      id,
      name: nom,
      email,
      emailVerified: true,
      role: saisie.role,
      inviteLe: maintenant,
      comptes: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hache } },
    },
  });
  await envoyerInvitation(email);
  await journal(auteur, "equipe.invitation", email, { role: saisie.role });
  return id;
}

export async function renvoyerInvitation(id: string, auteur: Auteur): Promise<void> {
  const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id } });
  if (u.desactiveLe) throw new EquipeRefusee("Ce compte est désactivé : réactivez-le d'abord.");
  await envoyerInvitation(u.email);
  await journal(auteur, "equipe.invitation_renvoyee", u.email);
}

export async function changerRole(id: string, role: RoleEquipe, auteur: Auteur): Promise<void> {
  if (!(role in ROLES_EQUIPE_LIBELLES)) throw new EquipeRefusee("Rôle inconnu.");
  const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id } });
  if (u.role === role) return;
  if (u.role === "admin" && !u.desactiveLe && (await administrateursActifs(id)) === 0) {
    throw new EquipeRefusee("Il doit rester au moins un administrateur actif.");
  }
  await dbSite().utilisateur.update({ where: { id }, data: { role } });
  await journal(auteur, "equipe.role", u.email, { avant: u.role, apres: role });
}

export async function desactiver(id: string, auteur: Auteur, maintenant = new Date()): Promise<void> {
  const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id } });
  if (u.desactiveLe) return;
  if (u.role === "admin" && (await administrateursActifs(id)) === 0) throw new EquipeRefusee("Il doit rester au moins un administrateur actif.");
  await dbSite().$transaction([
    dbSite().utilisateur.update({ where: { id }, data: { desactiveLe: maintenant, desactivePar: auteur.libelle } }),
    dbSite().session.deleteMany({ where: { userId: id } }),
  ]);
  await journal(auteur, "equipe.desactivation", u.email);
}

export async function reactiver(id: string, auteur: Auteur): Promise<void> {
  const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id } });
  if (!u.desactiveLe) return;
  await dbSite().utilisateur.update({ where: { id }, data: { desactiveLe: null, desactivePar: null } });
  await journal(auteur, "equipe.reactivation", u.email);
}

export { estDesactive } from "./desactivation";
