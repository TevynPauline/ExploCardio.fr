"use client";

import { usePathname } from "next/navigation";
import { FilAriane, type EtapeFil } from "../FilAriane";

// Fil d'Ariane de Mon compte (F16, FR-003) : déduit de l'adresse, les rubriques étant connues.

const RUBRIQUES: Record<string, string> = {
  informations: "Informations",
  adresses: "Adresses",
  preferences: "Préférences",
  securite: "Sécurité",
  donnees: "Mes données",
  commandes: "Commandes",
  factures: "Factures",
  locations: "Locations",
  logiciels: "Mes logiciels Cloud",
  "bons-achat": "Bons d’achat",
  assistance: "Assistance",
  financements: "Financements",
  devis: "Devis",
  "confirmer-email": "Confirmer l’adresse",
};

export function FilMonCompte() {
  const morceaux = (usePathname() ?? "/mon-compte").split("/").filter(Boolean).slice(1);
  const etapes: EtapeFil[] = [{ libelle: "Mon compte", href: "/mon-compte" }];
  const [rubrique, detail] = morceaux;
  if (rubrique) etapes.push({ libelle: RUBRIQUES[rubrique] ?? rubrique, href: `/mon-compte/${rubrique}` });
  if (detail) etapes.push({ libelle: rubrique === "commandes" ? `Commande ${decodeURIComponent(detail)}` : rubrique === "locations" ? "Résiliation" : decodeURIComponent(detail) });
  // La dernière étape est la page courante, sans lien.
  const derniere = etapes[etapes.length - 1]!;
  etapes[etapes.length - 1] = { libelle: derniere.libelle };
  return <FilAriane etapes={etapes} />;
}
