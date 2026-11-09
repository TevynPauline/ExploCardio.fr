// Données structurées (JSON-LD) lues par les moteurs de recherche (F21, R6, contrats § 4).
// Constructeurs purs, sans dépendance ; les types schema.org utiles sont décrits à la main.

type Objet = Record<string, unknown>;

/** Identité légale de l'entreprise (Kbis, mentions légales). */
export const IDENTITE = {
  nom: "ExploCardio.fr",
  rue: "13 chemin de Gontard",
  codePostal: "13710",
  ville: "Fuveau",
  pays: "FR",
  tva: "FR46132194101",
  logo: "/marque/explocardio-fr-logo.png",
} as const;

const absolue = (origine: string, chemin: string) => (/^https?:\/\//.test(chemin) ? chemin : `${origine}${chemin.startsWith("/") ? "" : "/"}${chemin}`);

export function organisation(origine: string, contact: { email?: string | null; telephone?: string | null } = {}): Objet {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: IDENTITE.nom,
    url: `${origine}/`,
    logo: absolue(origine, IDENTITE.logo),
    address: {
      "@type": "PostalAddress",
      streetAddress: IDENTITE.rue,
      postalCode: IDENTITE.codePostal,
      addressLocality: IDENTITE.ville,
      addressCountry: IDENTITE.pays,
    },
    vatID: IDENTITE.tva,
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.telephone ? { telephone: contact.telephone } : {}),
  };
}

export type Disponibilite = "en_stock" | "sur_commande" | "rupture";
const DISPONIBILITE: Record<Disponibilite, string> = {
  en_stock: "https://schema.org/InStock",
  sur_commande: "https://schema.org/BackOrder",
  rupture: "https://schema.org/OutOfStock",
};

export type ProduitStructure = {
  nom: string;
  reference: string;
  marque?: string | null;
  description?: string | null;
  images: string[];
  chemin: string;
  /**
   * Prix publics des variantes, tels qu'affichés à tous (constitution 2.3.0 : TTC en premier,
   * HT en dessous). Le TTC est calculé par l'appelant avec le taux de TVA de l'article (F22),
   * pour rester identique à l'affichage. Jamais un prix client.
   */
  variantes: { prixTtc: number | null; prixHt: number | null; disponibilite: Disponibilite }[];
};

const prixValide = (p: number | null): p is number => typeof p === "number" && Number.isFinite(p) && p > 0;
const arrondi = (n: number) => Math.round(n * 100) / 100;

export function produit(origine: string, p: ProduitStructure): Objet {
  const url = absolue(origine, p.chemin);
  const vendues = p.variantes.filter((v) => prixValide(v.prixTtc) && prixValide(v.prixHt)) as {
    prixTtc: number;
    prixHt: number;
    disponibilite: Disponibilite;
  }[];
  const vendeur = { "@type": "Organization", name: IDENTITE.nom };
  const specification = (prix: number, ttc: boolean) => ({
    "@type": "PriceSpecification",
    price: arrondi(prix),
    priceCurrency: "EUR",
    valueAddedTaxIncluded: ttc,
  });
  let offers: Objet | undefined;
  if (vendues.length === 1) {
    const v = vendues[0]!;
    offers = {
      "@type": "Offer",
      url,
      price: arrondi(v.prixTtc),
      priceCurrency: "EUR",
      priceSpecification: [specification(v.prixTtc, true), specification(v.prixHt, false)],
      availability: DISPONIBILITE[v.disponibilite],
      seller: vendeur,
    };
  } else if (vendues.length > 1) {
    const prix = vendues.map((v) => v.prixTtc);
    const meilleure = (["en_stock", "sur_commande", "rupture"] as const).find((d) => vendues.some((v) => v.disponibilite === d))!;
    offers = {
      "@type": "AggregateOffer",
      url,
      lowPrice: arrondi(Math.min(...prix)),
      highPrice: arrondi(Math.max(...prix)),
      offerCount: vendues.length,
      priceCurrency: "EUR",
      priceSpecification: { "@type": "PriceSpecification", priceCurrency: "EUR", valueAddedTaxIncluded: true },
      availability: DISPONIBILITE[meilleure],
      seller: vendeur,
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nom,
    sku: p.reference,
    url,
    image: p.images.map((i) => absolue(origine, i)),
    ...(p.description ? { description: p.description } : {}),
    ...(p.marque ? { brand: { "@type": "Brand", name: p.marque } } : {}),
    ...(offers ? { offers } : {}),
  };
}

export type EtapeStructuree = { libelle: string; href?: string };

/** Fil d'Ariane : mêmes étapes que le fil affiché ; « Accueil » en tête. */
export function filAriane(origine: string, etapes: EtapeStructuree[]): Objet {
  const toutes = [{ libelle: "Accueil", href: "/" }, ...etapes];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: toutes.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.libelle,
      ...(i < toutes.length - 1 && e.href ? { item: absolue(origine, e.href) } : {}),
    })),
  };
}

/** Texte brut à partir d'un Markdown simple (réponses de FAQ). */
export function texteBrut(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function faq(questions: { question: string; reponse: string }[]): Objet {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: texteBrut(q.reponse) },
    })),
  };
}
