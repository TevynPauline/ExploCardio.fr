# Modèle de données — F05 Mise à disposition Express

Deux bases, comme depuis F11 : la **base fictive d'Odoo** (phase 1) porte les données de
gestion (parc, locations, échéances, kits, règles) ; la **base du site** ne garde que l'état
du parcours, les paramètres de fonctionnement et le suivi des notifications.

## 1. Base fictive d'Odoo — changements

### Abonnement (`sale_subscription`) — location

| Champ | Changement |
|---|---|
| `etat` | `commandee`, `en_cours`, `resiliation_prevue`, `en_retard_retour`, `suspendue_impaye`, `terminee`, `annulee` (les anciens `termine` → `terminee`) |
| `dateLivraison` | **Ajout** : date annoncée au client ; la location commence à cette date (FR-002) |
| `debut` | Date de livraison effective (sinon date annoncée) |
| `prochaineEcheance` | Même jour chaque mois à partir du début |
| `fin` | Terme du mois payé, fixé à la résiliation |
| `dateLimiteRetour` | **Ajout** : fin + délai de retour (jours ouvrés, règle d'Odoo) |
| `commandeId` | **Ajout** : commande de vente d'origine (kit, premier mois) |
| `expeditionBloquee` | **Ajout** : vrai tant que le compte du client n'est pas validé (FR-009) |
| `transporteur`, `suivi` | **Ajout** : expédition de l'appareil |
| `impayeDepuis` | **Ajout** : premier prélèvement échoué non régularisé |
| `tentativesPrelevement` | **Ajout** : nouvelles tentatives effectuées |
| `rappelsRetour` | **Ajout** : nombre de rappels de retour envoyés (lu par le site) |
| `etatRetour` | **Ajout** : `complet`, `degrade`, `perdu` ; `montantDegradationCentimes` |
| `modifieLe` | **Ajout** : relève des changements par le site |

Transitions : `commandee` → `en_cours` (livraison) → `resiliation_prevue` (résiliation ;
retour à `en_cours` par « Prolonger » avant la fin) → `en_retard_retour` (fin atteinte, appareil
non rendu) → `terminee` (retour enregistré). `en_cours` → `suspendue_impaye` (impayé au terme)
→ `en_cours` (régularisation) ou `en_retard_retour`. `commandee` → `annulee` (refus du compte,
annulation avant expédition).

### Appareil du parc (`stock_lot`)

Inchangé (`disponible`, `loue`, `en_retour`, `en_maintenance`) ; **ajout** `historique`
(JSON : affectations, retours, interventions). La réservation ne prend qu'un appareil
`disponible` par mise à jour conditionnelle (SC-005).

### Kit possédé (`res_partner_kit`) — **nouveau**

| Champ | Règles |
|---|---|
| `partenaireId`, `kitDefaultCode` | Unique par couple |
| `origine` | `achat` (commande payée) ou `enregistrement` (équipe) |
| `commandeId` | Si achat ; un kit remboursé n'est plus possédé |
| `creeLe`, `auteur` | Traçabilité (FR-041) |

### Règles de location (`rental_settings`) — **nouveau**, une ligne

`tentativesPrelevement` (3), `espacementTentativesJours` (3), `delaiRegularisationJours`
(10), `delaiRetourJoursOuvres` (5), `toleranceRetardJours` (5), `delaiNonRetourJours` (30).
Modifiables dans **Démonstration → Paramètres commerciaux** (principe VI).

## 2. Base du site — changements

### Commande du site (`CommandeSite`, F04)

| Champ | Changement |
|---|---|
| `datesLivraisonMad` | **Ajout** (JSON) : date de livraison choisie par ligne de mise à disposition |
| `conditionsLocationAccepteesLe` | **Ajout** : acceptation des conditions de location (FR-011) |

### Suivi des locations (`SuiviLocation`) — **nouveau**

| Champ | Règles |
|---|---|
| `abonnementRef` | Identifiant |
| `dernierEtat`, `rappelsRetourNotifies`, `echeanceRappeleeLe` | Un seul email par changement |
| `droitCloudRef` | Accès ouvert via le connecteur PCA |
| `notifieLe` | Date du dernier traitement |

### Paramètres du site (`Parametre`) — nouvelles clés

`livraison.jours_non_livres` (liste de dates), `livraison.zones_sans_lendemain` (préfixes de
codes postaux, `20` par défaut), `livraison.delai_zones_jours` (2),
`location.rappel_echeance_jours` (3), `location.rappel_retour_jours` (2). L'heure limite
`commande.heure_limite_express` (F04) est partagée.

Chaque action (commande, résiliation, prolongation, affectation, réception de retour,
suspension) est inscrite au journal (`journal_action`, FR-041).
