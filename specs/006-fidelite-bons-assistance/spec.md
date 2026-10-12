# Feature Specification: F06 — Fidélité, bons d'achat et droits d'assistance

**Feature Branch**: `006-fidelite-bons-assistance`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "F06 — Fidélité, bons d'achat et droits d'assistance : droits d'assistance ouverts par les commandes, cagnotte de bons d'achat créditée par paliers (0 %, 5 %, 10 %), utilisation dans le panier, retrait en cas d'annulation ou de remboursement, consultation par l'équipe d'assistance, promotions. Objectif : remplacer le forfait annuel de hotline par un modèle gagnant-gagnant."

## Contexte et objectif

ExploCardio.fr ne vend pas de forfait annuel de hotline. À la place, F06 met en œuvre un
modèle gagnant-gagnant : les commandes régulières ouvrent l'assistance gratuite et
créditent une cagnotte. Deux mécanismes se cumulent :

- **les droits d'assistance** : une commande éligible ouvre, pour une durée donnée, l'accès
  gratuit à l'assistance, à la hotline et au SAV réactif ;
- **la cagnotte de bons d'achat** : chaque commande éligible crédite un pourcentage de son
  montant HT, utilisable sur les commandes suivantes.

F06 livre aussi les **promotions** : remises automatiques, ventes flash et codes promo.

Toutes les règles (taux, seuils, durées, validité, promotions) sont des paramètres du
back-office, conformément au principe VI de la constitution.

**Hors périmètre de F06** : le panier et l'application des remises au paiement (F04), les
demandes d'assistance et de SAV elles-mêmes et leur traitement, les garanties, l'affichage du
bandeau (F01) et des fiches produit (F03), le back-office complet (F13), la reprise par le
programme de fidélité d'Odoo (F11).

**Lien avec les autres modules** : F04 applique dans le panier le solde de bons d'achat, les
remises et les codes promo définis par F06, et signale à F06 les commandes payées, annulées
et remboursées. F03 affiche sur les fiches consommables ce que l'achat rapporte. F01 affiche
les promotions dans le bandeau. F02 présente les soldes et statuts dans « Mon compte ».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gagner des bons d'achat à chaque commande (Priority: P1)

Un client passe une commande éligible. Selon son montant HT, un pourcentage est crédité sur
sa cagnotte de bons d'achat. Il en est informé et voit son nouveau solde.

**Why this priority**: c'est le cœur du programme de fidélité et un critère d'acceptation
chiffré du module.

**Independent Test**: passer trois commandes éligibles de 400 €, 800 € et 1 200 € HT avec
les paramètres par défaut, et vérifier les crédits de 0 €, 40 € et 120 €.

**Acceptance Scenarios**:

1. **Given** les paramètres par défaut, **When** une commande de 1 200 € HT de
   consommables est payée, **Then** 120 € de bons d'achat sont crédités sur la cagnotte du
   client.
2. **Given** les paramètres par défaut, **When** une commande éligible de 800 € HT est
   payée, **Then** le client reçoit 40 € ; une commande de 400 € HT ne crédite rien.
3. **Given** un crédit, **When** il est effectué, **Then** le client en est informé par
   email et le crédit apparaît dans son historique avec la commande d'origine, le montant
   et la date de fin de validité.
4. **Given** une commande mêlant un équipement et des consommables, **When** le crédit
   est calculé, **Then** seul le montant des consommables et accessoires est pris en
   compte, pour le palier comme pour le calcul.
5. **Given** une commande payée en partie avec des bons d'achat, **When** le crédit est
   calculé, **Then** la part payée en bons d'achat ne génère pas de nouveaux bons.
6. **Given** un panier, **When** le client le consulte avant de commander, **Then** il
   voit le montant de bons d'achat que la commande lui rapportera, et ce qui lui manque
   pour atteindre le palier suivant.

---

### User Story 2 - Ouvrir et prolonger ses droits d'assistance (Priority: P1)

Une commande d'un montant suffisant ouvre l'accès gratuit à l'assistance pendant une durée
donnée. Une nouvelle commande éligible prolonge cette période.

**Why this priority**: c'est ce qui remplace le forfait annuel de hotline, donc la raison
d'être du module.

**Independent Test**: passer une commande au-dessus du seuil, vérifier l'ouverture des
droits et leur date de fin, puis passer une seconde commande et vérifier la nouvelle date
selon la règle de prolongation en vigueur.

**Acceptance Scenarios**:

1. **Given** un client sans droits actifs, **When** une commande éligible atteint le
   seuil fixé, **Then** ses droits d'assistance deviennent actifs pour la durée fixée, et
   il en est informé avec la date de fin.
2. **Given** une commande sous le seuil, **When** elle est enregistrée, **Then** aucun
   droit n'est ouvert, et le client voit ce qui manquait.
3. **Given** des droits actifs et la règle « cumul », **When** une nouvelle commande
   éligible est enregistrée, **Then** la durée s'ajoute à la date de fin en cours.
4. **Given** des droits actifs et la règle « remise à zéro », **When** une nouvelle
   commande éligible est enregistrée, **Then** la durée repart de la date de cette
   commande, sans jamais raccourcir la période déjà acquise.
5. **Given** des droits proches de leur fin, **When** le délai de prévenance est atteint,
   **Then** le client reçoit un rappel indiquant comment prolonger.
6. **Given** des droits arrivés à leur date de fin, **When** cette date est passée,
   **Then** le statut devient « inactif ».

---

### User Story 3 - Utiliser ses bons d'achat (Priority: P1)

Dans son panier, le client utilise tout ou partie de sa cagnotte pour réduire le montant de
ses achats.

**Why this priority**: une cagnotte qu'on ne peut pas dépenser simplement n'a aucune valeur
pour le client.

**Independent Test**: avec un solde de 120 €, utiliser 50 € sur une commande, vérifier le
solde restant de 70 €, puis utiliser le reste sur une commande d'un montant inférieur.

**Acceptance Scenarios**:

1. **Given** un solde disponible, **When** le client ouvre son panier, **Then** son solde
   est affiché et il peut choisir le montant à utiliser, en tout ou en partie.
2. **Given** un montant choisi, **When** la commande est payée, **Then** ce montant est
   débité de la cagnotte et apparaît dans l'historique.
3. **Given** un solde supérieur au montant éligible du panier, **When** le client utilise
   ses bons, **Then** seul le montant éligible est débité et le reste est conservé.
4. **Given** des bons de dates de validité différentes, **When** un montant est utilisé,
   **Then** les bons qui expirent le plus tôt sont consommés en premier.
5. **Given** une commande non payée ou abandonnée, **When** le paiement n'aboutit pas,
   **Then** les bons qu'elle devait utiliser restent disponibles.
6. **Given** des bons arrivés à leur date de fin de validité, **When** cette date est
   passée, **Then** ils ne sont plus utilisables et l'historique l'indique.

---

### User Story 4 - Annuler ou rembourser sans avantage indu (Priority: P1)

Quand une commande est annulée ou remboursée, les bons d'achat et les droits d'assistance
qu'elle avait générés sont retirés, et les bons qu'elle avait consommés sont rendus.

**Why this priority**: sans cette règle, le programme peut être détourné. C'est un critère
d'acceptation du module.

**Independent Test**: rembourser une commande qui avait crédité 120 € et ouvert des droits,
et vérifier le retrait des deux ; rembourser une commande payée en partie en bons d'achat
et vérifier leur restitution.

**Acceptance Scenarios**:

1. **Given** une commande ayant crédité des bons d'achat, **When** elle est annulée ou
   intégralement remboursée, **Then** ces bons sont retirés de la cagnotte et l'historique
   l'indique.
2. **Given** une commande ayant ouvert ou prolongé des droits d'assistance, **When** elle
   est annulée ou intégralement remboursée, **Then** la période qu'elle avait apportée
   est retirée.
3. **Given** un remboursement partiel, **When** il est enregistré, **Then** le crédit est
   recalculé sur le montant restant, avec le taux en vigueur à la date de la commande, et
   la différence est retirée.
4. **Given** une commande payée en partie avec des bons d'achat, **When** elle est
   annulée ou remboursée, **Then** les bons utilisés sont rendus à la cagnotte, avec leur
   date de validité d'origine.
5. **Given** des bons à retirer que le client a déjà dépensés, **When** le retrait est
   calculé, **Then** la règle de l'hypothèse « Bons déjà dépensés » s'applique et
   l'administrateur est informé.

---

### User Story 5 - Suivre ses avantages dans « Mon compte » (Priority: P2)

Le client voit à tout moment où il en est : statut de ses droits d'assistance, date de fin,
comment prolonger ; solde de sa cagnotte et historique complet.

**Why this priority**: la transparence rend le modèle crédible, mais les mécanismes
fonctionnent sans cet écran.

**Independent Test**: après plusieurs commandes, utilisations et un remboursement, vérifier
que le solde affiché égale la somme des mouvements de l'historique.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre la rubrique des droits d'assistance,
   **Then** il voit le statut actif ou inactif, la date de fin et la façon de prolonger.
2. **Given** un client connecté, **When** il ouvre la rubrique des bons d'achat, **Then**
   il voit son solde, la prochaine date d'expiration et le montant concerné.
3. **Given** l'historique de la cagnotte, **When** il le consulte, **Then** chaque
   mouvement (crédit, utilisation, retrait, restitution, expiration, ajustement) est
   daté, chiffré et relié à sa commande.
4. **Given** des bons qui expirent bientôt, **When** le délai de prévenance est atteint,
   **Then** le client reçoit un rappel.
5. **Given** un client sans droits actifs, **When** il consulte la rubrique, **Then** il
   voit comment en obtenir et la proposition d'assistance à l'acte.

---

### User Story 6 - Vérifier les droits avant d'aider (Priority: P2)

Avant d'aider un client, un membre de l'équipe d'assistance vérifie en quelques secondes si
ses droits sont actifs.

**Why this priority**: sans cette vérification, l'équipe ne peut pas appliquer le modèle au
quotidien.

**Independent Test**: rechercher un client par son nom, son cabinet ou son numéro RPPS et
lire son statut de droits.

**Acceptance Scenarios**:

1. **Given** un membre de l'équipe, **When** il recherche un client par nom, cabinet,
   email, téléphone ou numéro RPPS ou SIRET, **Then** il voit le statut de ses droits, la
   date de fin et la commande qui les a ouverts.
2. **Given** un client sans droits actifs, **When** sa fiche s'affiche, **Then** l'équipe
   voit la date de fin de ses derniers droits et s'il dispose d'une intervention à l'acte
   déjà payée.
3. **Given** un geste commercial, **When** un administrateur ouvre ou prolonge des droits
   à la main, **Then** l'action est enregistrée avec son motif et son auteur.

---

### User Story 7 - Régler les règles du programme (Priority: P2)

L'administrateur modifie les paliers et taux de la cagnotte, le seuil et la durée des droits
d'assistance, la règle de prolongation et la durée de validité des bons. Les changements ne
touchent que les commandes à venir.

**Why this priority**: le programme évoluera. Un changement de règle ne doit ni exiger un
développeur ni modifier ce qui est déjà acquis ; c'est un critère d'acceptation.

**Independent Test**: créditer une commande, modifier un taux, créditer une seconde commande
identique, et vérifier que le premier crédit est inchangé et que le second suit le nouveau
taux.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il modifie un palier ou un taux, **Then** le
   changement s'applique aux commandes suivantes et les bons déjà crédités restent
   inchangés.
2. **Given** un administrateur, **When** il modifie le seuil, la durée ou la règle de
   prolongation des droits, **Then** les droits déjà ouverts conservent leur date de fin.
3. **Given** des paliers incohérents (chevauchement, trou, taux négatif), **When**
   l'administrateur les enregistre, **Then** l'enregistrement est refusé avec
   l'explication.
4. **Given** un geste commercial, **When** l'administrateur crédite ou débite une
   cagnotte à la main, **Then** un motif est exigé et le mouvement apparaît dans
   l'historique du client.
5. **Given** toute modification de règle, **When** elle est enregistrée, **Then** elle
   est journalisée avec son auteur, sa date et les valeurs avant et après.

---

### User Story 8 - Lancer une promotion (Priority: P2)

L'administrateur crée une remise automatique, une vente flash ou un code promo. La promotion
s'affiche dans le bandeau et sur les fiches concernées, puis s'arrête d'elle-même à sa date
de fin.

**Why this priority**: les promotions animent le site, mais le programme de fidélité
fonctionne sans elles.

**Independent Test**: créer une vente flash de 10 % sur une catégorie avec une date de fin
proche, vérifier son affichage et son application au panier, puis vérifier son arrêt à
l'échéance.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il crée une remise automatique sur un produit,
   une catégorie ou un montant de panier, **Then** elle s'applique sans action du client.
2. **Given** une vente flash avec une date de début et de fin, **When** la période est en
   cours, **Then** elle est annoncée dans le bandeau et sur les fiches concernées, avec le
   prix d'origine, le prix remisé et la date de fin.
3. **Given** une promotion arrivée à sa date de fin, **When** cette date est passée,
   **Then** elle cesse de s'appliquer et de s'afficher, sans intervention.
4. **Given** un code promo, **When** l'administrateur le crée, **Then** il fixe sa remise,
   sa période, ses conditions et ses limites d'usage.
5. **Given** plusieurs promotions applicables au même article, **When** le prix est
   calculé, **Then** la règle de cumul fixée par l'administrateur s'applique, et le client
   voit le détail.

---

### User Story 9 - Se faire aider sans droits actifs (Priority: P3)

Un client sans droits actifs a besoin d'aide. Le site lui présente deux voies : passer une
commande qui ouvre les droits, ou acheter une assistance à l'acte.

**Why this priority**: ce cas complète le modèle, mais il concerne une minorité de clients
et le programme fonctionne sans lui.

**Independent Test**: avec un compte sans droits actifs, acheter une assistance à l'acte,
vérifier le droit à une intervention côté client et côté équipe, puis clore l'intervention
et vérifier qu'il est consommé.

**Acceptance Scenarios**:

1. **Given** un client sans droits actifs, **When** il consulte ses droits ou cherche de
   l'aide, **Then** il voit le montant de commande qui ouvrirait l'assistance gratuite et
   la proposition d'assistance à l'acte, avec son prix HT.
2. **Given** l'assistance à l'acte choisie, **When** le client la paie par carte, **Then**
   il dispose d'un droit à une intervention, visible dans « Mon compte » et par l'équipe
   d'assistance, et reçoit sa facture.
3. **Given** un droit à une intervention, **When** l'équipe clôt l'intervention, **Then**
   le droit est consommé et le client en est informé.
4. **Given** un client aux droits actifs, **When** il consulte la rubrique, **Then**
   l'assistance payante ne lui est pas proposée.

---

### Edge Cases

- Commande d'un montant exactement égal à une borne de palier : la borne basse d'un palier
  lui appartient (500 € donne 5 %), et 1 000 € reste dans le palier à 5 %.
- Commande composée uniquement de produits non éligibles : aucun crédit, aucun droit.
- Commande contenant le tensiomètre de bienvenue à 0 € : la ligne ne compte pas.
- Deux commandes éligibles enregistrées au même moment : les deux crédits sont comptés une
  fois chacun.
- Remboursement partiel faisant passer la commande sous un palier : le crédit est recalculé
  au taux du palier inférieur.
- Commande par virement annulée faute de paiement : rien n'a été crédité, rien n'est retiré.
- Retrait de droits qui ferait passer la date de fin dans le passé : le statut devient
  inactif immédiatement.
- Bons rendus après un remboursement alors que leur date de validité est dépassée : voir
  l'hypothèse correspondante.
- Compte supprimé (RGPD) : la cagnotte et les droits sont perdus, et le client en est averti
  avant de confirmer.
- Compte suspendu : la cagnotte est conservée mais inutilisable ; les droits ne sont pas
  prolongés.
- Vente flash qui se termine pendant qu'un article est au panier : le prix en vigueur au
  paiement s'applique, et le client en est informé.
- Promotion et dégressif de quantité sur le même consommable : la règle de cumul s'applique.
- Changement de règle pendant qu'une commande est en cours de paiement : la règle en vigueur
  à la date de la commande s'applique.

## Requirements *(mandatory)*

### Functional Requirements

**Droits d'assistance**

- **FR-001** : Une commande éligible dont le montant atteint le seuil fixé DOIT ouvrir
  l'accès gratuit à l'assistance, à la hotline et au SAV réactif pour la durée fixée.
- **FR-002** : Le seuil et la durée DOIVENT être des paramètres modifiables par
  l'administrateur.
- **FR-003** : Une nouvelle commande éligible DOIT prolonger la période selon la règle
  choisie par l'administrateur : cumul (la durée s'ajoute) ou remise à zéro (la durée
  repart de la nouvelle commande). Aucune règle NE DOIT raccourcir une période acquise.
- **FR-004** : Les droits DOIVENT être rattachés au compte client et porter un statut actif
  ou inactif et une date de fin.
- **FR-005** : Le client DOIT être informé de l'ouverture, de la prolongation et de la fin
  prochaine de ses droits.

**Cagnotte de bons d'achat**

- **FR-006** : Chaque commande éligible DOIT créditer en bons d'achat un pourcentage de son
  montant HT éligible, selon des paliers fixés par l'administrateur. Valeurs par défaut :
  0 % en dessous de 500 € HT, 5 % de 500 € à 1 000 € HT, 10 % au-dessus de 1 000 € HT.
- **FR-007** : Le taux du palier atteint DOIT s'appliquer à la totalité du montant éligible
  (une commande de 1 200 € HT crédite 120 €).
- **FR-008** : Le montant éligible DOIT exclure les frais de port, les remises, la part
  payée en bons d'achat et les lignes à 0 €.
- **FR-009** : Seuls les consommables et les accessoires DOIVENT donner droit au crédit. Les
  équipements, les services et les mises à disposition n'en donnent pas. L'administrateur
  DOIT pouvoir marquer chaque produit comme éligible ou non.
- **FR-010** : Le crédit DOIT être déclenché quand la commande est payée (paiement par carte
  confirmé, ou virement reçu).
- **FR-011** : Les bons d'achat DOIVENT avoir une durée de validité fixée par
  l'administrateur. Les bons expirés NE DOIVENT plus être utilisables, et le client DOIT
  être prévenu avant leur expiration.
- **FR-012** : Le client DOIT pouvoir utiliser sa cagnotte dans le panier, en tout ou en
  partie, les bons expirant le plus tôt étant consommés en premier.

**Assistance payante**

- **FR-013** : Un client sans droits actifs DOIT se voir proposer une assistance payante à
  l'acte : une intervention, à un prix HT fixé par l'administrateur, payée en ligne par
  carte (F04).
- **FR-038** : L'achat d'une assistance à l'acte DOIT ouvrir un droit à une intervention,
  visible du client et de l'équipe d'assistance, consommé quand l'équipe clôt
  l'intervention. Il donne lieu à une facture et ne crédite ni bons d'achat ni droits
  d'assistance.
- **FR-014** : Le client sans droits actifs DOIT aussi voir le montant de commande qui lui
  ouvrirait l'assistance gratuite.

**Annulation et remboursement**

- **FR-015** : L'annulation ou le remboursement intégral d'une commande DOIT retirer les
  bons d'achat qu'elle avait crédités et la période de droits qu'elle avait apportée.
- **FR-016** : Un remboursement partiel DOIT recalculer le crédit sur le montant restant,
  avec les règles en vigueur à la date de la commande.
- **FR-017** : Les bons d'achat utilisés pour payer une commande annulée ou remboursée
  DOIVENT être rendus à la cagnotte.
- **FR-018** : Aucun crédit ni retrait NE DOIT être compté deux fois pour un même
  événement.

**Génération et source de vérité**

- **FR-019** : Les bons d'achat et les droits d'assistance DOIVENT être générés
  automatiquement, sans intervention, à chaque commande éligible.
- **FR-020** : Bons d'achat, droits et mouvements DOIVENT être enregistrés dans le
  référentiel de gestion, par la couche d'accès unique (principe III), de façon à être
  repris par le programme de fidélité d'Odoo lors de F11.
- **FR-021** : Chaque mouvement de cagnotte DOIT conserver la commande d'origine, le
  montant, la date, et les règles appliquées au moment du calcul.
- **FR-022** : Le solde affiché DOIT toujours égaler la somme des mouvements de
  l'historique.

**Consultation**

- **FR-023** : « Mon compte » DOIT présenter le statut des droits, leur date de fin, la
  façon de les prolonger, le solde de la cagnotte, la prochaine expiration et l'historique
  des mouvements.
- **FR-024** : Le panier et les fiches consommables DOIVENT indiquer ce qu'un achat
  rapportera en bons d'achat et en droits d'assistance.
- **FR-025** : L'équipe d'assistance DOIT pouvoir rechercher un client et consulter le
  statut de ses droits, leur date de fin et leur origine.

**Paramétrage et administration**

- **FR-026** : Toute modification d'un taux, d'un palier, d'un seuil, d'une durée ou d'une
  règle DOIT s'appliquer aux commandes suivantes, sans modifier les bons déjà crédités ni
  les droits déjà ouverts.
- **FR-027** : L'administrateur DOIT pouvoir créditer ou débiter une cagnotte, et ouvrir ou
  prolonger des droits, à la main, avec un motif obligatoire.
- **FR-028** : Toute modification de règle et toute intervention manuelle DOIVENT être
  journalisées avec leur auteur, leur date et les valeurs avant et après.
- **FR-029** : F06 DOIT livrer les écrans d'administration nécessaires : règles du
  programme, cagnottes et droits des clients, interventions manuelles, promotions. Le
  back-office complet (F13) les étendra.

**Promotions**

- **FR-030** : L'administrateur DOIT pouvoir créer des remises automatiques par produit, par
  catégorie ou par montant de panier.
- **FR-031** : L'administrateur DOIT pouvoir créer des ventes flash avec une date de début
  et une date de fin, qui démarrent et s'arrêtent sans intervention.
- **FR-032** : L'administrateur DOIT pouvoir créer des codes promo avec leur remise, leur
  période, leurs conditions et leurs limites d'usage.
- **FR-033** : Une promotion en cours DOIT être annoncée dans le bandeau (F01) et sur les
  fiches concernées (F03), avec le prix d'origine, le prix remisé en HT et la date de fin.
- **FR-034** : Les règles de cumul entre promotions, dégressifs, codes promo et bons d'achat
  DOIVENT être fixées par l'administrateur et expliquées au client dans le panier.

**Charte, accessibilité et langue**

- **FR-035** : Tous les montants DOIVENT être exprimés en euros HT.
- **FR-036** : Tous les écrans et emails de F06 DOIVENT respecter la charte, le niveau WCAG
  2.2 AA, le vouvoiement et le ton sobre du site. Le motif des trois points de la charte
  illustre le parcours consommables → bons d'achat → assistance offerte.
- **FR-037** : Aucun écran de F06 NE DOIT inviter à saisir une donnée de patient.

### Key Entities

- **Règles du programme** : paliers et taux de la cagnotte, durée de validité des bons,
  seuil et durée des droits, règle de prolongation, délais de prévenance. Chaque version
  des règles est conservée avec sa période d'application.
- **Cagnotte** : rattachée à un compte client. Solde, prochaine expiration.
- **Mouvement de cagnotte** : type (crédit, utilisation, retrait, restitution, expiration,
  ajustement manuel), montant, date, commande liée, date de validité, règles appliquées,
  motif et auteur pour un ajustement.
- **Droits d'assistance** : rattachés à un compte client. Statut, date de fin.
- **Période de droits** : durée apportée par une commande ou une intervention manuelle,
  avec son origine, pour pouvoir la retirer.
- **Assistance à l'acte** : prix, contenu d'une intervention.
- **Intervention payée** : client, date d'achat, facture, état (disponible, consommée).
- **Promotion** : type (remise automatique, vente flash, code promo), cible (produit,
  catégorie, montant de panier), remise, dates de début et de fin, conditions, limites
  d'usage, règle de cumul.
- **Journal du programme** : modifications de règles et interventions manuelles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Avec les paramètres par défaut, une commande éligible de 1 200 € HT crédite
  exactement 120 € de bons d'achat.
- **SC-002** : Après modification d'un taux dans le back-office, 100 % des commandes
  suivantes suivent le nouveau taux, et aucun bon déjà crédité n'est modifié.
- **SC-003** : Une commande remboursée voit retirés 100 % des bons et des droits qu'elle
  avait générés.
- **SC-004** : Pour chaque client, le solde affiché égale la somme des mouvements de son
  historique, au centime près.
- **SC-005** : Aucun crédit ni retrait n'est compté deux fois (0 cas sur l'ensemble des
  tests, y compris événements répétés ou simultanés).
- **SC-006** : Bons et droits sont générés sans intervention pour 100 % des commandes
  éligibles, en moins de 5 minutes après l'événement déclencheur.
- **SC-007** : Un membre de l'équipe d'assistance trouve le statut des droits d'un client
  en moins de 15 secondes.
- **SC-008** : Un client trouve son solde de bons d'achat et la date de fin de ses droits
  en moins de 30 secondes depuis « Mon compte ».
- **SC-009** : Un administrateur modifie une règle ou crée une promotion en moins de
  5 minutes, sans développeur.
- **SC-010** : Une vente flash commence et s'arrête à la minute près de ses dates, sans
  intervention.
- **SC-011** : Lors d'un test avec des médecins, au moins 8 sur 10 expliquent correctement,
  après lecture de « Mon compte », comment obtenir l'assistance gratuite.
- **SC-012** : Un audit des écrans de F06 ne relève aucune non-conformité WCAG 2.2 AA.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-12.

- **Valeurs des paliers (confirmé)** : 0 %, 5 % et 10 % aux seuils de 500 € et 1 000 € HT
  sont les valeurs par défaut à la mise en service, modifiables ensuite. À confirmer.
- **Seuil et durée des droits (confirmé)** : la demande donne 30 jours en exemple et ne
  fixe pas de seuil. Ce sont des paramètres à renseigner avant la mise en ligne.
- **Commandes ouvrant les droits d'assistance (confirmé)** : les commandes de
  consommables, conformément au modèle « les achats de consommables ouvrent l'assistance ».
  Le seuil s'apprécie par commande, pas en cumul sur une période.
- **Règle de prolongation par défaut (confirmé)** : cumul, avec un plafond réglable pour
  éviter une accumulation illimitée.
- **Validité des bons (confirmé)** : 12 mois à compter du crédit, réglable.
- **Bons déjà dépensés (confirmé)** : si des bons à retirer ont déjà été utilisés, le
  montant manquant est déduit du remboursement versé au client. Règle à valider par le
  conseil juridique et l'expert-comptable d'ExploCardio.fr.
- **Bons rendus après expiration (confirmé)** : des bons rendus à la suite d'un
  remboursement gardent leur date de validité d'origine ; s'ils sont expirés, ils
  bénéficient d'un délai de grâce de 30 jours.
- **Mises à disposition et financement (confirmé)** : les échéances mensuelles de mise à
  disposition et les commandes financées ne créditent pas de bons d'achat et n'ouvrent pas
  de droits.
- **Usage des bons (confirmé)** : sur les achats uniquement, pas sur les mises à
  disposition ni sur les frais de port (aligné sur F04). Pas de montant minimum de
  commande.
- **Cumul par défaut (confirmé)** : un seul code promo par commande ; promotions et
  dégressifs se cumulent avec les bons d'achat.
- **Assistance au mois** : non retenue pour la V1 ; seule la formule à l'acte est proposée.
  Une formule mensuelle pourra être étudiée plus tard.
- **Prix de l'assistance à l'acte** : non fixé par la spec ; donnée à saisir au back-office
  avant la mise en ligne.
- **Vocabulaire** : la cagnotte est exprimée en euros de bons d'achat, pas en points. Les
  « points » évoqués dans le parcours de la charte désignent cette cagnotte.
- **Demandes d'assistance** : la façon dont le client sollicite l'assistance (téléphone,
  formulaire, rendez-vous) et le traitement des demandes relèvent d'un autre module.
- **Codes promo** : F06 les définit ; F04 les applique au panier. Les écrans de codes promo
  prévus par F04 sont ceux de F06.
- **Traitement comptable et fiscal** : celui des bons d'achat et des remises est à valider
  par l'expert-comptable d'ExploCardio.fr.
- **Référentiel de gestion** : cagnottes, droits et promotions sont lus et écrits par la
  couche d'accès unique, reprise par Odoo lors de F11.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
