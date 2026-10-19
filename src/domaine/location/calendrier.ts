import { ajouterJoursCivils, ajouterJoursOuvres, estJourOuvre, heureDeParis, jourDeParis } from "@/lib/calendrier";

// Calendrier de livraison d'une mise à disposition (F05, R3, FR-007) : fonctions pures. La
// livraison au lendemain n'est proposée que pour une commande passée un jour ouvré avant
// l'heure limite, hors zones éloignées, et si un appareil du parc est disponible.

export type ReglesLivraison = {
  /** « HH:MM », heure de Paris (partagée avec la livraison express de F04, D2). */
  heureLimite: string;
  /** Jours non livrés (AAAA-MM-JJ) en plus des week-ends et jours fériés. */
  joursNonLivres: string[];
  /** Préfixes de codes postaux sans livraison au lendemain (D3). */
  zonesSansLendemain: string[];
  delaiZonesJours: number;
};

export function estZoneEloignee(codePostal: string | null | undefined, regles: ReglesLivraison): boolean {
  const cp = (codePostal ?? "").trim();
  return Boolean(cp) && regles.zonesSansLendemain.some((z) => z && cp.startsWith(z));
}

/** Premier jour ouvré égal ou postérieur à un jour donné. */
function premierOuvreDes(jour: string, exclus: readonly string[]): string {
  return estJourOuvre(jour, exclus) ? jour : ajouterJoursOuvres(jour, 1, exclus);
}

/**
 * Première date de livraison possible (AAAA-MM-JJ) : lendemain ouvré si la commande est passée
 * un jour ouvré avant l'heure limite, sinon un jour de préparation de plus ; délai des zones
 * éloignées ; jamais avant la première date où un appareil du parc est disponible.
 */
export function premiereDateLivraison(maintenant: Date, regles: ReglesLivraison, codePostal?: string | null, premiereDateParc?: string | null): string {
  const exclus = regles.joursNonLivres;
  const jour = jourDeParis(maintenant);
  const avantLimite = estJourOuvre(jour, exclus) && heureDeParis(maintenant) < regles.heureLimite;
  let date = ajouterJoursOuvres(jour, avantLimite ? 1 : 2, exclus);
  if (estZoneEloignee(codePostal, regles)) date = ajouterJoursOuvres(date, regles.delaiZonesJours, exclus);
  if (premiereDateParc && premiereDateParc > date) date = premierOuvreDes(premiereDateParc, exclus);
  return date;
}

/** Jours ouvrés proposés au choix du client, à partir de la première date possible. */
export function datesProposees(premiere: string, regles: ReglesLivraison, nombre = 15): string[] {
  const dates = [premierOuvreDes(premiere, regles.joursNonLivres)];
  while (dates.length < nombre) dates.push(ajouterJoursOuvres(dates[dates.length - 1]!, 1, regles.joursNonLivres));
  return dates;
}

/** Livraison « demain » : le jour civil qui suit la commande. */
export function estLendemain(maintenant: Date, date: string): boolean {
  return ajouterJoursCivils(jourDeParis(maintenant), 1) === date;
}

/** « jeudi 15 octobre » */
export function libelleJour(jour: string): string {
  return new Date(`${jour}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
