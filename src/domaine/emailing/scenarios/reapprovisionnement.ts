import type { Envoi } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { ReferenceArticle } from "@/connecteurs/odoo/interfaces";
import { urlDuSite } from "@/emails/charte";
import { emailsEmailing } from "@/emails/modeles-emailing";
import type { EmailRendu } from "@/emails/rendu";
import { dbSite } from "@/lib/db/site";
import { lireParametre, lireParametreEntier } from "@/lib/parametres";
import { demanderEnvoi } from "../envoi";
import { piedPreferences } from "../liens";

// Relance de réapprovisionnement (F10, US2, FR-015 à FR-017, D5, research R6) : pour chaque
// consommable commandé à un rythme régulier, une relance quelques jours avant la date prévue
// de la prochaine commande. Une seule par échéance : l'échéance est identifiée par la date de la
// dernière commande ; une nouvelle commande la remplace et recalcule la date.

const JOUR = 24 * 3600_000;
const HISTORIQUE_MOIS = 18;
const STATUTS_EXCLUS = new Set(["annulee", "en_attente_paiement", "remboursee"]);

export type ReglesReappro = { avanceJours: number; commandesMin: number; ecartMaxPct: number };
export type Rythme = { derniere: Date; prochaine: Date; intervalleJours: number };
export type ArticleDu = { code: string; quantite: number; derniere: string; prochaine: string };

export async function lireReglesReappro(): Promise<ReglesReappro> {
  const [avanceJours, commandesMin, ecartMaxPct] = await Promise.all([
    lireParametreEntier("emailing.reappro.avance_jours", 7),
    lireParametreEntier("emailing.reappro.commandes_min", 3),
    lireParametreEntier("emailing.reappro.ecart_max_pct", 50),
  ]);
  return { avanceJours, commandesMin, ecartMaxPct };
}

/** Rythme habituel (fonction pure) : null si l'historique est insuffisant ou trop irrégulier. */
export function rythme(dates: Date[], r: ReglesReappro): Rythme | null {
  const jours = [...new Set(dates.map((d) => Math.floor(d.getTime() / JOUR)))].sort((a, b) => a - b);
  if (jours.length < r.commandesMin) return null;
  const intervalles = jours.slice(1).map((j, i) => j - jours[i]!);
  const moyenne = intervalles.reduce((s, x) => s + x, 0) / intervalles.length;
  if (moyenne < 1) return null;
  if (intervalles.some((x) => Math.abs(x - moyenne) > (moyenne * r.ecartMaxPct) / 100)) return null;
  const derniere = new Date(Math.max(...dates.map((d) => d.getTime())));
  return { derniere, prochaine: new Date(derniere.getTime() + moyenne * JOUR), intervalleJours: Math.round(moyenne) };
}

/** La relance part dans la fenêtre [date prévue − avance ; date prévue + 7 jours]. */
export function estDue(r: Rythme, maintenant: Date, avanceJours: number): boolean {
  const t = maintenant.getTime();
  return t >= r.prochaine.getTime() - avanceJours * JOUR && t <= r.prochaine.getTime() + 7 * JOUR;
}

const jeton = (code: string, derniere: Date | string) => `${code}@${(typeof derniere === "string" ? new Date(derniere) : derniere).toISOString().slice(0, 10)}`;

/** Commandes d'achat d'un client, par article : dates et quantités. */
async function historique(partenaireRef: string, maintenant: Date): Promise<Map<string, { date: Date; quantite: number }[]>> {
  const odoo = registre.odoo().commandes;
  const depuis = new Date(maintenant.getTime() - HISTORIQUE_MOIS * 30 * JOUR);
  const resumes = (await odoo.listerCommandes(partenaireRef)).filter((c) => c.date >= depuis && c.date <= maintenant && !STATUTS_EXCLUS.has(c.statut));
  const parArticle = new Map<string, { date: Date; quantite: number }[]>();
  for (const r of resumes) {
    const c = await odoo.lireCommande(r.ref);
    for (const l of c.lignes) {
      const liste = parArticle.get(l.defaultCode) ?? [];
      liste.push({ date: c.date, quantite: l.quantite });
      parArticle.set(l.defaultCode, liste);
    }
  }
  return parArticle;
}

async function consommables(): Promise<Map<string, ReferenceArticle>> {
  const refs = await registre.odoo().catalogue.listerReferences();
  return new Map(refs.filter((r) => r.type === "consommable").map((r) => [r.defaultCode, r]));
}

/** Tâche quotidienne : programme les relances dues (une par client, articles regroupés). */
export async function programmerReapprovisionnement(maintenant = new Date(), options: { compteIds?: string[] } = {}): Promise<{ relances: number }> {
  if ((await lireParametre("emailing.reappro.actif")) === "false") return { relances: 0 };
  const regles = await lireReglesReappro();
  let catalogue: Map<string, ReferenceArticle>;
  try {
    catalogue = await consommables();
  } catch (e) {
    if (estErreurConnecteur(e)) return { relances: 0 };
    throw e;
  }
  const comptes = await dbSite().compteClient.findMany({
    where: { statut: "valide", odooPartnerRef: { not: null }, ...(options.compteIds ? { id: { in: options.compteIds } } : {}) },
    select: { id: true, odooPartnerRef: true },
  });
  let relances = 0;
  for (const compte of comptes) {
    try {
      const parArticle = await historique(compte.odooPartnerRef!, maintenant);
      const deja = new Set((await dbSite().envoi.findMany({ where: { compteId: compte.id, scenario: "reapprovisionnement" }, select: { references: true } })).flatMap((e) => e.references));
      const dus: ArticleDu[] = [];
      for (const [code, lignes] of parArticle) {
        const ref = catalogue.get(code);
        if (!ref || ref.disponibilite.etat === "indisponible") continue;
        const r = rythme(lignes.map((l) => l.date), regles);
        if (!r || !estDue(r, maintenant, regles.avanceJours) || deja.has(jeton(code, r.derniere))) continue;
        const derniere = lignes.reduce((a, b) => (b.date > a.date ? b : a));
        dus.push({ code, quantite: derniere.quantite, derniere: r.derniere.toISOString(), prochaine: r.prochaine.toISOString() });
      }
      if (!dus.length) continue;
      dus.sort((a, b) => a.prochaine.localeCompare(b.prochaine));
      const jetons = dus.map((d) => jeton(d.code, d.derniere));
      await demanderEnvoi(
        {
          modele: "relance_reapprovisionnement",
          compteId: compte.id,
          variables: { articles: dus },
          references: jetons,
          cle: `reappro:${compte.id}:${jetons.join(",")}`,
          declencheur: "relance de réapprovisionnement",
        },
        maintenant,
      );
      relances++;
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
    }
  }
  return { relances };
}

const articlesDe = (envoi: Envoi) => ((envoi.variables ?? {}) as { articles?: ArticleDu[] }).articles ?? [];

/** Articles toujours à relancer : ni recommandés depuis, ni retirés, ni indisponibles. */
async function articlesValides(envoi: Envoi, maintenant: Date): Promise<{ articles: ArticleDu[]; partenaireRef: string; catalogue: Map<string, ReferenceArticle> } | null> {
  const compte = envoi.compteId ? await dbSite().compteClient.findUnique({ where: { id: envoi.compteId }, select: { odooPartnerRef: true } }) : null;
  if (!compte?.odooPartnerRef) return null;
  const [parArticle, catalogue] = await Promise.all([historique(compte.odooPartnerRef, maintenant), consommables()]);
  const articles = articlesDe(envoi).filter((a) => {
    const ref = catalogue.get(a.code);
    if (!ref || ref.disponibilite.etat === "indisponible") return false;
    const derniere = Math.max(...(parArticle.get(a.code) ?? []).map((l) => l.date.getTime()));
    return derniere <= new Date(a.derniere).getTime();
  });
  return { articles, partenaireRef: compte.odooPartnerRef, catalogue };
}

export async function objetValide(envoi: Envoi, maintenant: Date): Promise<boolean> {
  return ((await articlesValides(envoi, maintenant))?.articles.length ?? 0) > 0;
}

export async function rendre(envoi: Envoi, maintenant = new Date()): Promise<EmailRendu> {
  const v = await articlesValides(envoi, maintenant);
  if (!v || !v.articles.length) throw new Error("Relance sans article.");
  const odoo = registre.odoo();
  const prix = new Map((await odoo.catalogue.lirePrixClient(v.partenaireRef, v.articles.map((a) => a.code))).map((p) => [p.defaultCode, p.prixHt]));
  const gains = await odoo.fidelite.estimerGains(v.partenaireRef, v.articles.map((a) => ({ defaultCode: a.code, quantite: a.quantite }))).catch(() => null);
  return emailsEmailing.reapprovisionnement({
    articles: v.articles.map((a) => {
      const ref = v.catalogue.get(a.code)!;
      return {
        nom: ref.configuration ? `${ref.nom} — ${ref.configuration}` : ref.nom,
        quantite: a.quantite,
        prixHt: prix.get(a.code) ?? ref.prixHt,
        prochaine: new Date(a.prochaine),
        lien: urlDuSite(`/panier/recommander?ref=${encodeURIComponent(a.code)}&quantite=${a.quantite}`),
      };
    }),
    gains: gains ? { bonsAchatHt: gains.bonsAchatHt, droitsJusquAu: gains.droitsJusquAu } : null,
    pied: piedPreferences(envoi.destinataire, "reapprovisionnement"),
  });
}
