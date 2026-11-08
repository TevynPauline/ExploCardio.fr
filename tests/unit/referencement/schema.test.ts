import { describe, expect, it } from "vitest";
import { faq, filAriane, organisation, produit } from "@/lib/referencement/schema";

const O = "https://www.explocardio.fr";

describe("organisation", () => {
  it("contient l'identité, l'adresse et le logo en adresse absolue", () => {
    const o = organisation(O, { email: "contact@explocardio.fr", telephone: null });
    expect(o).toMatchObject({ "@type": "Organization", name: "ExploCardio.fr", url: `${O}/`, logo: `${O}/marque/explocardio-fr-logo.png`, vatID: "FR46132194101", email: "contact@explocardio.fr" });
    expect(o.address).toMatchObject({ "@type": "PostalAddress", postalCode: "13710", addressLocality: "Fuveau", addressCountry: "FR" });
    expect(o).not.toHaveProperty("telephone");
  });
});

describe("produit", () => {
  const base = { nom: "DMS 300-4L", reference: "DMS-300-4L", marque: "DMS", images: ["/stockage/produits/a.webp"], chemin: "/holter-ecg/dms-300-4l" };

  it("une variante : Offer HT en euros", () => {
    const p = produit(O, { ...base, variantes: [{ prixHt: 1290.5, disponibilite: "en_stock" }] });
    expect(p.image).toEqual([`${O}/stockage/produits/a.webp`]);
    expect(p.brand).toEqual({ "@type": "Brand", name: "DMS" });
    expect(p.offers).toMatchObject({ "@type": "Offer", price: 1290.5, priceCurrency: "EUR", availability: "https://schema.org/InStock", priceSpecification: { valueAddedTaxIncluded: false } });
  });

  it("plusieurs variantes : AggregateOffer", () => {
    const p = produit(O, { ...base, variantes: [{ prixHt: 100, disponibilite: "rupture" }, { prixHt: 150, disponibilite: "sur_commande" }] });
    expect(p.offers).toMatchObject({ "@type": "AggregateOffer", lowPrice: 100, highPrice: 150, offerCount: 2, availability: "https://schema.org/BackOrder" });
  });

  it("sans prix public, ou prix nul : aucune offre", () => {
    expect(produit(O, { ...base, variantes: [] })).not.toHaveProperty("offers");
    expect(produit(O, { ...base, variantes: [{ prixHt: 0, disponibilite: "en_stock" }, { prixHt: null, disponibilite: "en_stock" }] })).not.toHaveProperty("offers");
  });
});

describe("filAriane", () => {
  it("positions à partir de 1, adresse absolue sauf pour la dernière étape", () => {
    const f = filAriane(O, [{ libelle: "Holter ECG", href: "/holter-ecg" }, { libelle: "DMS 300-4L" }]);
    expect(f.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${O}/` },
      { "@type": "ListItem", position: 2, name: "Holter ECG", item: `${O}/holter-ecg` },
      { "@type": "ListItem", position: 3, name: "DMS 300-4L" },
    ]);
  });
});

describe("faq", () => {
  it("réponse en texte brut", () => {
    const f = faq([{ question: "Comment poser ?", reponse: "Voir **le guide** [ici](/aide/x)." }]);
    expect(f.mainEntity).toEqual([{ "@type": "Question", name: "Comment poser ?", acceptedAnswer: { "@type": "Answer", text: "Voir le guide ici." } }]);
  });
});
