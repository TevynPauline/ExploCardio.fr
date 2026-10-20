import { ajouterJoursCivils, estJourOuvre, heureDeParis, jourDeParis } from "@/lib/calendrier";
import type { FamilleEmail, ScenarioEmail, StatutCompteClient } from "@generated/site/client";

// Décision d'envoi selon la famille (F10, research R3, D6, D10) : fonction pure, réévaluée à la
// programmation puis au moment d'envoyer. Les transactionnels ne sont jamais filtrés, comptés
// ni retardés (FR-003, FR-031).

export type PreferencesTypes = { reapprovisionnement: boolean; panierAbandonne: boolean; alerteBons: boolean; alerteDroits: boolean };

export const PREFERENCES_PAR_DEFAUT: PreferencesTypes = { reapprovisionnement: true, panierAbandonne: true, alerteBons: true, alerteDroits: true };

/** Type de préférence qui gouverne chaque scénario de service. */
export const PREFERENCE_DU_SCENARIO: Partial<Record<ScenarioEmail, keyof PreferencesTypes>> = {
  reapprovisionnement: "reapprovisionnement",
  panier_abandonne: "panierAbandonne",
  alerte_bons: "alerteBons",
  alerte_droits: "alerteDroits",
};

export type ReglesEnvoi = {
  frequenceMax: number;
  frequenceJours: number;
  /** Heures de Paris (début inclus, fin exclue), jours ouvrés seulement. */
  plageDebut: number;
  plageFin: number;
  /** Au-delà, un envoi reporté est abandonné (D6). */
  reportMaxJours: number;
};

export const REGLES_PAR_DEFAUT: ReglesEnvoi = { frequenceMax: 2, frequenceJours: 7, plageDebut: 8, plageFin: 19, reportMaxJours: 7 };

export type ContexteDecision = {
  famille: FamilleEmail;
  scenario: ScenarioEmail | null;
  /** null : destinataire sans compte (abonné du pied de page). */
  statutCompte: StatutCompteClient | null;
  preferences: PreferencesTypes;
  abonne: boolean;
  adresseSuspendue: boolean;
  scenarioActif: boolean;
  objetValide: boolean;
  /** Dates des envois facultatifs et commerciaux déjà partis vers cette adresse. */
  envoisRecents: Date[];
  creeLe: Date;
};

export type Decision =
  | { action: "envoyer" }
  | { action: "reporter"; date: Date }
  | { action: "annuler"; motif: string };

const JOUR = 24 * 3600_000;

/** Instant correspondant à un jour et une heure de Paris (heure d'été comprise). */
export function instantDeParis(jour: string, heure: number): Date {
  const approx = new Date(`${jour}T${String(heure).padStart(2, "0")}:00:00Z`);
  const vu = Number(heureDeParis(approx).slice(0, 2));
  const decalage = ((vu - heure + 24) % 24) * 3600_000;
  return new Date(approx.getTime() - decalage);
}

/** Premier instant autorisé (jour ouvré, dans la plage) à partir d'une date. */
export function prochainCreneau(date: Date, regles: ReglesEnvoi): Date {
  let jour = jourDeParis(date);
  const heure = Number(heureDeParis(date).slice(0, 2));
  if (estJourOuvre(jour) && heure >= regles.plageDebut && heure < regles.plageFin) return date;
  if (!estJourOuvre(jour) || heure >= regles.plageFin) jour = ajouterJoursCivils(jour, 1);
  while (!estJourOuvre(jour)) jour = ajouterJoursCivils(jour, 1);
  return instantDeParis(jour, regles.plageDebut);
}

export function decider(c: ContexteDecision, regles: ReglesEnvoi, maintenant: Date): Decision {
  if (c.famille === "equipe") return { action: "envoyer" };
  if (c.famille === "transactionnel") return c.objetValide ? { action: "envoyer" } : { action: "annuler", motif: "objet disparu" };

  if (c.statutCompte && c.statutCompte !== "valide") return { action: "annuler", motif: `compte ${c.statutCompte}` };
  if (!c.scenarioActif) return { action: "annuler", motif: "scénario désactivé" };
  if (c.famille === "commercial" && !c.abonne) return { action: "annuler", motif: "non abonné" };
  const pref = c.scenario ? PREFERENCE_DU_SCENARIO[c.scenario] : undefined;
  if (c.famille === "service" && pref && !c.preferences[pref]) return { action: "annuler", motif: "préférence du client" };
  if (c.adresseSuspendue) return { action: "annuler", motif: "adresse suspendue" };
  if (!c.objetValide) return { action: "annuler", motif: "objet disparu" };

  let date = maintenant;
  const fenetre = regles.frequenceJours * JOUR;
  const recents = c.envoisRecents.filter((d) => maintenant.getTime() - d.getTime() < fenetre).sort((a, b) => a.getTime() - b.getTime());
  if (recents.length >= regles.frequenceMax) {
    date = new Date(recents[recents.length - regles.frequenceMax]!.getTime() + fenetre);
  }
  date = prochainCreneau(date, regles);
  if (date.getTime() === maintenant.getTime()) return { action: "envoyer" };
  if (date.getTime() - c.creeLe.getTime() > regles.reportMaxJours * JOUR) return { action: "annuler", motif: "fréquence" };
  return { action: "reporter", date };
}
