import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";

// Kit d'accessoires d'une mise à disposition (F05, US5, FR-013 à FR-016, D4) : acheté une
// seule fois par type d'appareil, ajouté d'office au panier quand le client ne le possède pas,
// jamais deux fois d'office (même avec deux locations du même type). Le client peut en racheter
// un volontairement. La possession vient d'Odoo (achats payés, enregistrements de l'équipe).

export type InfoKit = { defaultCode: string; nom: string; possede: boolean; ajoute: boolean };

/** Kit requis par l'offre de mise à disposition d'un appareil ; null s'il n'y en a pas. */
export async function kitRequisPour(defaultCode: string): Promise<{ defaultCode: string; nom: string } | null> {
  const article = await registre.odoo().catalogue.lireArticle(defaultCode);
  const kit = article.variantes.find((v) => v.defaultCode === defaultCode)?.offreMiseADisposition?.kitRequis;
  if (!kit) return null;
  const a = await registre.odoo().catalogue.lireArticle(kit);
  return { defaultCode: kit, nom: a.nom };
}

/** Kits possédés par le client du compte (vide pour un visiteur ou un compte sans fiche Odoo). */
export async function kitsPossedes(compteId: string | null | undefined): Promise<string[]> {
  if (!compteId) return [];
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId }, select: { odooPartnerRef: true } });
  if (!compte?.odooPartnerRef) return [];
  try {
    return await registre.odoo().location.kitsPossedes(compte.odooPartnerRef);
  } catch (e) {
    if (estErreurConnecteur(e)) return [];
    throw e;
  }
}

/**
 * Après l'ajout d'une mise à disposition : ajoute d'office le kit requis s'il manque (ni possédé,
 * ni déjà au panier). Renvoie ce qui a été fait, pour l'afficher au client.
 */
export async function ajouterKitSiNecessaire(panierId: string, compteId: string | null | undefined, madCode: string): Promise<InfoKit | null> {
  const kit = await kitRequisPour(madCode);
  if (!kit) return null;
  if ((await kitsPossedes(compteId)).includes(kit.defaultCode)) return { ...kit, possede: true, ajoute: false };
  const deja = await dbSite().lignePanier.findUnique({ where: { panierId_defaultCode_formule: { panierId, defaultCode: kit.defaultCode, formule: "achat" } } });
  if (deja) return { ...kit, possede: false, ajoute: false };
  const article = await registre.odoo().catalogue.lireArticle(kit.defaultCode);
  const prix = article.variantes.find((v) => v.defaultCode === kit.defaultCode)?.prixHt ?? 0;
  await dbSite().lignePanier.create({ data: { panierId, defaultCode: kit.defaultCode, formule: "achat", quantite: 1, prixHtConstate: prix } });
  return { ...kit, possede: false, ajoute: true };
}

/** Kits obligatoires du panier : requis par une mise à disposition présente et non possédés (D4). */
export async function kitsObligatoires(panierId: string, compteId: string | null | undefined): Promise<Set<string>> {
  const lignes = await dbSite().lignePanier.findMany({ where: { panierId, formule: "mise_a_disposition" } });
  const requis = new Set<string>();
  try {
    for (const l of lignes) {
      const kit = await kitRequisPour(l.defaultCode);
      if (kit) requis.add(kit.defaultCode);
    }
  } catch (e) {
    if (estErreurConnecteur(e)) return new Set();
    throw e;
  }
  const possedes = await kitsPossedes(compteId);
  return new Set([...requis].filter((k) => !possedes.includes(k)));
}

/** Kits requis possédés par le client, pour le lui indiquer au panier et sur la fiche. */
export async function kitsDejaPossedes(panierId: string, compteId: string | null | undefined): Promise<string[]> {
  const possedes = await kitsPossedes(compteId);
  if (!possedes.length) return [];
  const lignes = await dbSite().lignePanier.findMany({ where: { panierId, formule: "mise_a_disposition" } });
  const requis = await Promise.all(lignes.map((l) => kitRequisPour(l.defaultCode).catch(() => null)));
  return [...new Set(requis.filter((k): k is NonNullable<typeof k> => Boolean(k)).map((k) => k.defaultCode))].filter((k) => possedes.includes(k));
}
