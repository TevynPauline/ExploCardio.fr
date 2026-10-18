import { randomInt } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import type { Devis, LigneNouvelleCommande } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import type { CommandeSite, CompteClient, LignePanier, MoyenPaiementCommande } from "@generated/site/client";
import { MESSAGE_HORS_METROPOLE, codePostalMetropole } from "../comptes/adresses";
import { cadeauPourCommande } from "../comptes/bienvenue";
import { peutCommander, type Statut } from "../comptes/statuts";
import { panierPour, lignesPanier } from "../catalogue/panier";
import { partenaireDuCompte } from "./devis";

// Tunnel de commande (F04, US2, R3) : la commande du site garde l'étape et les saisies pour
// reprendre sans ressaisie ; elle porte la référence et la clé d'idempotence du paiement.

export class TunnelRefuse extends Error {
  constructor(
    message: string,
    readonly redirection: string = "/panier",
  ) {
    super(message);
  }
}

export class SaisieInvalide extends Error {
  constructor(readonly erreurs: Record<string, string>) {
    super("Saisie invalide");
  }
}

export type AdresseSaisie = { ligne1: string; ligne2?: string; codePostal: string; ville: string };
export type Adresses = { livraison: AdresseSaisie; facturation: AdresseSaisie };

export type LigneCommandee = { defaultCode: string; formule: "achat" | "mise_a_disposition"; quantite: number; offerte?: boolean };

type CompteAvecAdresses = CompteClient & { adresses: { type: string; ligne1: string; ligne2: string | null; codePostal: string; ville: string }[] };

/** Panier ne contenant qu'une mise à disposition et son kit d'accessoires (FR-007, F05). */
async function estMiseADispositionExpress(lignes: LignePanier[]): Promise<boolean> {
  const mad = lignes.filter((l) => l.formule === "mise_a_disposition");
  if (mad.length !== 1 || mad[0]!.quantite !== 1) return false;
  const achats = lignes.filter((l) => l.formule === "achat");
  if (!achats.length) return true;
  const article = await registre.odoo().catalogue.lireArticle(mad[0]!.defaultCode);
  const kit = article.variantes.find((v) => v.defaultCode === mad[0]!.defaultCode)?.offreMiseADisposition?.kitRequis;
  return achats.length === 1 && achats[0]!.defaultCode === kit;
}

/** Vérifie que le compte peut commander ce panier (FR-007, SC-009). */
export async function verifierAcces(compte: CompteClient, lignes: LignePanier[]): Promise<void> {
  if (!lignes.length) throw new TunnelRefuse("Votre panier est vide.", "/catalogue");
  const express = compte.statut === "en_attente" ? await estMiseADispositionExpress(lignes) : false;
  const acces = peutCommander({ statut: compte.statut as Statut }, { miseADispositionExpress: express });
  if (!acces.autorise) throw new TunnelRefuse(acces.message);
}

async function nouvelleReference(): Promise<string> {
  const annee = new Date().getFullYear();
  for (;;) {
    const ref = `EC-${annee}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    if (!(await dbSite().commandeSite.findUnique({ where: { ref } }))) return ref;
  }
}

function adresseDuCompte(compte: CompteAvecAdresses, type: string): AdresseSaisie | null {
  const a = compte.adresses.find((x) => x.type === type);
  return a ? { ligne1: a.ligne1, ligne2: a.ligne2 ?? undefined, codePostal: a.codePostal, ville: a.ville } : null;
}

/** Commande du site en cours pour ce compte (reprise), ou nouvelle, préremplie depuis le compte. */
export async function ouvrirCommande(compteId: string): Promise<CommandeSite> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { adresses: true } });
  const panier = await panierPour({ compteId }, false);
  const lignes = panier ? await lignesPanier(panier.id) : [];
  await verifierAcces(compte, lignes);
  const copie = lignes.map((l) => ({ defaultCode: l.defaultCode, formule: l.formule, quantite: l.quantite }));
  const enCours = await dbSite().commandeSite.findFirst({
    where: {
      compteId,
      etape: { not: "terminee" },
      etatAchat: { in: ["sans_objet", "a_payer", "refusee", "paiement_en_cours"] },
      etatAbonnement: { in: ["sans_objet", "a_payer", "refusee"] },
    },
    orderBy: { creeLe: "desc" },
  });
  // Paiement ouvert mais panier modifié depuis : la tentative est abandonnée (réservation
  // libérée) pour repartir des nouveaux montants.
  if (enCours?.etatAchat === "paiement_en_cours" && JSON.stringify(lignesDe(enCours)) !== JSON.stringify(copie)) {
    if (enCours.reservationRef) {
      try {
        await registre.odoo().stock.liberer(enCours.reservationRef);
      } catch (e) {
        if (!estErreurConnecteur(e)) throw e;
      }
    }
    await dbSite().commandeSite.update({ where: { id: enCours.id }, data: { etatAchat: "a_payer", reservationRef: null } });
  }
  const aAchat = copie.some((l) => l.formule === "achat");
  const aAbonnement = copie.some((l) => l.formule === "mise_a_disposition");
  const etats = { etatAchat: aAchat ? ("a_payer" as const) : ("sans_objet" as const), etatAbonnement: aAbonnement ? ("a_payer" as const) : ("sans_objet" as const) };
  if (enCours) {
    const actuel = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: enCours.id } });
    // Paiement en cours et panier inchangé : on garde l'état (même session, jamais deux débits).
    if (actuel.etatAchat === "paiement_en_cours") return actuel;
    return dbSite().commandeSite.update({ where: { id: enCours.id }, data: { lignes: copie, codePromo: panier?.codePromo ?? null, ...etats } });
  }
  const livraison = adresseDuCompte(compte, "livraison") ?? adresseDuCompte(compte, "cabinet");
  const facturation = adresseDuCompte(compte, "facturation") ?? adresseDuCompte(compte, "cabinet");
  return dbSite().commandeSite.create({
    data: {
      ref: await nouvelleReference(),
      compteId,
      lignes: copie,
      codePromo: panier?.codePromo ?? null,
      adresses: livraison && facturation ? { livraison, facturation } : {},
      ...etats,
    },
  });
}

export function lignesDe(c: CommandeSite): LigneCommandee[] {
  return (c.lignes as LigneCommandee[]) ?? [];
}

export function adressesDe(c: CommandeSite): Partial<Adresses> {
  return (c.adresses ?? {}) as Partial<Adresses>;
}

function validerAdresse(a: AdresseSaisie, prefixe: string, e: Record<string, string>, metropole: boolean) {
  if (!a.ligne1?.trim()) e[`${prefixe}.ligne1`] = "Indiquez l'adresse.";
  if (!/^\d{5}$/.test(a.codePostal?.trim() ?? "")) e[`${prefixe}.codePostal`] = "Indiquez un code postal de 5 chiffres.";
  else if (metropole && !codePostalMetropole(a.codePostal)) e[`${prefixe}.codePostal`] = MESSAGE_HORS_METROPOLE;
  if (!a.ville?.trim()) e[`${prefixe}.ville`] = "Indiquez la ville.";
}

/** Étape 1 (FR-009) : livraison en France métropolitaine. */
export async function enregistrerAdresses(commande: CommandeSite, a: Adresses): Promise<CommandeSite> {
  const e: Record<string, string> = {};
  validerAdresse(a.livraison, "livraison", e, true);
  validerAdresse(a.facturation, "facturation", e, false);
  if (Object.keys(e).length) throw new SaisieInvalide(e);
  const propre = (x: AdresseSaisie) => ({ ligne1: x.ligne1.trim(), ligne2: x.ligne2?.trim() || undefined, codePostal: x.codePostal.trim(), ville: x.ville.trim() });
  return dbSite().commandeSite.update({
    where: { id: commande.id },
    data: { adresses: { livraison: propre(a.livraison), facturation: propre(a.facturation) }, etape: commande.etape === "adresses" ? "livraison" : commande.etape },
  });
}

/** Heure limite de l'express (paramètre du site, D2), à l'heure de Paris. */
export async function avantHeureLimiteExpress(maintenant = new Date()): Promise<boolean> {
  const limite = (await lireParametre("commande.heure_limite_express"))?.trim() || "14:00";
  const [h, m] = limite.split(":").map(Number);
  const paris = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(maintenant);
  const [hp, mp] = paris.split(":").map(Number);
  return hp! * 60 + mp! < (h ?? 14) * 60 + (m ?? 0);
}

/** Devis de la commande (lignes, cadeau de bienvenue, mode de livraison) ; express soumis à l'heure limite. */
export async function devisCommande(commande: CommandeSite, options: { cadeau?: boolean } = {}): Promise<Devis> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: commande.compteId } });
  const lignes = lignesDe(commande);
  const cadeau = options.cadeau !== false && lignes.some((l) => l.formule === "achat") ? await cadeauPourCommande(compte) : null;
  const devis = await registre.odoo().commandes.calculerDevis({
    partenaireRef: await partenaireDuCompte(commande.compteId),
    lignes: [...lignes, ...(cadeau ? [{ ...cadeau, formule: "achat" as const }] : [])],
    codePromo: commande.codePromo,
    bonsDemandesHt: commande.bonsHt,
    modeLivraison: commande.modeLivraison,
  });
  if (!(await avantHeureLimiteExpress())) {
    for (const m of devis.modesLivraison) {
      if (m.code === "express" && m.disponible) {
        m.disponible = false;
        m.motif = "Commande passée après l'heure limite du jour pour l'express.";
      }
    }
    if (devis.modeLivraison === "express") devis.modeLivraison = devis.modesLivraison.find((m) => m.disponible)?.code ?? null;
  }
  return devis;
}

/** Étape 2 (FR-010, FR-011) : mode de livraison disponible. */
export async function choisirLivraison(commande: CommandeSite, mode: string): Promise<CommandeSite> {
  const devis = await devisCommande(commande);
  const choisi = devis.modesLivraison.find((m) => m.code === mode);
  if (!choisi || !choisi.disponible) throw new SaisieInvalide({ mode: choisi?.motif ?? "Choisissez un mode de livraison." });
  return dbSite().commandeSite.update({
    where: { id: commande.id },
    data: { modeLivraison: mode, etape: commande.etape === "livraison" ? "paiement" : commande.etape },
  });
}

/** Le virement n'est proposé que si l'équipe a renseigné l'IBAN du site. */
export async function virementDisponible(): Promise<boolean> {
  return Boolean((await lireParametre("virement.iban"))?.trim());
}

/** Étape 3 (FR-015 à FR-019) : virement pour les achats seulement ; carte ou SEPA pour l'abonnement. */
export async function choisirPaiement(commande: CommandeSite, achat: MoyenPaiementCommande | null, abonnement: MoyenPaiementCommande | null): Promise<CommandeSite> {
  const lignes = lignesDe(commande);
  const e: Record<string, string> = {};
  if (lignes.some((l) => l.formule === "achat") && (!achat || achat === "sepa")) e.achat = "Choisissez la carte bancaire ou le virement.";
  if (achat === "virement" && !(await virementDisponible())) e.achat = "Le virement n'est pas proposé pour le moment : choisissez la carte bancaire.";
  if (lignes.some((l) => l.formule === "mise_a_disposition") && (!abonnement || abonnement === "virement")) e.abonnement = "Choisissez la carte bancaire ou le prélèvement SEPA.";
  if (Object.keys(e).length) throw new SaisieInvalide(e);
  return dbSite().commandeSite.update({
    where: { id: commande.id },
    data: { moyenPaiement: achat, moyenAbonnement: abonnement, etape: commande.etape === "paiement" ? "recapitulatif" : commande.etape },
  });
}

export type Verification = { ok: true; devis: Devis } | { ok: false; message: string; redirection: string };

/** Juste avant le paiement (FR-024) : accès, devis recalculé, disponibilité revérifiée. */
export async function verifierAvantPaiement(commande: CommandeSite): Promise<Verification> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: commande.compteId } });
  const panier = await panierPour({ compteId: commande.compteId }, false);
  try {
    await verifierAcces(compte, panier ? await lignesPanier(panier.id) : []);
  } catch (e) {
    if (e instanceof TunnelRefuse) return { ok: false, message: e.message, redirection: e.redirection };
    throw e;
  }
  try {
    const devis = await devisCommande(commande);
    const lignes = lignesDe(commande);
    const dispos = await registre.odoo().stock.lireDisponibilite([...new Set(lignes.map((l) => l.defaultCode))]);
    const manque = lignes.find((l) => {
      const d = dispos.find((x) => x.defaultCode === l.defaultCode);
      const etat = l.formule === "achat" ? d?.achat : d?.miseADisposition;
      if (!etat || etat.etat === "indisponible") return true;
      // Mise à disposition : un appareil du parc doit être disponible tout de suite (les délais
      // de livraison d'un appareil en retour relèvent de F05).
      if (l.formule === "mise_a_disposition" && etat.etat !== "disponible") return true;
      // Quantité insuffisante pour un article qui devient indisponible une fois épuisé.
      return l.formule === "achat" && d!.quantiteDisponible !== null && d!.quantiteDisponible < l.quantite && d!.delaiReassortJours === null;
    });
    if (manque) {
      return {
        ok: false,
        message:
          manque.formule === "mise_a_disposition"
            ? "Aucun appareil n'est disponible tout de suite pour cette mise à disposition : contactez-nous pour convenir d'une date, ou retirez-la du panier."
            : "Un article de votre panier n'est plus disponible : ajustez votre panier avant de payer.",
        redirection: "/panier",
      };
    }
    if (!devis.modeLivraison && lignes.some((l) => l.formule === "achat")) {
      return { ok: false, message: "Aucun mode de livraison n'est disponible : choisissez-en un autre.", redirection: "/commande/livraison" };
    }
    return { ok: true, devis };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    return { ok: false, message: "Nous ne pouvons pas vérifier les prix et la disponibilité pour le moment. Votre panier est conservé : réessayez dans quelques instants.", redirection: "/panier" };
  }
}

/** Lignes d'achat à envoyer à Odoo (avec le cadeau de bienvenue s'il y a droit). */
export async function lignesAchatPourOdoo(commande: CommandeSite): Promise<LigneNouvelleCommande[]> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: commande.compteId } });
  const achats = lignesDe(commande).filter((l) => l.formule === "achat").map((l) => ({ defaultCode: l.defaultCode, quantite: l.quantite }));
  const cadeau = achats.length ? await cadeauPourCommande(compte) : null;
  return [...achats, ...(cadeau ? [cadeau] : [])];
}

/** Commande du site d'un compte, par sa référence (jamais celle d'un autre client). */
export async function commandeDuCompte(compteId: string, ref: string): Promise<CommandeSite | null> {
  return dbSite().commandeSite.findFirst({ where: { compteId, ref } });
}
