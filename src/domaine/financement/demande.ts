import { randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Article } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { emailsCommandes } from "@/emails/modeles-commandes";
import { envoyerTache } from "@/file-attente";
import { mensualites } from "../catalogue/prix";
import { alerterEquipe, envoyer } from "../commande/notifications";

// Demande de financement longue durée (F04, US6, R8) : depuis une fiche ou le panier, aucun
// paiement en ligne. Enregistrée sur le site (réelle dès la phase 1), copiée en opportunité
// dans Odoo (file d'attente si Odoo est injoignable), confirmée au client, transmise à
// l'équipe. Aucun nom d'organisme de financement dans les écrans et emails (FR-037).

export const FILE_OPPORTUNITES = "opportunites-financement";

export const LIBELLES_STATUT_FINANCEMENT = {
  recue: "Reçue",
  en_etude: "En étude",
  accordee: "Accordée",
  refusee: "Refusée",
} as const;

export const MENTION_PAR_DEFAUT = "Montant indicatif, sous réserve d'acceptation par notre partenaire financier.";

export class DemandeRefusee extends Error {
  constructor(
    message: string,
    readonly erreurs: Record<string, string> = {},
  ) {
    super(message);
  }
}

export type EquipementFinance = {
  defaultCode: string;
  nom: string;
  quantite: number;
  /** Mensualité indicative HT d'un exemplaire, par durée du barème. */
  mensualites: { dureeMois: number; montantHt: number }[];
};

export type Preparation = {
  equipements: EquipementFinance[];
  durees: number[];
  mention: string;
  cabinet: { nom: string; siret: string; adresse: string };
};

/** Statuts de compte autorisés à demander un financement (validé ou en attente, R8). */
export function peutDemander(statut: string): boolean {
  return statut === "valide" || statut === "en_attente";
}

async function compteDe(compteId: string) {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true, adresses: true } });
  if (!peutDemander(compte.statut)) throw new DemandeRefusee("Votre compte ne permet pas encore de demander un financement : confirmez votre email ou contactez-nous.");
  return compte;
}

async function prixClient(partenaireRef: string | null, codes: string[]) {
  if (!partenaireRef || !codes.length) return new Map<string, { prixHt: number; mensualitesForcees: { dureeMois: number; montantHt: number }[] }>();
  try {
    const prix = await registre.odoo().catalogue.lirePrixClient(partenaireRef, codes);
    return new Map(prix.map((p) => [p.defaultCode, p]));
  } catch (e) {
    if (estErreurConnecteur(e)) return new Map();
    throw e;
  }
}

/** Articles d'Odoo des références données (lecture directe, sans le cache du catalogue) ; `null` si Odoo est injoignable. */
async function articlesPour(codes: string[]): Promise<Article[] | null> {
  if (!codes.length) return [];
  try {
    const odoo = registre.odoo().catalogue;
    const references = await odoo.listerReferences();
    const articles = [...new Set(references.filter((r) => codes.includes(r.defaultCode)).map((r) => r.referenceArticle))];
    return await Promise.all(articles.map((ref) => odoo.lireArticle(ref)));
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

function articleDe(articles: Article[], defaultCode: string) {
  for (const a of articles) {
    const v = a.variantes.find((x) => x.defaultCode === defaultCode);
    if (v) return { article: a, variante: v };
  }
  return null;
}

/** Équipements finançables demandés, avec leurs mensualités indicatives (montant forcé du client compris). */
async function equipementsDe(demandes: { defaultCode: string; quantite: number }[], partenaireRef: string | null): Promise<{ equipements: EquipementFinance[]; durees: number[] }> {
  const articles = await articlesPour(demandes.map((d) => d.defaultCode));
  if (!articles) throw new DemandeRefusee("Le catalogue est momentanément indisponible. Réessayez dans quelques instants.");
  const client = await prixClient(partenaireRef, demandes.map((d) => d.defaultCode));
  const equipements: EquipementFinance[] = [];
  let durees: number[] | null = null;
  for (const d of demandes) {
    const trouve = articleDe(articles, d.defaultCode);
    if (!trouve || !trouve.article.formules.includes("financement")) continue;
    const { article, variante } = trouve;
    const c = client.get(d.defaultCode);
    const m = mensualites({ prixHt: c?.prixHt ?? variante.prixHt, mensualitesForcees: variante.mensualitesForcees }, article.baremeFinancement, c?.mensualitesForcees ?? []);
    equipements.push({
      defaultCode: d.defaultCode,
      nom: variante.configuration ? `${article.nom} (${variante.configuration})` : article.nom,
      quantite: d.quantite,
      mensualites: m.map(({ dureeMois, montantHt }) => ({ dureeMois, montantHt })),
    });
    const ici = m.map((x) => x.dureeMois);
    durees = durees === null ? ici : durees.filter((x) => ici.includes(x));
  }
  return { equipements, durees: durees ?? [] };
}

/** Mensualité indicative totale pour une durée (somme des équipements × quantités). */
export function mensualiteTotale(equipements: EquipementFinance[], dureeMois: number): number | null {
  let total = 0;
  for (const e of equipements) {
    const m = e.mensualites.find((x) => x.dureeMois === dureeMois);
    if (!m) return null;
    total += m.montantHt * e.quantite;
  }
  return total;
}

/** Lignes d'achat finançables du panier du compte. */
async function lignesDuPanier(compteId: string) {
  const panier = await dbSite().panier.findUnique({ where: { compteId }, include: { lignes: true } });
  return (panier?.lignes ?? []).filter((l) => l.formule === "achat").map((l) => ({ defaultCode: l.defaultCode, quantite: l.quantite }));
}

/** Formulaire prérempli : équipements (fiche ou panier), durées du barème, cabinet. */
export async function preparerDemande(compteId: string, source: { article?: string | null; panier?: boolean }): Promise<Preparation> {
  const compte = await compteDe(compteId);
  const demandes = source.panier ? await lignesDuPanier(compteId) : source.article ? [{ defaultCode: source.article, quantite: 1 }] : [];
  const { equipements, durees } = await equipementsDe(demandes, compte.odooPartnerRef);
  const adresse = compte.adresses.find((a) => a.type === "cabinet") ?? compte.adresses[0];
  return {
    equipements,
    durees,
    mention: (await lireParametre("financement.mention"))?.trim() || MENTION_PAR_DEFAUT,
    cabinet: {
      nom: compte.nomCabinet ?? "",
      siret: compte.siret ?? "",
      adresse: adresse ? [adresse.ligne1, adresse.ligne2, `${adresse.codePostal} ${adresse.ville}`].filter(Boolean).join(", ") : "",
    },
  };
}

export type SaisieDemande = {
  equipements: { defaultCode: string; quantite: number }[];
  dureeMois: number;
  cabinet: { nom: string; siret: string; adresse: string; praticiens: number | null };
  telephone: string;
  depuisPanier: boolean;
};

const DOUBLON_JOURS = 30;

/** Enregistre la demande (statut « reçue »), la copie dans Odoo, prévient le client et l'équipe. */
export async function envoyerDemande(compteId: string, saisie: SaisieDemande): Promise<{ id: string }> {
  const compte = await compteDe(compteId);
  const erreurs: Record<string, string> = {};
  if (!saisie.cabinet.nom.trim()) erreurs.cabinet = "Indiquez le nom du cabinet.";
  if (saisie.cabinet.siret && !/^\d{14}$/.test(saisie.cabinet.siret.replace(/\s/g, ""))) erreurs.siret = "Le SIRET compte 14 chiffres.";
  if (!saisie.cabinet.adresse.trim()) erreurs.adresse = "Indiquez l'adresse du cabinet.";
  if (saisie.cabinet.praticiens !== null && (!Number.isInteger(saisie.cabinet.praticiens) || saisie.cabinet.praticiens < 1 || saisie.cabinet.praticiens > 200)) {
    erreurs.praticiens = "Indiquez un nombre de praticiens entre 1 et 200.";
  }
  if (saisie.telephone && !/^[+0-9 ().-]{6,20}$/.test(saisie.telephone)) erreurs.telephone = "Numéro de téléphone invalide.";
  const quantites = saisie.equipements.filter((e) => Number.isInteger(e.quantite) && e.quantite >= 1 && e.quantite <= 50);
  const { equipements, durees } = await equipementsDe(quantites, compte.odooPartnerRef);
  if (!equipements.length) erreurs.equipements = "Choisissez au moins un équipement finançable.";
  else if (!durees.includes(saisie.dureeMois)) erreurs.duree = "Choisissez une durée parmi celles proposées.";
  if (Object.keys(erreurs).length) throw new DemandeRefusee("Vérifiez les champs signalés.", erreurs);

  // Demande en double : mêmes équipements, encore en cours de traitement.
  const codes = equipements.map((e) => e.defaultCode).sort().join(",");
  const recentes = await dbSite().demandeFinancement.findMany({
    where: { compteId, statut: { in: ["recue", "en_etude"] }, creeLe: { gte: new Date(Date.now() - DOUBLON_JOURS * 24 * 3600_000) } },
  });
  const doublon = recentes.find((d) => (d.equipements as { defaultCode: string }[]).map((e) => e.defaultCode).sort().join(",") === codes);
  if (doublon) throw new DemandeRefusee("Vous avez déjà une demande en cours pour ces équipements : suivez-la dans « Mon compte › Financements ».");

  const mensualite = mensualiteTotale(equipements, saisie.dureeMois);
  const cabinet = { ...saisie.cabinet, siret: saisie.cabinet.siret.replace(/\s/g, ""), telephone: saisie.telephone };
  const demande = await dbSite().demandeFinancement.create({
    data: {
      compteId,
      dureeMois: saisie.dureeMois,
      equipements: equipements.map((e) => ({
        defaultCode: e.defaultCode,
        nom: e.nom,
        quantite: e.quantite,
        mensualiteIndicativeHt: e.mensualites.find((m) => m.dureeMois === saisie.dureeMois)?.montantHt ?? null,
      })),
      cabinet,
      mensualiteIndicativeHt: mensualite,
    },
  });
  await dbSite().journalAction.create({
    data: { auteur: "client", action: "financement.demande", objet: demande.id, detail: { equipements: codes, dureeMois: saisie.dureeMois, depuisPanier: saisie.depuisPanier } },
  });

  await copierEnOpportunite(demande.id);

  if (saisie.depuisPanier) {
    const panier = await dbSite().panier.findUnique({ where: { compteId } });
    if (panier) {
      await dbSite().lignePanier.deleteMany({ where: { panierId: panier.id, formule: "achat", defaultCode: { in: equipements.map((e) => e.defaultCode) } } });
    }
  }

  const mention = (await lireParametre("financement.mention"))?.trim() || MENTION_PAR_DEFAUT;
  await envoyer(
    compte.utilisateur.email,
    await emailsCommandes.financementRecu({ equipements: equipements.map((e) => `${e.nom} × ${e.quantite}`), dureeMois: saisie.dureeMois, mensualiteHt: mensualite, mention }),
    "demande de financement",
    `financement-recu:${demande.id}`,
  );
  await alerterEquipe(
    "Nouvelle demande de financement",
    `${cabinet.nom} demande un financement sur ${saisie.dureeMois} mois pour : ${equipements.map((e) => `${e.nom} × ${e.quantite}`).join(", ")}. À traiter dans le back-office (Financements).`,
    `financement:${demande.id}`,
  );
  return { id: demande.id };
}

/** Copie de la demande en opportunité dans Odoo ; mise en file si Odoo est injoignable. */
export async function copierEnOpportunite(demandeId: string, options: { depuisFile?: boolean } = {}): Promise<boolean> {
  const demande = await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id: demandeId }, include: { compte: true } });
  if (demande.opportuniteRef) return true;
  try {
    const { ref } = await registre.odoo().opportunites.copierDemande(
      {
        type: "financement",
        referenceDemande: demande.id,
        partenaireRef: demande.compte.odooPartnerRef ?? undefined,
        contenu: { equipements: demande.equipements, dureeMois: demande.dureeMois, cabinet: demande.cabinet, mensualiteIndicativeHt: demande.mensualiteIndicativeHt },
      },
      `financement:${demande.id}`,
    );
    await dbSite().demandeFinancement.update({ where: { id: demande.id }, data: { opportuniteRef: ref } });
    return true;
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    // Depuis la file : l'échec relance la tâche (nouvel essai plus tard).
    if (options.depuisFile) return false;
    await envoyerTache(FILE_OPPORTUNITES, { demandeId: demande.id }, `opportunite:${demande.id}:${randomUUID()}`);
    return false;
  }
}

/** Demandes du compte, pour « Mon compte › Financements » (sans les notes internes). */
export async function demandesDuCompte(compteId: string) {
  const demandes = await dbSite().demandeFinancement.findMany({ where: { compteId }, orderBy: { creeLe: "desc" } });
  return demandes.map((d) => ({
    id: d.id,
    creeLe: d.creeLe,
    statut: d.statut,
    dureeMois: d.dureeMois,
    mensualiteIndicativeHt: d.mensualiteIndicativeHt,
    commandeRef: d.commandeRef,
    equipements: d.equipements as { defaultCode: string; nom?: string; quantite: number }[],
  }));
}

/** Références finançables parmi celles données (pour le bouton « Demander un financement » du panier). */
export async function codesFinancables(codes: string[]): Promise<Set<string>> {
  const articles = await articlesPour(codes);
  if (!articles) return new Set();
  return new Set(codes.filter((c) => articleDe(articles, c)?.article.formules.includes("financement")));
}
