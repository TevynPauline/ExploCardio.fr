# Inventaire des prix montrés au client (F22, T001)

Relevé le 2026-11-09. « Prix » = composant `src/ui/catalogue/Prix.tsx` ; « prixTexte » =
formateur `src/domaine/catalogue/prix.ts`.

| Écran ou email | Fichier | Rendu F22 |
|---|---|---|
| Cartes de rubrique (FR-007) | `src/ui/catalogue/CarteProduit.tsx` | Prix « à partir de » |
| Méga-menu, produits phares | `src/ui/en-tete/MegaMenu.tsx` | prixTexte « à partir de » |
| Suggestions de recherche | `src/ui/en-tete/Recherche.tsx` | Prix |
| Page de résultats | `app/(public)/recherche/page.tsx` | Prix |
| Fiche : configurations (FR-008) | `src/ui/catalogue/OngletsFiche.tsx`, `SelecteurFormule.tsx` | Prix (grand) ; prix public en prixTexte |
| Fiche : consommables, paliers, total | `src/ui/catalogue/ChoixConditionnement.tsx` | Prix, prixTexte |
| Fiche : promotions | `src/ui/fidelite/PromotionsFiche.tsx` | TTC barré, TTC remisé, HT |
| Ajout au panier : prix changé | `src/ui/catalogue/AjoutPanier.tsx` | prixTexte |
| Mise à disposition, financement (FR-009) | `SelecteurFormule.tsx`, `app/(public)/mise-a-disposition/page.tsx`, `src/ui/financement/FormulaireFinancement.tsx` | Prix « / mois » ; TTC puis HT |
| Tarifs des services | `src/ui/catalogue/TarifService.tsx` | Prix |
| Panier : lignes, franco (FR-010) | `src/ui/commande/LignePanier.tsx`, `app/(public)/panier/page.tsx` | Prix ; prixTexte |
| Totaux (FR-011) | `src/ui/commande/Totaux.tsx` | détail HT, TVA, « Total TTC à payer » |
| Livraison | `app/(public)/commande/livraison/page.tsx` | prixTexte |
| Récapitulatif, confirmation | `app/(public)/commande/recapitulatif/page.tsx`, `confirmation/[ref]/page.tsx` | Prix ; TTC puis HT |
| Mon compte (FR-013) | `app/(public)/mon-compte/{commandes,commandes/[ref],devis,factures,locations,logiciels,financements}` | Prix (montants lus) ; prixTexte |
| Emails (FR-014) | `src/emails/modeles-{commandes,locations,emailing}.tsx` | prixTexte ; textes par défaut TTC puis HT |
| Données structurées (FR-015) | `src/lib/referencement/schema.ts` | F21 (commit `457c564`) |

Inchangés : factures et devis PDF fictifs (`src/connecteurs/odoo/demo/factures-pdf.ts`,
`devis-enregistres.ts`) ; bons d'achat, gains, droits d'assistance (`src/ui/fidelite/BonsAchat.tsx`,
`Gains.tsx`, `modeles-fidelite.tsx`, `mon-compte/bons-achat`, `mon-compte/assistance`,
`mon-compte/donnees`) ; écran de paiement de démonstration (simule Stripe, montant TTC) ;
back-office (HT, aide TTC sur l'écran des prix de démonstration).

Montants débités déjà donnés en TTC seul dans les emails (remboursement, échéance prélevée,
prélèvement ponctuel) : inchangés, ce sont les sommes réellement prélevées.
