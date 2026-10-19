# Contrats des connecteurs — ajouts de F05

Chaque opération ajoutée l'est aux deux modes (démonstration et réel) avec des **tests de
contrat communs** (`tests/contract/`). Erreurs normalisées de F11 (`NotFound`, `OutOfStock`,
`ServiceUnavailable`, `ValeurRefusee`). Toute écriture prend une **clé d'idempotence**.

## Odoo — stock et parc (§2)

| Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `stock.premiereDateParc` | article, date souhaitée | première date où un appareil est disponible (retours prévus compris), ou `null` | `ServiceUnavailable` |
| `stock.reserverAppareil` | article, date de livraison, clé | réservation (appareil retiré du « disponible ») ; idempotent | `OutOfStock` |
| `stock.libererAppareil` | clé | — (sans effet si consommée ou déjà libérée) | — |

## Odoo — location et abonnements (§6)

| Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `location.creerAbonnement` (complétée) | + `dateLivraison`, `commandeRef`, `expeditionBloquee`, `reservationCle` | référence ; la réservation est consommée (appareil `loue`) | `OutOfStock` si aucune réservation ni appareil disponible |
| `location.resilier` (complétée) | abonnement, date de la demande | date de fin, date limite de retour | `NotFound`, `ValeurRefusee` (déjà terminée) |
| `location.annulerResiliation` | abonnement | — | `ValeurRefusee` si la fin est atteinte |
| `location.listerLocations` (complétée) | partenaire | + état étendu, date de livraison, date limite de retour, suivi, numéro de série (après expédition) | — |
| `location.listerChangements` | depuis | locations modifiées (état, appareil, suivi, impayé, rappels, retour) | — |
| `location.etiquetteRetour` | abonnement | PDF (« FICTIF » en démonstration) | `ValeurRefusee` si pas de résiliation |
| `location.debloquerExpedition` | partenaire | locations débloquées | — |
| `location.annulerCommande` | abonnement, motif, clé | montants à rembourser (premier mois, kit) | `ValeurRefusee` si expédiée |
| `location.kitsPossedes` | partenaire | codes des kits possédés | — |

## Odoo — opérations réservées au mode démonstration

`preparerExpedition(abonnement, appareil?, transporteur, suivi)`,
`signalerAppareilDefectueux(abonnement)` (autre appareil affecté, ou location en attente du
choix du client : reporter ou annuler), `colisNonLivre(abonnement)`,
`marquerLivree(abonnement, date)`, `enregistrerRetour(abonnement, état, dégradation)`,
`enregistrerKit(partenaire, kit)`, `echouerPrelevement(abonnement)`,
`regulariser(abonnement)`, `executerActionsPlanifiees(date)` (échéances atteintes, impayés
au terme, retards de retour, facturation du mois suivant ou de la valeur de remplacement).
Toutes journalisées et absentes en mode réel (équivalents : écrans et actions planifiées
d'Odoo).

## Stripe

| Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `ouvrirSessionAbonnement` (complétée) | + un **élément par location** (référence, montant du premier mois, montant mensuel) | — | — |
| `retirerElementAbonnement` | abonnement de paiement, élément (location), date d'effet, clé | — ; les prélèvements mensuels de l'élément s'arrêtent ; **l'autorisation reste valable** | `NotFound` |
| `preleverPonctuel` | abonnement de paiement, montant TTC, libellé, clé (facture d'Odoo) | référence du paiement ; résultat par événement (`paiement_reussi` / `paiement_refuse`) | `NotFound`, `ValeurRefusee` (autorisation révoquée) |
| `libererAutorisation` | abonnement de paiement | — (après retour et règlement des sommes dues) | — |
| `rembourser` | (existant, F04) | | |

Événements utilisés : `echeance_payee` (F04), `echeance_refusee` (nouveau traitement).

## PCA (F11, inchangé)

`ouvrirDroit` à l'expédition, `fermer` à la date de fin, `suspendre` à l'impayé au terme,
`retablir` à la régularisation. Logiciel transmis : celui du pack de l'appareil ; aucune
donnée de patient.

## Emailing

Modèles transactionnels ajoutés : `location_commandee`, `location_expediee` (suivi, contact
pour la formation, WhatsApp), `location_rappel_echeance`, `location_prelevement_echoue`,
`location_suspendue`, `location_resiliee` (fin, date limite, étiquette), `location_prolongee`,
`location_appareil_defectueux` (reporter ou annuler), `location_prelevement_ponctuel`,
`location_rappel_retour`, `location_retour_recu` (et dégradation), `location_date_recalculee`,
`location_annulee_remboursee`. Notifications équipe : validation prioritaire, formation à
organiser, accès Cloud à ouvrir ou fermer (sous-mode manuel), impayé suspendu, colis non
livré.
