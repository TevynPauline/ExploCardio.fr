import { registre } from "@/connecteurs/registre";
import type { Devis, EtatDisponibilite } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import type { FormulePanier } from "@generated/site/client";

// Panier détaillé (F04, US1, R1, R2) : les montants viennent du devis d'Odoo ; prix et
// disponibilités sont relus à chaque affichage pour signaler tout changement depuis l'ajout.

export type LigneDetaillee = {
  id: string;
  defaultCode: string;
  formule: FormulePanier;
  libelle: string;
  quantite: number;
  prixUnitaireHt: number | null;
  remiseHt: number;
  totalHt: number | null;
  tauxTva: number;
  promotion: string | null;
  /** Prix différent de celui constaté à l'ajout (FR-006). */
  prixAChange: boolean;
  ancienPrixHt: number;
  etat: EtatDisponibilite | null;
  delaiJours: number | null;
  indisponible: boolean;
};

export type PanierDetaille = {
  panierId: string;
  lignes: LigneDetaillee[];
  devis: Devis | null;
  codePromo: string | null;
  utiliserBons: boolean;
  /** Odoo injoignable : rien n'est affirmé, la commande attend. */
  indisponible: boolean;
  /** La commande ne peut pas être lancée (article indisponible, Odoo injoignable, panier vide). */
  bloquant: boolean;
};

/** Référence du partenaire d'Odoo d'un compte (liste de prix, bons d'achat). */
export async function partenaireDuCompte(compteId: string | null | undefined): Promise<string | null> {
  if (!compteId) return null;
  const c = await dbSite().compteClient.findUnique({ where: { id: compteId }, select: { odooPartnerRef: true } });
  return c?.odooPartnerRef ?? null;
}

/** Bons d'achat au panier : seulement une fois F06 livré (décision D7). */
export async function bonsAuPanierActifs(): Promise<boolean> {
  return (await lireParametre("fidelite.bons_au_panier")) === "true";
}

export async function panierDetaille(panierId: string, compteId: string | null, modeLivraison: string | null = null): Promise<PanierDetaille> {
  const panier = await dbSite().panier.findUniqueOrThrow({ where: { id: panierId }, include: { lignes: { orderBy: { ajouteLe: "asc" } } } });
  const base = { panierId, codePromo: panier.codePromo, utiliserBons: panier.utiliserBons };
  const brutes: LigneDetaillee[] = panier.lignes.map((l) => ({
    id: l.id,
    defaultCode: l.defaultCode,
    formule: l.formule,
    libelle: l.defaultCode,
    quantite: l.quantite,
    prixUnitaireHt: null,
    remiseHt: 0,
    totalHt: null,
    tauxTva: 20,
    promotion: null,
    prixAChange: false,
    ancienPrixHt: l.prixHtConstate,
    etat: null,
    delaiJours: null,
    indisponible: false,
  }));
  if (!panier.lignes.length) return { ...base, lignes: [], devis: null, indisponible: false, bloquant: true };

  try {
    const odoo = registre.odoo();
    const partenaireRef = await partenaireDuCompte(compteId);
    const bons = partenaireRef && panier.utiliserBons && (await bonsAuPanierActifs()) ? Number.MAX_SAFE_INTEGER : 0;
    const [devis, dispos] = await Promise.all([
      odoo.commandes.calculerDevis({
        partenaireRef,
        lignes: panier.lignes.map((l) => ({ defaultCode: l.defaultCode, formule: l.formule, quantite: l.quantite })),
        codePromo: panier.codePromo,
        bonsDemandesHt: bons,
        modeLivraison,
      }),
      odoo.stock.lireDisponibilite([...new Set(panier.lignes.map((l) => l.defaultCode))]),
    ]);
    const lignes = brutes.map((b, i) => {
      const calc = devis.lignes[i]!;
      const d = dispos.find((x) => x.defaultCode === b.defaultCode);
      const etat = (b.formule === "achat" ? d?.achat : d?.miseADisposition) ?? null;
      return {
        ...b,
        libelle: calc.libelle,
        prixUnitaireHt: calc.prixUnitaireHt,
        remiseHt: calc.remiseHt,
        totalHt: calc.totalHt,
        tauxTva: calc.tauxTva,
        promotion: calc.promotion,
        prixAChange: calc.prixUnitaireHt !== b.ancienPrixHt,
        etat,
        delaiJours: etat?.etat === "delai" ? etat.delaiJours : null,
        indisponible: !etat || etat.etat === "indisponible",
      };
    });
    return { ...base, lignes, devis, indisponible: false, bloquant: lignes.some((l) => l.indisponible) };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    return { ...base, lignes: brutes, devis: null, indisponible: true, bloquant: true };
  }
}
