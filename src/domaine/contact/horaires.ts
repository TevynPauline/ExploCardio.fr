import { ajouterJoursCivils, dateDuJour, heureDeParis, joursFeries, jourDeParis } from "@/lib/calendrier";
import { lireParametre } from "@/lib/parametres";

// Horaires de réponse de la ligne WhatsApp (F09, FR-006, D1) : plages par jour de la semaine,
// jours fériés calculés (calendrier français), fermetures exceptionnelles. Fonctions pures,
// sauf la lecture des paramètres.

export type Plage = [string, string]; // « 09:00 », « 18:00 »
export type JourSemaine = "1" | "2" | "3" | "4" | "5" | "6" | "7"; // 1 = lundi
export type Horaires = Record<JourSemaine, Plage[]>;
export type Fermeture = { du: string; au: string; motif?: string };

const JOURS: JourSemaine[] = ["1", "2", "3", "4", "5", "6", "7"];
const NOMS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const SEMAINE: Plage[] = [["09:00", "18:00"]];

export const HORAIRES_PAR_DEFAUT: Horaires = { "1": SEMAINE, "2": SEMAINE, "3": SEMAINE, "4": SEMAINE, "5": SEMAINE, "6": [], "7": [] };

const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function lireHorairesJson(json: string | null | undefined): Horaires {
  try {
    const brut = JSON.parse(json ?? "") as Record<string, unknown>;
    const h = {} as Horaires;
    for (const j of JOURS) {
      const plages = (Array.isArray(brut[j]) ? brut[j] : []) as unknown[];
      h[j] = plages.filter((p): p is Plage => Array.isArray(p) && p.length === 2 && HEURE.test(String(p[0])) && HEURE.test(String(p[1])) && p[0] < p[1]);
    }
    return h;
  } catch {
    return HORAIRES_PAR_DEFAUT;
  }
}

export function lireFermeturesJson(json: string | null | undefined): Fermeture[] {
  try {
    const brut = JSON.parse(json ?? "[]") as unknown[];
    const jour = /^\d{4}-\d{2}-\d{2}$/;
    return (Array.isArray(brut) ? brut : []).filter((f): f is Fermeture => {
      const x = f as Fermeture;
      return Boolean(x) && jour.test(x.du) && jour.test(x.au) && x.du <= x.au;
    });
  } catch {
    return [];
  }
}

export async function lireReglagesHoraires(): Promise<{ horaires: Horaires; fermetures: Fermeture[] }> {
  const [h, f] = await Promise.all([lireParametre("contact.horaires"), lireParametre("contact.fermetures")]);
  return { horaires: lireHorairesJson(h), fermetures: lireFermeturesJson(f) };
}

/** « 9 h », « 13 h 30 ». */
export function heureLisible(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`;
}

function jourSemaine(jour: string): JourSemaine {
  const d = dateDuJour(jour).getUTCDay(); // 0 = dimanche
  return String(d === 0 ? 7 : d) as JourSemaine;
}

function ferme(jour: string, fermetures: Fermeture[]): boolean {
  const annee = Number(jour.slice(0, 4));
  return joursFeries(annee).includes(jour) || fermetures.some((f) => f.du <= jour && jour <= f.au);
}

export type EtatReponse = { ouvert: boolean; prochaine: { jour: string; heure: string } | null; libelle: string };

/** Ouvert maintenant, sinon la prochaine ouverture et une phrase prête à afficher. */
export function etatReponse(horaires: Horaires, fermetures: Fermeture[], maintenant = new Date()): EtatReponse {
  const aujourdhui = jourDeParis(maintenant);
  const heure = heureDeParis(maintenant);
  for (let i = 0; i < 60; i++) {
    const jour = ajouterJoursCivils(aujourdhui, i);
    if (ferme(jour, fermetures)) continue;
    for (const [debut, fin] of [...horaires[jourSemaine(jour)]].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (i === 0 && heure >= debut && heure < fin) return { ouvert: true, prochaine: null, libelle: "Nous vous répondons maintenant." };
      if (i > 0 || heure < debut) {
        const quand =
          i === 0
            ? "aujourd’hui"
            : i === 1
              ? "demain"
              : i < 7
                ? NOMS[Number(jourSemaine(jour)) - 1]!
                : `le ${dateDuJour(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}`;
        return { ouvert: false, prochaine: { jour, heure: debut }, libelle: `Nous vous répondrons ${quand} à ${heureLisible(debut)}.` };
      }
    }
  }
  return { ouvert: false, prochaine: null, libelle: "Écrivez-nous : nous vous répondrons dès notre retour." };
}

/** « Du lundi au vendredi, de 9 h à 18 h, hors jours fériés » ; sinon jour par jour. */
export function resumeHoraires(horaires: Horaires): string {
  const plages = (j: JourSemaine) => horaires[j].map(([d, f]) => `de ${heureLisible(d)} à ${heureLisible(f)}`).join(" et ");
  const ouverts = JOURS.filter((j) => horaires[j].length);
  if (!ouverts.length) return "Écrivez-nous à tout moment";
  const identiques = ouverts.every((j) => plages(j) === plages(ouverts[0]!));
  const consecutifs = ouverts.every((j, i) => i === 0 || Number(j) === Number(ouverts[i - 1]) + 1);
  if (identiques && consecutifs && ouverts.length > 1) {
    return `Du ${NOMS[Number(ouverts[0]) - 1]} au ${NOMS[Number(ouverts.at(-1)) - 1]}, ${plages(ouverts[0]!)}, hors jours fériés`;
  }
  return `${ouverts.map((j) => `${NOMS[Number(j) - 1]} ${plages(j)}`).join(" ; ")}, hors jours fériés`.replace(/^./, (c) => c.toUpperCase());
}
