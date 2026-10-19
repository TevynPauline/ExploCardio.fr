// Calendrier français (fonctions pures) : jours fériés, jours ouvrés, heure de Paris.
// Utilisé par le calendrier de livraison (F05, R3) et par la base fictive d'Odoo (date limite
// de retour en jours ouvrés).

const FUSEAU = "Europe/Paris";

/** Date au format AAAA-MM-JJ d'un instant, vue depuis Paris. */
export function jourDeParis(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

/** Heure et minutes à Paris (« 13:59 »). */
export function heureDeParis(instant: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit", hour12: false }).format(instant);
}

/** Jour civil (AAAA-MM-JJ) → date à midi UTC, stable quel que soit le fuseau du serveur. */
export function dateDuJour(jour: string): Date {
  return new Date(`${jour}T12:00:00Z`);
}

export function ajouterJoursCivils(jour: string, n: number): string {
  const d = dateDuJour(jour);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Dimanche de Pâques (algorithme de Meeus / Jones / Butcher). */
function paques(annee: number): string {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** Les onze jours fériés nationaux d'une année (France métropolitaine). */
export function joursFeries(annee: number): string[] {
  const p = paques(annee);
  return [
    `${annee}-01-01`,
    ajouterJoursCivils(p, 1), // lundi de Pâques
    `${annee}-05-01`,
    `${annee}-05-08`,
    ajouterJoursCivils(p, 39), // Ascension
    ajouterJoursCivils(p, 50), // lundi de Pentecôte
    `${annee}-07-14`,
    `${annee}-08-15`,
    `${annee}-11-01`,
    `${annee}-11-11`,
    `${annee}-12-25`,
  ];
}

export function estWeekEnd(jour: string): boolean {
  const j = dateDuJour(jour).getUTCDay();
  return j === 0 || j === 6;
}

/** Jour ouvré : ni week-end, ni jour férié, ni jour exclu (jours non livrés du back-office). */
export function estJourOuvre(jour: string, exclus: readonly string[] = []): boolean {
  return !estWeekEnd(jour) && !joursFeries(Number(jour.slice(0, 4))).includes(jour) && !exclus.includes(jour);
}

/** Le n-ième jour ouvré après un jour donné (n ≥ 1). */
export function ajouterJoursOuvres(jour: string, n: number, exclus: readonly string[] = []): string {
  let j = jour;
  let restant = n;
  while (restant > 0) {
    j = ajouterJoursCivils(j, 1);
    if (estJourOuvre(j, exclus)) restant--;
  }
  return j;
}
