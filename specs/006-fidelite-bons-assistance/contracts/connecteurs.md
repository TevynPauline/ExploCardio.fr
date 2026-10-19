# Contrats — ajouts de F06

Ajouts au domaine « Fidélité » du connecteur Odoo (contracts/odoo.md §7), avec des **tests de
contrat communs** aux deux modes et un **jeu de commandes de référence** (FR-039, SC-013).

## Odoo — fidélité

| Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `lireCagnotte` (complétée) | partenaire | solde, lots ouverts (montant, fin de validité), prochaine expiration, mouvements (type, montant, date, commande, fin de validité, motif) | `NotFound` |
| `lireDroitsAssistance` (complétée) | partenaire | statut, fin, origine, historique (ouvertures, prolongations, retraits, ajustements) | `NotFound` |
| `estimerGains` (complétée) | partenaire, lignes | montant éligible, taux, bons, droits jusqu'au, seuil des droits, **manque pour le palier suivant** et son taux | — |
| `appliquerRegles` (complétée) | commande | mouvements créés ; règles figées au paiement ; lots consommés dans l'ordre ; restitution à la validité d'origine (+30 jours de grâce si expirée) | `NotFound` |
| `listerMouvementsDepuis` | date | mouvements et changements de droits de tous les clients | — |
| `lireReglesProgramme` | — | paliers, validité, seuil, durée, prolongation, plafond, prix de l'assistance à l'acte | — |
| `listerInterventions` | partenaire | interventions payées (état, dates, commande) | — |
| `promotionsEnCours` | date | promotions annonçables : nom, type, cible, remise, fin, prix d'origine et remisé HT par article | — |

## Odoo — opérations réservées au mode démonstration

`ajusterCagnotte(partenaire, montant, motif, auteur)`, `ajusterDroits(partenaire, fin, motif,
auteur)`, `cloreIntervention(intervention, auteur)`, `expirerBons(date)`,
`modifierReglesProgramme(…)`, `creerPromotion(…)` / `terminerPromotion(…)`. Journalisées,
absentes en mode réel.

## Odoo — commandes (F04, complétées)

- `calculerDevis` : limites d'usage des codes promo ; bons limités au montant éligible des
  achats ; part des bons détaillée.
- Création d'une commande payée contenant `EC-ASSISTANCE-ACTE` : intervention payée créée.
- Décision de remboursement : montant réduit des bons déjà dépensés à retirer, avec note.

## Emails

`fidelite_credit`, `fidelite_retrait`, `fidelite_restitution`, `droits_ouverts`,
`droits_prolonges`, `droits_rappel_fin`, `bons_rappel_expiration`, `intervention_cloturee`.
Notification équipe : bons déjà dépensés déduits d'un remboursement.

## Écrans

| Adresse | Accès | Contenu |
|---|---|---|
| `/mon-compte/bons-achat` | client | Solde, prochaine expiration, historique relié aux commandes |
| `/mon-compte/assistance` | client | Statut, fin, origine, comment prolonger ; sans droits : montant qui les ouvrirait et assistance à l'acte ; interventions payées |
| `/panier` (F04) | tous | Bons à utiliser (montant au choix), gains de la commande, manque pour le palier suivant |
| Fiches (F03) | tous | Gains de l'achat ; promotions en cours (prix d'origine, remisé, fin) |
| Bandeau (F01) | tous | Promotions en cours annoncées automatiquement |
| `/admin/assistance` | équipe | Recherche (nom, cabinet, email, téléphone, RPPS, SIRET) ; droits, fin, origine, interventions — lecture seule |
| `/admin/demonstration/parametres-commerciaux` | admin, démo | Règles, promotions, ajustements, clôture d'intervention, expiration à une date |
