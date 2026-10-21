import type { RoleEquipe } from "@/lib/droits";
import { invaliderDepuisAction } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre, lireParametre } from "@/lib/parametres";
import { definition, PARAMETRES, rolesAutorises, type DefinitionParametre, type Theme } from "./catalogue";
import { ParametreRefuse, valider, type Saisie } from "./validation";

// Paramètres de fonctionnement (F13, US4, FR-015 à FR-019) : lecture par thème, modification
// validée et historisée (auteur, date, avant, après — SC-006), « Remettre cette valeur »
// (nouvelle ligne d'historique, rien n'est effacé), verrou optimiste (D9), journal.

export { PARAMETRES, THEMES, definition, type DefinitionParametre, type Theme } from "./catalogue";
export { afficher, JOURS_SEMAINE, ParametreRefuse, versSaisie } from "./validation";

type Auteur = { id: string; libelle: string };

export type LigneHistorique = { id: string; date: Date; auteur: string; avant: string | null; apres: string };
export type ParametreLu = DefinitionParametre & { valeur: string; historique: LigneHistorique[] };

async function valeurActuelle(p: DefinitionParametre): Promise<string> {
  return (await lireParametre(p.cle, p.defaut)) ?? "";
}

async function historique(cle: string, nombre = 10): Promise<LigneHistorique[]> {
  const lignes = await dbSite().historiqueParametre.findMany({ where: { cle }, orderBy: { date: "desc" }, take: nombre, include: { auteur: { select: { name: true } } } });
  return lignes.map((l) => ({ id: l.id, date: l.date, auteur: l.auteur?.name ?? "—", avant: l.ancienneValeur, apres: l.nouvelleValeur }));
}

export async function lireTheme(theme: Theme): Promise<ParametreLu[]> {
  return Promise.all(PARAMETRES.filter((p) => p.theme === theme).map(async (p) => ({ ...p, valeur: await valeurActuelle(p), historique: await historique(p.cle) })));
}

function exigerRole(p: DefinitionParametre, role: RoleEquipe) {
  if (!rolesAutorises(p).includes(role)) throw new ParametreRefuse(`${p.libelle} : ce réglage est réservé à un autre rôle.`);
}

function exigerDefinition(cle: string): DefinitionParametre {
  const p = definition(cle);
  if (!p) throw new ParametreRefuse("Paramètre inconnu.");
  return p;
}

/** Les pages du site relisent les paramètres ; sans effet hors d'une action (tests, tâches). */
function rafraichir() {
  try {
    invaliderDepuisAction("contenus");
  } catch {
    // Hors du contexte de Next.js.
  }
}

async function ecrire(p: DefinitionParametre, avant: string, apres: string, auteur: Auteur, action: string) {
  await ecrireParametre(p.cle, apres, auteur.id);
  await dbSite().journalAction.create({ data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet: p.cle, detail: { avant, apres } } });
  rafraichir();
}

/** Refuse si la valeur a changé depuis l'ouverture du formulaire (D9) : qui, et quand. */
async function verifierVersion(p: DefinitionParametre, lue: string) {
  const actuelle = await valeurActuelle(p);
  if (actuelle === lue) return actuelle;
  const [derniere] = await historique(p.cle, 1);
  const quand = derniere?.date.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  throw new ParametreRefuse(`${p.libelle} : modifié${derniere ? ` par ${derniere.auteur} à ${quand}` : ""} depuis que vous avez ouvert la page. Votre saisie n'a pas été enregistrée : rechargez la page.`);
}

/** Modifie un paramètre ; renvoie `false` si la valeur n'a pas changé. */
export async function modifierParametre(cle: string, saisie: Saisie, lue: string, auteur: Auteur, role: RoleEquipe): Promise<boolean> {
  const p = exigerDefinition(cle);
  exigerRole(p, role);
  const valeur = valider(p, saisie);
  const avant = await verifierVersion(p, lue);
  if (valeur === avant) return false;
  await ecrire(p, avant, valeur, auteur, "parametres.modifie");
  return true;
}

/** « Remettre cette valeur » : réécrit la valeur d'une ligne d'historique (nouvelle ligne). */
export async function remettreValeur(historiqueId: string, auteur: Auteur, role: RoleEquipe): Promise<DefinitionParametre> {
  const ligne = await dbSite().historiqueParametre.findUnique({ where: { id: historiqueId } });
  if (!ligne) throw new ParametreRefuse("Cette valeur n'existe plus dans l'historique.");
  const p = exigerDefinition(ligne.cle);
  exigerRole(p, role);
  const avant = await valeurActuelle(p);
  if (avant !== ligne.nouvelleValeur) await ecrire(p, avant, ligne.nouvelleValeur, auteur, "parametres.remis");
  return p;
}
