# Plan des lots 2 et 3 — Clients et commandes dans Odoo

**Date** : 2026-11-18 | **Spec** : [spec.md](spec.md) (US3, US4) | **Lot 1** : [plan.md](plan.md)

**Objectif** : préparer la recette Stripe. Le site doit créer et lire dans Odoo les fiches
clients, les opportunités, les commandes (carte et virement), les devis enregistrés et les
remboursements. Ces opérations remplacent, en mode réel, les domaines `clients`,
`opportunites`, `commandes` et les écritures du domaine `stock`, qui lèvent aujourd'hui
`ConfigurationIncomplete`.

**Hors périmètre** : location mensuelle et prélèvement SEPA, factures dans « Mon compte »,
relances (lot 4) ; fidélité (lot 5, masquée à l'ouverture).

## État de la copie v2, lu le 2026-11-18 (lecture seule)

| Sujet | Constat | Effet |
|---|---|---|
| Neutralisation | `database.is_neutralized = True` | écritures permises en recette (garde R8) |
| SIRET | `l10n_fr_siret` n'est pas stocké : il est calculé à partir de `additional_identifiers` (JSON) | recherche par SIRET côté site sur les fiches principales lues ; écriture par `l10n_fr_siret` vérifiée sur la copie |
| RPPS | aucun champ | noté dans les notes internes de la fiche (`RPPS 10…`) ; le champ « Référence » reste à Régis |
| Société | `is_company` est calculé par Odoo 20 (fiche avec n° de TVA), non modifiable | le site ne s'en sert pas : fiche principale = fiche sans parent |
| Blocage | pas de champ « avertissement » ; `trust` (bon, normal, mauvais payeur), `credit_limit` | « mauvais payeur » = client bloqué |
| Numérotation | commandes et devis `D202611-0001` ; commande confirmée renommée `C…` (réglage de Régis, F2026) | le site garde l'identifiant technique, pas le numéro |
| Conditions de paiement | « Paiement à la commande » (id 11) existe | appliquée aux commandes du site |
| Journaux | `Sales`, `Bank` ; **aucun journal « Carte »** | **à créer par Régis** (question 1) |
| Produit de port | **aucun** produit « Livraison » ; seuls `Port20%` (port à la réception, achats), `IMP`, `Log` | **à créer par Régis** (question 2) |
| Expédition | ni transporteur ni numéro de suivi (module Livraison absent) | question 3 |
| CRM | équipe « Sales », étapes New → Won, aucune étiquette | opportunité dans « New », étiquette « Site » créée par le site |
| Promotions | module `sale_loyalty` installé, aucun programme lu | question 4 |
| Paiements en ligne | fournisseur « Stripe » d'Odoo non configuré | non utilisé : Stripe est piloté par le site (F24) |

## Décisions

### D1 — Une seule trace des écritures, dans la base du site

Table `EcritureOdoo` (base du site) : `cle` (unique), `operation`, `base` (nom de la base
Odoo), `resultat` (JSON), dates. Toute écriture commence par chercher sa clé : si elle existe
**pour la même base**, le résultat est renvoyé tel quel (FR-011). En plus, chaque commande
porte sa clé dans « Référence client » (`client_order_ref`) : si la ligne de la table manque
(coupure entre l'écriture Odoo et l'enregistrement), la commande est retrouvée dans Odoo par
cette référence. La colonne `base` évite de réutiliser à l'ouverture les liens créés sur la
copie (cas limite « Bascule vers la base réelle »).

### D2 — Fiche client (lot 2)

- Référence côté site : `P` + identifiant Odoo de la fiche (`P37`). À la bascule d'une base
  à l'autre, les références des comptes de recette ne sont plus valables.
- Une fiche principale (sans parent) au nom du cabinet, avec SIRET, adresse du cabinet,
  email, téléphone, pays France, langue `fr_FR`, RPPS dans les notes ; le médecin en contact
  rattaché si son nom diffère du cabinet. Sans cabinet : une fiche au nom du médecin.
- Adresses de livraison et de facturation : fiches enfants `type = delivery / invoice`,
  mises à jour en place.
- **Recherche avant création**, dans cet ordre : clé déjà vue (D1) → SIRET → email (fiche
  principale du contact trouvé). **Plusieurs fiches actives pour le même SIRET** (ou le même
  email) : le site ne choisit pas ; il lève `OperationRefusee` (`siret_en_double`) et la
  création de la fiche reste en file d'attente jusqu'à ce que l'équipe fusionne ou archive
  la fiche en trop (cas limite de la spec ; le rapport de contrôle signale ces doublons).
- Fiche archivée trouvée : réactivée, puis reliée.
- `mettreAJourCoordonnees` : écrit nom, email, téléphone, cabinet et adresses ; jamais SIRET
  ni RPPS.
- `lireSituation` : fiche, commandes récentes (lot 3). Factures et locations : listes vides
  jusqu'au lot 4. Droits d'assistance : « sans droits » (fidélité masquée).
- `archiverPartenaire` : `active = false` (Odoo garde ses factures) ; sans effet si déjà
  archivée.
- Blocage : à traiter au lot 3 (`trust = bad` lu avant la commande).

### D3 — Opportunités (lot 2)

`crm.lead` de type « opportunity », équipe « Sales », étape « New », étiquette « Site » ;
titre « Demande de devis — Cabinet X » ou « Demande de financement — … » ; contenu de la
demande en notes (texte simple, sans donnée patient) ; reliée à la fiche client si elle
existe, sinon nom, email et téléphone saisis. Idempotente par clé (D1).

### D4 — Calcul du devis : par le site, à partir des données d'Odoo (lot 3)

Odoo n'offre aucune méthode publique de calcul de prix (R5), et créer un devis brouillon à
chaque affichage du panier écrirait dans Odoo à chaque visite. Le site calcule donc
`calculerDevis` avec les seules données lues dans Odoo :

- prix client et paliers : module de prix du lot 1 (`real/prix.ts`) ;
- TVA : taxes de vente de la variante ;
- port : prix du produit « Livraison » (question 2), franco au-delà du seuil
  (question 2) ; produits volumineux : propriétés « Frais de livraison HT » et « Frais
  d'installation HT » sur la variante (réponse de Régis du 2026-11-08 : exception ULKE) ;
- un seul mode de livraison (standard), l'express ayant été retiré (F18 lot C) ;
- promotions et codes promo : selon la question 4 ;
- bons d'achat : aucun (fidélité masquée).

**À la création de la commande, Odoo recalcule** (les lignes sont envoyées sans prix
unitaire, sauf lignes offertes à 0 €). Si le total TTC d'Odoo diffère du montant payé, la
commande est créée quand même (le paiement est fait) et l'écart est inscrit au journal des
connecteurs et signalé à l'équipe par email.

### D5 — Réservation de stock (lot 3)

`reserver` vérifie la quantité libre (`free_qty`) des articles stockés et enregistre la
réservation dans la base du site (clé, lignes, expiration 30 min) ; `OutOfStock` si un
article sans délai de réassort manque. La vraie réservation se fait dans Odoo à la
confirmation de la commande (bon de livraison réservé). Le risque restant (deux médecins qui
paient le dernier article dans la même minute) est accepté : la commande est créée, le bon
de livraison reste « en attente » et l'équipe le voit dans Odoo.

### D6 — Commandes (lot 3)

- `creerCommandePayee` : recherche par `client_order_ref` = clé ; sinon création du devis
  (client, adresses, condition « Paiement à la commande », origine « Site explocardio.fr »,
  lignes, ligne « Livraison »), puis **confirmation** (`action_confirm`), puis
  **enregistrement du paiement** dans le journal « Carte » (question 1), avec la référence
  Stripe en mémo.
- `creerCommandeVirement` : même création, confirmée, **sans paiement** ; échéance = date
  du jour + délai du site (inchangé, F04). `annulerCommandeEnAttente` : `action_cancel`
  (stock libéré par Odoo).
- Le virement reçu est saisi par Régis dans Odoo (paiement sur la commande ou sa facture) ;
  la tâche quotidienne existante le détecte (`traiterVirements`).
- États lus : brouillon ou envoyé → devis ; annulé → `annulee` ; confirmée sans paiement
  → `en_attente_paiement` ; payée et bon de livraison prêt → `en_preparation` ; expédiée →
  `expediee` (selon la question 3) ; livrée (`delivery_status = full`) → `livree` ; avoirs
  → `remboursee_partiellement` / `remboursee`.
- `listerChangements` : commandes et bons de livraison modifiés depuis la date
  (`write_date`), lus toutes les 5 minutes par la tâche existante (≤ 15 min, FR-020).

### D7 — Devis enregistrés et documents (lot 3)

Un devis enregistré est un devis Odoo (état « envoyé »), avec sa validité
(`validity_date`). Le PDF vient d'Odoo par son **lien de portail** (`access_token`), lu par
le serveur du site : c'est le document QWeb personnalisé de Régis (devis, pro forma).

### D8 — Remboursements (lot 3)

Le remboursement est décidé dans Odoo par un **avoir** sur la facture de la commande, ce
qui suppose une facture : la commande payée par carte est **facturée à la commande**
(question 5). `listerRemboursementsAExecuter` lit les avoirs validés non réglés des commandes
du site ; le site rembourse par Stripe, puis enregistre le paiement sortant sur l'avoir
(`enregistrerRemboursement`). Un remboursement fait directement dans Stripe crée l'avoir
dans Odoo.

### D9 — Garde-fous

Garde de neutralisation (R8) avant chaque écriture ; refus des données fictives (FR-004) ;
aucune donnée de carte ni de patient envoyée (FR-007) ; journal des connecteurs sans clé
(FR-008).

## Questions pour Régis

1. **Journal « Carte »** : créer un journal de banque « Carte (Stripe) » dans lequel le
   site enregistre les paiements par carte ? Les virements Stripe vers le compte bancaire
   seront rapprochés depuis ce journal.
2. **Produit « Livraison »** : créer un service « Livraison », référence `LIVRAISON`, au
   prix du forfait HT, TVA 20 %. Quel **seuil de franco** HT ? (proposition : propriété
   « Seuil de franco HT » sur ce produit, pour qu'il le règle lui-même dans Odoo.)
3. **Expédition** : comment indiquera-t-il le transporteur et le numéro de suivi ?
   Proposition : installer le module « Livraison » d'Odoo (gratuit, champ « numéro de
   suivi » sur le bon de livraison), ou bien les écrire dans la note du bon de livraison.
4. **Promotions et codes promo à l'ouverture** : les gérer dans Odoo (programmes de
   « Promotions et fidélité »), ou ouvrir sans codes promo ni promotions automatiques, comme
   pour la fidélité ? Proposition : ouvrir sans, les brancher ensuite.
5. **Facturation des commandes du site** : facture créée et réglée **dès le paiement**
   (proposition : nécessaire pour les remboursements par avoir, et le médecin a sa facture
   tout de suite), ou à la livraison ? Question déjà ouverte côté rapports Odoo.

## Tâches

### Lot 2 — Clients et opportunités

- [X] L2-01 Table `EcritureOdoo` (D1) : migration de la base du site, module
  `src/connecteurs/odoo/real/ecritures.ts` (chercher, enregistrer, par base) et tests
- [X] L2-02 Faux Odoo des tests étendu aux écritures (`create`, `write`, `=ilike`,
  archivées) dans `tests/unit/odoo-reel/faux-odoo.ts` ; fiches de test écrites à la main
  (aucune donnée de la copie), champs vérifiés sur la copie en lecture
- [X] L2-03 Tests `tests/unit/odoo-reel/clients.test.ts` : création, retrouvée par
  clé / SIRET / RPPS / email, SIRET en double → `Conflict`, fiche archivée réactivée,
  mise à jour des adresses, archivage idempotent, `NotFound`, blocage `trust = bad`
- [X] L2-04 `src/connecteurs/odoo/real/clients.ts` (D2)
- [X] L2-05 Tests et `src/connecteurs/odoo/real/opportunites.ts` (D3)
- [X] L2-06 Brancher les deux domaines dans `real/index.ts` ; rapport de contrôle : SIRET
  en double, fiche sans SIRET
- [X] L2-07 Vérification sur la copie : trois inscriptions de test (client existant, nouveau,
  archivé) puis une demande de devis ; aucun doublon dans Odoo (2026-11-18 : fiche existante
  retrouvée par SIRET, nouvelle fiche créée puis retrouvée avec une autre clé, fiche archivée
  réactivée, opportunité « Nouveau » étiquetée « Site » ; fiches d'essai archivées ensuite)

### Lot 3 — Commandes

- [ ] L3-01 Lecture du produit « Livraison », du seuil de franco et des propriétés de frais
  (après réponse 2), avec tests ; ajout au rapport de contrôle (produit absent → bloquant)
- [ ] L3-02 Tests et `real/devis.ts` : `calculerDevis` (D4), mêmes formes que la
  démonstration ; tests de contrat de devis rejoués sur le faux Odoo
- [ ] L3-03 Tests et réservations `reserver` / `liberer` (D5) dans `real/stock.ts`
- [ ] L3-04 Tests et `real/commandes.ts` : création payée (idempotente par
  `client_order_ref`), virement, annulation, lecture, liste, états (D6), écart de montant
  signalé
- [ ] L3-05 Paiement enregistré dans le journal « Carte » et facture à la commande (après
  réponses 1 et 5)
- [ ] L3-06 `listerChangements` (D6) avec transporteur et suivi (après réponse 3)
- [ ] L3-07 Devis enregistrés et PDF par le lien de portail (D7)
- [ ] L3-08 Remboursements par avoir (D8)
- [ ] L3-09 Vérification sur la copie : 20 commandes de test dont des créations
  interrompues puis relancées (SC-004), virement annulé, devis puis commande, remboursement
- [ ] L3-10 Fiche « brancher Stripe sur le site de recette » dans
  `docs/deploiement-scalingo.md` (clés de test, webhook, changement de base Odoo), puis
  quickstart de F24 (T035) avec Pauline et Régis

### Ordre

L2-01 et L2-02 d'abord ; lot 2 avant lot 3 (une commande a besoin d'une fiche client).
L3-01, L3-05 et L3-06 attendent les réponses de Régis ; le reste avance sans elles.
