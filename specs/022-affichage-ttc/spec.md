# Feature Specification: F22 — Affichage des prix TTC

**Feature Branch**: `022-affichage-ttc`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "F22 — Affichage TTC des prix. Décision de Pauline du 2026-11-08, après les remarques de Régis (la plupart des cardiologues libéraux ne récupèrent pas la TVA) ; constitution 2.3.0, principe II amendé. Inverser la hiérarchie partout où un prix est montré au médecin : TTC en caractères principaux, HT juste en dessous, moins appuyé, toujours présent. Les montants restent tenus et calculés HT ; le TTC est dérivé avec le taux de TVA de chaque article. Les factures et devis émis par Odoo ne changent pas. Les données structurées pour les moteurs déclarent le prix TTC. Le back-office continue de saisir et d'afficher en HT, avec le TTC en aide. Mettre à jour par renvoi les exigences HT des specs F01, F03, F04 (et mentions dans F05, F06, F10, F16, F18, F21). Lecteurs d'écran : « X euros TTC, soit Y euros HT ». Hors périmètre : changement de taux, clients exonérés, affichage selon le type de client."

## Contexte et objectif

Le site affiche aujourd'hui le prix **HT en premier**, en Semibold, et « soit … TTC » en
complément, moins appuyé (F03 FR-027, F04 FR-043). Régis a fait remarquer le 2026-11-08 que la
plupart des cardiologues libéraux **ne récupèrent pas la TVA** : le prix qui les intéresse est
celui qu'ils paient réellement, le TTC.

Pauline a décidé d'inverser la hiérarchie : **le TTC en caractères principaux, le HT juste en
dessous**. La constitution a été amendée en conséquence (version 2.3.0, principe II).

F22 applique cette règle à **tous les endroits où un prix est montré au médecin** : catalogue,
fiches, mise à disposition, financement, services, panier, commande, Mon compte, emails et
données lues par les moteurs de recherche. Les montants restent tenus en HT dans Odoo et dans
les règles du site : seul l'affichage change.

**Phases** : tout F22 se vérifie en phase 1, avec les connecteurs de démonstration. La
concordance des totaux avec une vraie facture Odoo se vérifie en phase 3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir d'abord le prix réellement payé dans le catalogue (Priority: P1)

Une cardiologue libérale, qui ne récupère pas la TVA, parcourt la rubrique Holter ECG. Sur
chaque carte, elle lit d'abord « À partir de 2 388,00 € TTC », puis, juste en dessous et plus
discret, « soit 1 990,00 € HT ». Sur la fiche, chaque configuration, chaque prix par lot de
consommables et chaque palier dégressif suit la même présentation.

**Why this priority**: c'est l'endroit où le médecin compare et décide. C'est la raison même de
la décision.

**Independent Test**: parcourir une rubrique, une fiche d'équipement à variantes et une fiche de
consommable à paliers : chaque prix montre le TTC en premier et le HT juste en dessous, et le
TTC est égal au HT augmenté de la TVA de l'article, au centime près.

**Acceptance Scenarios**:

1. **Given** une carte de catalogue, **When** la cardiologue la lit, **Then** elle voit « À partir
   de … € TTC » en caractères principaux et « soit … € HT » juste en dessous, moins appuyé.
2. **Given** une fiche d'équipement, **When** elle change de configuration, **Then** le prix TTC
   et le prix HT de la configuration choisie sont mis à jour ensemble.
3. **Given** une fiche de consommable vendu par lot avec des paliers, **When** elle choisit une
   quantité, **Then** le prix du lot, le prix unitaire et le total sont montrés en TTC en
   premier, chacun avec son HT.
4. **Given** un client connecté qui a un prix particulier, **When** il ouvre la fiche, **Then**
   son prix est montré en TTC en premier, avec son HT, et le prix catalogue barré suit la même
   présentation.
5. **Given** un lecteur d'écran, **When** il lit un prix, **Then** il annonce « 2 388 euros TTC,
   soit 1 990 euros HT » (ou la formulation « à partir de » correspondante), en une seule
   lecture.

---

### User Story 2 - Payer un montant TTC sans surprise, du panier au paiement (Priority: P1)

Le même médecin ajoute un Holter et deux lots d'électrodes au panier. Chaque ligne montre son
montant TTC en premier, avec le HT dessous. Le bloc des totaux reste détaillé (total HT,
remises, frais de port, TVA, total TTC) et met en avant le **total TTC à payer**. Le montant
débité à l'étape du paiement est exactement ce total TTC.

**Why this priority**: un écart, même d'un centime, entre les lignes, le total et le montant
débité ruinerait la confiance gagnée sur le catalogue.

**Independent Test**: composer un panier mêlant plusieurs articles, quantités et frais de port :
la somme des montants TTC des lignes et des frais de port est égale au total TTC, et le montant
payé est égal au total TTC.

**Acceptance Scenarios**:

1. **Given** un panier d'achats, **When** le médecin le consulte, **Then** chaque ligne montre son
   montant TTC en premier et son HT juste en dessous.
2. **Given** le bloc des totaux, **When** il le lit, **Then** il trouve, dans cet ordre, le
   détail HT (total HT, remises, frais de port), la TVA, puis le **total TTC** en caractères
   principaux.
3. **Given** des frais de port forfaitaires et un seuil de franco, **When** le seuil n'est pas
   atteint, **Then** les frais de port et le montant restant pour le franco sont exprimés en TTC
   en premier, avec leur HT.
4. **Given** un panier quelconque, **When** on additionne les montants TTC des lignes et des
   frais de port, **Then** on obtient exactement le total TTC affiché.
5. **Given** le récapitulatif avant paiement, **When** le médecin paie, **Then** le montant
   débité est le total TTC affiché, au centime près.

---

### User Story 3 - Mise à disposition et financement en mensualités TTC (Priority: P2)

Un médecin compare l'achat, la mise à disposition au mois et le financement d'un Holter
tensionnel. Le premier mois et les mois suivants de la mise à disposition, ainsi que les
mensualités indicatives de financement, sont montrés en TTC par mois en premier, avec leur HT.

**Why this priority**: ces montants mensuels pèsent dans la décision, mais concernent moins
de parcours que l'achat.

**Independent Test**: sur une fiche proposant les trois formules, chaque montant mensuel
s'affiche « … € TTC / mois », puis « soit … € HT / mois » ; même présentation dans le panier,
au bloc des mises à disposition.

**Acceptance Scenarios**:

1. **Given** une fiche avec mise à disposition, **When** le médecin choisit cette formule,
   **Then** le premier mois et les mois suivants sont montrés en TTC par mois en premier, avec
   leur HT par mois.
2. **Given** une fiche avec financement, **When** il consulte les durées, **Then** chaque
   mensualité indicative est montrée en TTC par mois en premier, avec son HT, et la mention
   « à titre indicatif » reste présente.
3. **Given** un tarif de service (assistance, dépannage, logiciel au mois), **When** il le lit,
   **Then** le tarif suit la même présentation.

---

### User Story 4 - Retrouver la même présentation dans Mon compte et les emails (Priority: P2)

Après sa commande, le médecin retrouve dans Mon compte ses commandes, devis, locations et
factures, et reçoit l'email de confirmation de commande. Partout, les montants lui sont montrés
en TTC en premier, avec le HT. Les **documents émis par Odoo** (facture, devis en PDF) ne
changent pas : ce sont des pièces comptables, présentées comme Odoo les émet.

**Why this priority**: la cohérence rassure ; ces écrans sont moins consultés que le
catalogue et le panier.

**Independent Test**: passer une commande de démonstration, puis ouvrir Mon compte et la boîte
de démonstration : chaque montant des écrans et de l'email est montré en TTC en premier, avec
son HT ; le PDF de facture fictive est inchangé.

**Acceptance Scenarios**:

1. **Given** la liste et le détail d'une commande dans Mon compte, **When** le médecin les
   consulte, **Then** les montants sont montrés en TTC en premier, avec leur HT.
2. **Given** les listes de devis, de locations et de factures, **When** il les consulte,
   **Then** chaque montant suit la même présentation.
3. **Given** un email qui mentionne un montant (confirmation de commande, devis, rappel de
   paiement par virement, mise à disposition), **When** il le lit, **Then** le montant est
   donné en TTC en premier, avec son HT.
4. **Given** une facture ou un devis émis par Odoo, **When** le médecin l'ouvre, **Then** le
   document est celui d'Odoo, sans modification par le site.

---

### User Story 5 - L'équipe garde le HT au back-office ; les moteurs lisent le TTC (Priority: P3)

Régis et l'équipe raisonnent en HT. Au back-office, les montants restent saisis et affichés en
HT, avec le TTC indiqué en aide. Les données lues par les moteurs de recherche, en revanche,
déclarent le prix TTC, celui que le public voit en premier.

**Why this priority**: évite toute confusion pour l'équipe et toute incohérence entre ce que
montrent les moteurs et ce que montre la page.

**Independent Test**: au back-office, modifier un tarif de démonstration : la saisie reste en
HT et le TTC correspondant s'affiche en aide. Sur une fiche publique, les données structurées
annoncent le prix TTC affiché.

**Acceptance Scenarios**:

1. **Given** un écran du back-office qui montre ou fait saisir un montant, **When** l'équipe
   l'utilise, **Then** le montant reste en HT en premier, avec le TTC en aide.
2. **Given** une fiche produit publique, **When** un moteur lit ses données structurées,
   **Then** le prix déclaré est le prix TTC affiché en premier, en euros, TVA comprise.

---

### Edge Cases

- **Taux de TVA autre que 20 %** : aucun n'est prévu, mais le TTC est toujours calculé avec le
  taux de l'article ; un article sans taux connu n'est pas affiché avec un TTC inventé (il est
  signalé au rapport de contrôle, comme aujourd'hui).
- **Arrondis** : le TTC d'une ligne est arrondi au centime ; la TVA est calculée ligne par
  ligne, si bien que la somme des TTC des lignes est égale au total TTC. Un écart d'un centime
  entre lignes et total n'est jamais visible.
- **Remises et codes promo** : le montant de la remise est montré en TTC en premier, avec son
  HT ; le total TTC tient compte de la remise avant la TVA, comme aujourd'hui.
- **Prix « à partir de »** : le plus petit prix HT des variantes donne le plus petit TTC tant que
  le taux est le même ; si les taux diffèrent, le « à partir de » retient le plus petit TTC.
- **Montants nuls** (offre de bienvenue gratuite, frais de port offerts) : « Offert » ou
  « 0,00 € TTC », sans ligne HT.
- **Bons d'achat et droits d'assistance** : masqués à l'ouverture (F14, option A) ; leur
  présentation sera fixée par le lot B de F18, selon la même règle.
- **Écran étroit (390 px)** : TTC et HT restent lisibles l'un sous l'autre, sans défilement
  horizontal ni troncature.
- **Mouvement réduit, zoom à 200 %** : la hiérarchie reste perceptible par la taille et la
  graisse, pas seulement par la couleur.

## Requirements *(mandatory)*

### Functional Requirements

**Règle d'affichage**

- **FR-001** : Partout où un prix est montré à un visiteur ou à un client, il DOIT apparaître
  en **TTC en caractères principaux**, avec le **montant HT juste en dessous**, moins appuyé et
  toujours présent, chacun suivi de sa mention « TTC » ou « HT ».
- **FR-002** : Le montant TTC DOIT être calculé à partir du montant HT et du taux de TVA de
  l'article, arrondi au centime. Les montants restent tenus et calculés en HT par Odoo et par
  les règles du site ; F22 ne change aucun prix.
- **FR-003** : Pour un montant périodique, la période DOIT suivre chacun des deux montants
  (« … € TTC / mois », « soit … € HT / mois »).
- **FR-004** : Un prix barré (prix catalogue sous un prix client, prix avant remise) DOIT
  suivre la même présentation que le prix qu'il accompagne.
- **FR-005** : Les lecteurs d'écran DOIVENT annoncer chaque prix en une seule lecture, TTC
  d'abord : « X euros TTC, soit Y euros HT » (avec « à partir de » ou « par mois » le cas
  échéant).
- **FR-006** : La hiérarchie DOIT reposer sur la taille et la graisse du texte, dans les
  couleurs de la charte, avec un contraste d'au moins 4,5:1 pour les deux montants.

**Écrans concernés**

- **FR-007** : Catalogue : cartes de rubrique, résultats de recherche, produits phares et
  vignettes du carrousel qui montrent un prix.
- **FR-008** : Fiches produit : prix de chaque configuration, prix client, prix par lot et
  prix unitaire des consommables, paliers dégressifs, total pour la quantité choisie.
- **FR-009** : Mise à disposition (premier mois, mois suivants, valeur de remplacement
  mentionnée au client), mensualités indicatives de financement et tarifs des services.
- **FR-010** : Panier et tunnel de commande : montant de chaque ligne, remises, frais de port,
  seuil et reste pour le franco, bloc des mises à disposition et récapitulatif avant paiement.
- **FR-011** : Le bloc des totaux d'achat DOIT garder son détail (total HT, remises, frais de
  port, TVA) et DOIT mettre en avant le **total TTC à payer**, en caractères principaux.
- **FR-012** : Le montant débité au paiement DOIT être égal au total TTC affiché, et la somme
  des montants TTC des lignes et des frais de port DOIT être égale à ce total.
- **FR-013** : Mon compte : commandes (liste et détail), devis, locations, factures,
  financements et tout autre écran qui montre un montant au client.
- **FR-014** : Emails envoyés au client qui mentionnent un montant : même présentation, en
  texte comme en HTML.
- **FR-015** : Les données structurées lues par les moteurs de recherche DOIVENT déclarer le
  prix TTC affiché en premier, TVA comprise, en euros.

**Ce qui ne change pas**

- **FR-016** : Les factures et devis émis par Odoo (y compris les factures fictives marquées
  FICTIVE en phase 1) NE DOIVENT PAS être modifiés par le site.
- **FR-017** : Le back-office DOIT continuer à faire saisir et à afficher les montants en HT en
  premier, avec le TTC correspondant indiqué en aide là où un montant est saisi.
- **FR-018** : Les règles de calcul existantes (paliers, prix client, remises, franco, barèmes)
  NE DOIVENT PAS changer ; seule leur présentation change.

**Documentation**

- **FR-019** : Les exigences d'affichage HT en premier des specs déjà livrées (F01, F03
  FR-006, FR-022, FR-027 et SC-001, F04 FR-002, FR-003 et FR-043, et les mentions de F05, F06,
  F10, F16, F18 et F21) DOIVENT recevoir une note de renvoi vers F22, sans réécriture de ces
  specs.
- **FR-020** : La charte (`docs/brand/design-system.md`) DOIT décrire la nouvelle présentation
  des prix.

### Key Entities

- **Prix affiché** : un montant HT, un taux de TVA, le montant TTC qui en découle, une mention
  éventuelle (« à partir de », période, prix barré). Il n'est jamais stocké en TTC.
- **Totaux de commande** : total HT, remises, frais de port, TVA par taux, total TTC à payer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 1] : 100 % des prix montrés au public et aux clients sur les écrans listés
  (FR-007 à FR-014) affichent le TTC en premier et le HT juste en dessous.
- **SC-002** [Phase 1] : sur un jeu de 20 paniers variés (quantités, paliers, remises, frais de
  port, plusieurs lignes), la somme des TTC des lignes et des frais de port est égale au total
  TTC, et le montant payé est égal au total TTC, dans 100 % des cas.
- **SC-003** [Phase 1] : un médecin identifie le montant qu'il paiera en moins de 5 secondes
  sur une carte, une fiche et le panier, sans calcul.
- **SC-004** [Phase 1] : aucun prix du back-office n'est passé en TTC en premier ; les factures
  fictives sont identiques avant et après F22.
- **SC-005** [Phase 1] : les écrans touchés restent conformes WCAG 2.2 AA et sans défilement
  horizontal de 390 à 1 920 px.
- **SC-006** [Phase 3] : sur 10 commandes passées dans la copie de test d'Odoo, le total TTC
  affiché par le site est égal au total de la facture émise par Odoo, au centime près.

## Assumptions

- Seul le taux de TVA de 20 % est utilisé aujourd'hui (réponse de Régis du 2026-11-08) ; le
  calcul reste général.
- Odoo calcule la TVA **ligne par ligne** (réglage par défaut d'Odoo) ; si la copie de test
  montre un autre réglage, le site s'y aligne (à vérifier au lot Commandes de F14).
- Le seuil de franco reste défini en HT dans Odoo ; le site en montre l'équivalent TTC.
- Tous les clients sont traités de la même façon : pas de client exonéré de TVA, pas
  d'affichage selon le type de client.
- La présentation des bons d'achat et droits d'assistance attend le lot B de F18 (masqués à
  l'ouverture).

## Dependencies

- Constitution 2.3.0, principe II (amendement du 2026-11-08).
- F03, F04, F05, F06, F09, F10, F16, F18 : écrans et emails qui montrent des prix.
- F21 (référencement naturel) : données structurées des fiches.
- F14 : taux de TVA lu dans Odoo ; méthode d'arrondi de la copie.
