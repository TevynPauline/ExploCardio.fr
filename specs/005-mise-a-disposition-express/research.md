# Recherche et décisions techniques — F05 Mise à disposition Express

Toutes les décisions s'appuient sur l'existant de F03 (offre de mise à disposition, kit requis,
disponibilité du parc), F04 (panier mixte, tunnel, paiement du premier mois, prélèvement
mensuel, suivi des commandes toutes les 5 minutes) et F11 (connecteurs Odoo, Stripe, PCA et
emailing en démonstration). **Aucune nouvelle technologie.**

## R1. Parcours : le panier et le tunnel de F04, complétés

- **Decision** : une mise à disposition se commande par le panier et le tunnel de F04. F05
  ajoute : (a) le **kit d'accessoires ajouté d'office** au panier quand le client ne le
  possède pas (ligne d'achat marquée « obligatoire », non supprimable tant que la location est
  au panier) ; (b) à l'étape « Livraison », le **choix de la date de livraison** de la mise à
  disposition parmi les jours ouvrés possibles ; (c) au récapitulatif, le contenu du pack, la
  date de la prochaine échéance, la valeur de remplacement et les **conditions de location**
  à accepter (en plus des CGV).
- **Rationale** : FR-010 impose le tunnel de F04 ; un parcours parallèle dupliquerait le
  paiement et ses garanties (une seule commande par paiement).
- **Alternatives** : tunnel dédié « Dépannage express » (rejeté : double maintenance du
  paiement).

## R2. Médecin sans compte (US2)

- **Decision** : le panier d'un visiteur est conservé par son cookie (F03) et rejoint son
  compte à la connexion (F04). Au moment de commander, le visiteur est envoyé vers
  l'inscription ou la connexion **avec retour vers le tunnel** (`?retour=/commande/adresses`) ;
  après confirmation de l'email, il reprend au même point, choix intacts. Un compte en attente
  de validation peut payer une mise à disposition et son kit (règle déjà posée par F04,
  `peutCommander` avec `miseADispositionExpress`).
- **Rationale** : réutilise F02 et F04 ; rien n'est ressaisi.

## R3. Date de livraison

- **Decision** : calcul **dans le site** (fonction pure, testée) à partir de : l'heure de
  Paris, l'**heure limite** (paramètre du back-office, partagée avec la livraison express de
  F04), les **week-ends**, les **jours fériés français** (calculés, Pâques compris) et les
  **jours non livrés** saisis au back-office ; le **code postal** (Corse et zones listées au
  back-office : délai supplémentaire paramétrable, pas de promesse de lendemain) ; la
  **première date où un appareil du parc est disponible**, lue dans Odoo (opération du
  contrat « Lire la disponibilité du parc », déjà prévue par F11, à implémenter).
- La date choisie est enregistrée dans la commande du site et transmise à Odoo avec
  l'abonnement ; la location **commence à la date de livraison** (hypothèse confirmée), et
  les échéances tombent ensuite le même jour chaque mois.
- **Rationale** : les règles de calendrier sont des paramètres de fonctionnement du site
  (FR-007, FR-040) ; la disponibilité du parc reste la vérité d'Odoo.

## R4. Réservation de l'appareil et concurrence (SC-005)

- **Decision** : l'appareil est réservé dans Odoo **au paiement** (comme le stock dans F04),
  dans une transaction qui ne prend qu'un appareil encore « disponible » (mise à jour
  conditionnelle) : deux commandes simultanées ne peuvent pas obtenir le même appareil ; la
  seconde reçoit `OutOfStock` et voit la date suivante avant de payer. Le **numéro de série**
  n'est montré au client qu'à l'expédition (l'équipe peut changer d'appareil à la
  préparation, cas de l'appareil défectueux).
- **Alternatives** : réserver dès l'ajout au panier (rejeté : bloquerait le parc pour des
  paniers abandonnés).

## R5. Cycle de vie de la location

- **Decision** : états de la location dans Odoo : `commandee` → `en_cours` (livrée) →
  `resiliation_prevue` → `en_retard_retour` → `terminee` ; plus `suspendue_impaye` et
  `annulee`. Odoo les fait évoluer (équipe ou actions planifiées d'Odoo) ; le **site relève
  les changements toutes les 5 minutes** (même mécanique que le suivi de F04) et réagit une
  seule fois par changement : emails, accès Cloud (PCA), alertes à l'équipe, journal.
- En démonstration, les **actions planifiées d'Odoo** (échéance atteinte, impayé au terme,
  retard de retour, facturation du mois suivant ou de la valeur de remplacement) sont
  simulées par une opération réservée au mode démonstration, appelée par la tâche
  quotidienne et par l'écran de démonstration (« avancer jusqu'au… »).
- **Rationale** : les règles de facturation et leurs délais vivent dans Odoo (FR-039,
  FR-040) ; le site n'en duplique aucune.

## R6. Résiliation, prolongation, retour

- **Decision** : « Résilier » appelle Odoo (`location.resilier`), qui fixe la fin au terme du
  mois payé (ou du mois entamé si l'échéance est passée) et la **date limite de retour** (5
  jours ouvrés par défaut, réglable dans Odoo) ; le site arrête la part de prélèvement de
  cette location chez Stripe à la date de fin, programme la fermeture de l'accès Cloud (PCA)
  à la même date et envoie la confirmation avec les instructions de retour. « Prolonger »
  annule la résiliation tant que la fin n'est pas atteinte.
- **Étiquette de retour** : fournie par Odoo (le transporteur y est rattaché) sous forme de
  PDF ; en démonstration, PDF « FICTIF ». Elle peut être redemandée.
- **Prélèvement de plusieurs locations** : F04 crée un seul abonnement Stripe par commande.
  Chaque location y devient un **élément** ; résilier une location retire son élément à la
  date de fin, et l'abonnement s'arrête quand il n'en reste plus. Nouvelle opération du
  connecteur Stripe : retirer un élément d'abonnement. L'autorisation de prélèvement reste
  valable jusqu'à l'enregistrement du retour (FR-030).
- **Retour** : l'équipe enregistre la réception dans Odoo (état : disponible ou en
  maintenance, dégradation éventuelle avec son montant) ; la location passe « terminée », le
  client est prévenu (et de la dégradation facturée par Odoo, FR-047).

## R7. Kit d'accessoires (US5, SC-003)

- **Decision** : le **type d'appareil** est représenté par le kit requis (`kitRequis` de
  l'offre, F03). Odoo indique les kits possédés par un client : kits achetés (commandes
  payées, hors remboursés) et possessions enregistrées par l'équipe (nouvelle opération et
  nouvelle table fictive). Le site ajoute le kit au panier quand il manque, ne l'ajoute
  jamais deux fois (même avec deux locations du même type) et laisse le client racheter un
  kit volontairement (ajout normal depuis la fiche du kit).
- **Rationale** : la possession est une donnée de gestion (Odoo) ; la règle « jamais deux fois
  d'office » est appliquée au panier et revérifiée au récapitulatif.

## R8. Compte en attente de validation (FR-009, FR-044, FR-045)

- **Decision** : avant de payer, un message indique que l'expédition dépend de la
  vérification du compte. Après paiement : alerte « validation prioritaire » à l'équipe ; la
  commande Odoo porte « expédition bloquée » tant que le compte n'est pas validé. À la
  validation (F02) : déblocage ; si l'heure limite de la date annoncée est dépassée, la date
  est recalculée et le client prévenu. Au refus : commande et location annulées, premier mois
  et kit **intégralement remboursés** (Stripe), client prévenu.

## R9. Accès au logiciel Cloud (F12 pas encore livré)

- **Decision** : F05 appelle directement le **connecteur PCA** (F11) : ouverture du droit à
  l'expédition, fermeture programmée à la date de fin, suspension à l'impayé, rétablissement
  à la régularisation. Chaque action alerte l'équipe tant que la plateforme ne permet pas
  l'automatisation (sous-mode manuel du connecteur). Un échec du connecteur **ne bloque pas
  l'expédition** : alerte et rattrapage par la file d'attente. F12 reprendra la gestion
  détaillée des droits (« Mes logiciels Cloud »).

## R10. Rappels et paramètres

- **Site (back-office, FR-040)** : heure limite, jours non livrés, zones sans lendemain et
  délai supplémentaire, délai du rappel avant échéance (3 jours par défaut), fréquence des
  rappels de retour en retard (tous les 2 jours par défaut).
- **Odoo (base fictive, écran de démonstration)** : prix du premier mois et des suivants,
  kit, valeur de remplacement (déjà en place) ; nouvelles règles : nombre et espacement des
  nouvelles tentatives de prélèvement (3 sur 10 jours), délai de régularisation, date limite
  de retour (5 jours ouvrés), délai de tolérance avant facturation du mois suivant, délai de
  non-retour avant facturation de la valeur de remplacement.

## R11. Page « Dépannage express »

- **Decision** : `/mise-a-disposition` (lien déjà présent dans les menus et l'accueil)
  devient la page « Dépannage express » : équipements proposés en mise à disposition, prix
  du premier mois et des mois suivants (HT puis TTC), date de livraison la plus proche par
  équipement, bouton vers la fiche (formule déjà choisie) ou ajout direct au panier. Lecture
  mise en cache une minute au plus (SC-006).

## R12. Back-office et démonstration

- **Back-office du site** : « Locations » en lecture seule (en cours, commandées, impayés,
  retards de retour) pour toute l'équipe ; réglages de F05 dans **Contenus → Coordonnées et
  textes** (section « Livraison et mise à disposition »).
- **Écran de démonstration** (ce que l'équipe fera dans Odoo) : préparer et expédier une
  location (choix de l'appareil, suivi), marquer livrée, enregistrer un retour (état,
  dégradation), enregistrer un kit possédé, simuler un prélèvement échoué, avancer la date
  des actions planifiées.
