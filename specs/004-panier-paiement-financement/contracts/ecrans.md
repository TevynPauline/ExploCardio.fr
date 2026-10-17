# Contrat des écrans — F04

## Pages publiques et « Mon compte »

| Adresse | Contenu | Exigences |
|---|---|---|
| `/panier` | Blocs « Paiement unique » et « Abonnement mensuel », quantités, suppression, code promo, bons d'achat (après F06), changements signalés, « Commander », « Demander un financement » | FR-001 à FR-007, US1 |
| `/commande/adresses` | Livraison (métropole) et facturation préremplies | FR-008, FR-009 |
| `/commande/livraison` | Modes, forfaits, délais, franco, frais des équipements volumineux | FR-010, FR-011, FR-046 |
| `/commande/paiement` | Carte (Visa, Mastercard, American Express), virement (achats seulement), carte ou SEPA pour l'abonnement | FR-015 à FR-019 |
| `/commande/recapitulatif` | Articles, adresses, livraison, paiement, montants, cadeau à 0 €, CGV à cocher, « Payer » | FR-012, FR-014 |
| `/commande/retour` | Retour de la page de paiement : « paiement en cours de confirmation », refus (motif, réessayer), suite vers l'abonnement d'un panier mixte | US3 |
| `/commande/confirmation/[ref]` | Confirmation, RIB et référence pour un virement | FR-013, FR-017 |
| `/financement/demande` | Formulaire (équipements, durée, coordonnées, cabinet, mensualité indicative) ; depuis une fiche (`?ref=`) ou le panier (`?depuis=panier`) | FR-033 à FR-037 |
| `/mon-compte/commandes` et `/mon-compte/commandes/[ref]` | Commandes, statut, transporteur et suivi, factures et avoirs ; reprise d'un abonnement non payé | US7, US5-4 |
| `/mon-compte/factures` | Factures et avoirs (PDF) | FR-028, FR-030 |
| `/mon-compte/factures/[numero]/pdf` | PDF lu dans Odoo, servi au seul titulaire | FR-028 |
| `/mon-compte/locations` | Mises à disposition souscrites (complété par F05) | US5-3 |
| `/mon-compte/financements` | Demandes et statuts | FR-036 |

Repère de progression du tunnel : liste ordonnée, étape courante annoncée
(`aria-current="step"`) ; chaque étape revient à la précédente sans perte de saisie.

## Back-office

| Adresse | Rôle | Contenu |
|---|---|---|
| `/admin/financements` | admin, commercial | Demandes par statut ; fiche : équipements, cabinet, mensualité, statut, notes internes, journal, « Créer la commande financée » |
| `/admin/commandes` | admin, commercial, support (lecture) | Commandes lues dans Odoo, lecture seule (FR-039) ; anomalies « payée, à enregistrer » |
| `/admin/demonstration/paiements` | admin (démonstration) | + Virement reçu, Marquer expédiée / livrée, Décider un remboursement |
| `/admin/contenus/coordonnees` | admin | + Heure limite express, coordonnées bancaires du virement |
