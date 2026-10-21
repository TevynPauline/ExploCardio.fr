import { redirect } from "next/navigation";
import { outilsDemonstrationDisponibles } from "@/connecteurs/demonstration";
import { exigerEquipe, type Role } from "./roles";

// Matrice des droits du back-office (F13, D2, specs/013-back-office/contracts/droits.md) : seule
// source des droits par rôle, appliquée par les mises en page de rubrique (voir), par chaque
// action serveur (modifier) et par l'interface (boutons et formulaires non rendus).

export type RoleEquipe = Exclude<Role, "client">;
export type Rubrique =
  | "a_traiter"
  | "clients"
  | "demandes"
  | "catalogue"
  | "contenus"
  | "commandes"
  | "cloud"
  | "emails"
  | "parametres"
  | "equipe"
  | "journal"
  | "demonstration";
export type DroitFin = "comptes.valider" | "comptes.suspendre" | "comptes.rgpd" | "cloud.agir" | "parametres.bienvenue";
export type Action = "voir" | "modifier";

const A: RoleEquipe[] = ["admin"];
const AC: RoleEquipe[] = ["admin", "commercial"];
const ACS: RoleEquipe[] = ["admin", "commercial", "support"];

const MATRICE: Record<Rubrique | DroitFin, { voir: RoleEquipe[]; modifier: RoleEquipe[] }> = {
  a_traiter: { voir: ACS, modifier: [] },
  clients: { voir: ACS, modifier: AC },
  demandes: { voir: AC, modifier: AC },
  catalogue: { voir: AC, modifier: AC },
  contenus: { voir: AC, modifier: AC },
  commandes: { voir: ACS, modifier: [] },
  cloud: { voir: ACS, modifier: ["admin", "support"] },
  emails: { voir: A, modifier: A },
  parametres: { voir: AC, modifier: A },
  equipe: { voir: A, modifier: A },
  journal: { voir: A, modifier: [] },
  demonstration: { voir: A, modifier: A },
  "comptes.valider": { voir: AC, modifier: AC },
  "comptes.suspendre": { voir: A, modifier: A },
  "comptes.rgpd": { voir: A, modifier: A },
  "cloud.agir": { voir: ["admin", "support"], modifier: ["admin", "support"] },
  "parametres.bienvenue": { voir: AC, modifier: AC },
};

/** Le rôle peut-il voir ou modifier cette rubrique (fonction pure) ? */
export function peut(role: string | null | undefined, droit: Rubrique | DroitFin, action: Action = "voir"): boolean {
  return (MATRICE[droit][action] as string[]).includes(role ?? "");
}

export type EntreeMenu = { href: string; libelle: string; rubrique: Rubrique };

/** Menu du back-office (D1), dans l'ordre. */
export const MENU: EntreeMenu[] = [
  { href: "/admin", libelle: "À traiter", rubrique: "a_traiter" },
  { href: "/admin/clients", libelle: "Clients", rubrique: "clients" },
  { href: "/admin/demandes", libelle: "Demandes", rubrique: "demandes" },
  { href: "/admin/catalogue", libelle: "Catalogue", rubrique: "catalogue" },
  { href: "/admin/contenus", libelle: "Contenus", rubrique: "contenus" },
  { href: "/admin/emails", libelle: "Emails", rubrique: "emails" },
  { href: "/admin/logiciels-cloud", libelle: "Logiciels Cloud", rubrique: "cloud" },
  { href: "/admin/commandes", libelle: "Commandes et locations", rubrique: "commandes" },
  { href: "/admin/parametres", libelle: "Paramètres", rubrique: "parametres" },
  { href: "/admin/equipe", libelle: "Équipe", rubrique: "equipe" },
  { href: "/admin/journal", libelle: "Journal", rubrique: "journal" },
  { href: "/admin/demonstration", libelle: "Démonstration", rubrique: "demonstration" },
];

export function rubriquesVisibles(role: string | null | undefined): EntreeMenu[] {
  return MENU.filter((m) => peut(role, m.rubrique, "voir") && (m.rubrique !== "demonstration" || outilsDemonstrationDisponibles()));
}

/** Membre de l'équipe ayant ce droit ; sinon retour au tableau de bord (« réservée à un autre rôle »). */
export async function exigerDroit(droit: Rubrique | DroitFin, action: Action = "voir") {
  const session = await exigerEquipe();
  if (!peut(session.role, droit, action)) redirect("/admin?acces=refuse");
  if (droit === "demonstration" && !outilsDemonstrationDisponibles()) redirect("/admin?acces=refuse");
  return session;
}

/** Auteur d'une action, pour le journal. */
export async function auteurAvecDroit(droit: Rubrique | DroitFin, action: Action = "modifier") {
  const { user, role } = await exigerDroit(droit, action);
  return { id: user.id, libelle: `${user.name} (${user.email})`, email: user.email, role };
}
