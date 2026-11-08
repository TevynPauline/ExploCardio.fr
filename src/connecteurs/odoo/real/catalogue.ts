import { NotFound } from "../../erreurs";
import { trierAnomalies } from "../anomalies";
import type {
  Anomalie,
  Article,
  CatalogueOdoo,
  Categorie,
  EtatDisponibilite,
  FiltresArticles,
  PrixClient,
  ReferenceArticle,
  ResumeArticle,
} from "../interfaces";
import { idDe, texteDe, type ClientOdoo, type Enregistrement } from "./client";
import { RUBRIQUES } from "./correspondance";
import { correspond, type Instantane, type ModeleLu } from "./instantane";
import { paliersPour, prixPour, remisePourcent } from "./prix";

// Domaine « Catalogue » en mode réel (F14, contracts/odoo-reel.md). Lecture seule.

/** Disponibilité d'un article : la meilleure de ses variantes (même règle qu'en démonstration). */
export function meilleureDisponibilite(etats: EtatDisponibilite[]): EtatDisponibilite {
  return (
    etats.find((e) => e.etat === "disponible") ??
    etats
      .filter((e): e is Extract<EtatDisponibilite, { etat: "delai" }> => e.etat === "delai")
      .sort((a, b) => a.delaiJours - b.delaiJours)[0] ??
    { etat: "indisponible" }
  );
}

function formules(m: ModeleLu): ResumeArticle["formules"] {
  return m.offre ? ["achat", "mise_a_disposition"] : ["achat"];
}

function resumer(m: ModeleLu): ResumeArticle {
  return {
    reference: m.variantes[0]!.defaultCode,
    nom: m.nom,
    marque: m.marque,
    type: m.type,
    categorie: m.categorie,
    prixAPartirDeHt: Math.min(...m.variantes.map((v) => v.prixHt)),
    formules: formules(m),
    disponibilite: meilleureDisponibilite(m.variantes.map((v) => v.achat)),
    referenceFictive: false,
    prixInvente: false,
    estFictif: false,
  };
}

const parMarqueEtNom = (a: ModeleLu, b: ModeleLu) => a.marque.localeCompare(b.marque, "fr") || a.nom.localeCompare(b.nom, "fr");

type Partenaire = Enregistrement & { name: string; ref: string | false; property_product_pricelist: unknown; l10n_fr_siret: string | false };

export function creerCatalogueReel(client: ClientOdoo, instantane: () => Promise<Instantane>): CatalogueOdoo {
  return {
    async listerCategories(): Promise<Categorie[]> {
      return RUBRIQUES.map((r) => ({ code: r.code, nom: r.nom, ordre: r.ordre, parentCode: null, estFictif: false }));
    },

    async listerArticles(categorie: string, filtres: FiltresArticles = {}): Promise<ResumeArticle[]> {
      const { modeles } = await instantane();
      return modeles
        .filter((m) => m.categorie === categorie)
        .filter((m) => !filtres.marque || m.marque === filtres.marque)
        .filter((m) => !filtres.type || m.type === filtres.type)
        .sort(parMarqueEtNom)
        .map(resumer)
        .filter((a) => !filtres.disponibilite || a.disponibilite.etat === filtres.disponibilite);
    },

    async lireArticle(reference: string): Promise<Article> {
      const i = await instantane();
      const trouve = i.parReference.get(reference);
      if (!trouve) throw new NotFound("Article", reference);
      const m = trouve.modele;
      return {
        reference: m.variantes[0]!.defaultCode,
        nom: m.nom,
        marque: m.marque,
        type: m.type,
        categorie: m.categorie,
        description: m.description,
        formules: formules(m),
        eligibleBonsAchat: m.eligibleBonsAchat,
        suiviNumeroSerie: m.suiviNumeroSerie,
        referenceFictive: false,
        compatibleAvec: [],
        estFictif: false,
        variantes: m.variantes.map((v) => ({
          defaultCode: v.defaultCode,
          referenceFabricant: v.referenceFabricant,
          configuration: v.configuration,
          attributs: v.attributs,
          prixHt: v.prixHt,
          tauxTva: m.tauxTva,
          prixInvente: false,
          estFictif: false,
          offreMiseADisposition: m.offre,
          quantiteParLot: m.quantiteParLot,
          paliers: i.listeParDefaut === null ? [] : paliersPour(i.regles, i.listeParDefaut, v.cible),
          mensualitesForcees: [],
          composants: [],
          logicielInclus: null,
        })),
        baremeFinancement: [],
      };
    },

    async lirePrixClient(partenaireRef: string, references: string[]): Promise<PrixClient[]> {
      const [partenaires, i] = await Promise.all([
        client.searchRead<Partenaire>("res.partner", [["ref", "=", partenaireRef]], ["property_product_pricelist"], { limite: 1 }),
        instantane(),
      ]);
      const partenaire = partenaires[0];
      if (!partenaire) throw new NotFound("Partenaire", partenaireRef);
      const liste = idDe(partenaire.property_product_pricelist) ?? i.listeParDefaut;
      return references.map((ref) => {
        const trouve = i.parReference.get(ref);
        if (!trouve) throw new NotFound("Article", ref);
        const cible = trouve.variante.cible;
        const catalogue = i.listeParDefaut === null ? trouve.variante.prixHt : prixPour(i.regles, i.listeParDefaut, cible).prixHt;
        const calcul = liste === null ? { prixHt: catalogue, regle: null, nonGeree: null } : prixPour(i.regles, liste, cible);
        return {
          defaultCode: ref,
          prixCatalogueHt: catalogue,
          prixHt: calcul.prixHt,
          remisePourcent: remisePourcent(calcul, catalogue),
          mensualitesForcees: [],
        };
      });
    },

    async rechercher(texte: string): Promise<ResumeArticle[]> {
      if (!texte.trim()) return [];
      const { modeles } = await instantane();
      return modeles.filter((m) => correspond(m, texte)).sort(parMarqueEtNom).slice(0, 30).map(resumer);
    },

    async listerReferences(): Promise<ReferenceArticle[]> {
      const { modeles } = await instantane();
      const ordre = new Map<string, number>(RUBRIQUES.map((r) => [r.code, r.ordre]));
      return [...modeles]
        .sort((a, b) => (ordre.get(a.categorie) ?? 9) - (ordre.get(b.categorie) ?? 9) || parMarqueEtNom(a, b))
        .flatMap((m) =>
          m.variantes.map((v) => ({
            defaultCode: v.defaultCode,
            referenceFabricant: v.referenceFabricant,
            referenceArticle: m.variantes[0]!.defaultCode,
            nom: m.nom,
            marque: m.marque,
            type: m.type,
            categorie: m.categorie,
            configuration: v.configuration,
            prixHt: v.prixHt,
            disponibilite: v.achat,
            estFictif: false,
          })),
        );
    },

    async controlerDonnees(): Promise<Anomalie[]> {
      const [i, clients] = await Promise.all([
        instantane(),
        client.searchRead<Partenaire>("res.partner", [["customer_rank", ">", 0], ["is_company", "=", true], ["active", "=", true]], ["name", "ref", "l10n_fr_siret"]),
      ]);
      const anomalies = [...i.anomalies];
      const parSiret = new Map<string, Partenaire[]>();
      for (const c of clients) {
        const siret = texteDe(c.l10n_fr_siret)?.replace(/\s/g, "");
        const reference = texteDe(c.ref) ?? `client ${c.id}`;
        if (!siret) anomalies.push({ objet: "client", reference, nom: c.name, code: "CLIENT_SANS_SIRET", detail: null, bloquant: false });
        else parSiret.set(siret, [...(parSiret.get(siret) ?? []), c]);
      }
      for (const [siret, liste] of parSiret) {
        if (liste.length < 2) continue;
        for (const c of liste) {
          anomalies.push({ objet: "client", reference: texteDe(c.ref) ?? `client ${c.id}`, nom: c.name, code: "SIRET_EN_DOUBLE", detail: `SIRET ${siret}`, bloquant: false });
        }
      }
      return trierAnomalies(anomalies);
    },
  };
}
