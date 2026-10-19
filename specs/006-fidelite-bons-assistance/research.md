# Recherche et décisions techniques — F06 Fidélité, bons d'achat et droits d'assistance

Point de départ : F11 a posé dans le connecteur Odoo de démonstration les tables du programme
(programme de fidélité, règles d'assistance, mouvements de cagnotte, droits, promotions) et une
première version des règles (`fidelite.appliquerRegles`). F04 a branché les remises, les codes
promo et le champ « bons d'achat » du devis (désactivé tant que F06 n'est pas livré). F06
complète les règles, les rend conformes à la spec et livre les écrans. **Aucune nouvelle
technologie.**

## R1. Odoo calcule, le site affiche

- **Decision** : toutes les règles (paliers, montant éligible, validité, droits, prolongation,
  plafond, restitution, retrait, expiration) sont appliquées par Odoo — en phase 1 par le
  connecteur de démonstration, avec un **jeu de commandes de référence** partagé par les tests
  de contrat des deux modes (FR-039, SC-013). Le site ne calcule rien : il lit la cagnotte,
  les droits, l'estimation des gains et l'historique.
- Odoo applique les règles **lui-même** à chaque changement d'état d'une commande (payée,
  virement reçu, annulée, remboursée) ; l'appel du site après paiement (F04) reste, idempotent.

## R2. Règles en vigueur à la date de la commande (FR-016, FR-021, FR-026)

- **Decision** : au paiement, Odoo fige sur la commande les **règles appliquées** (taux du
  palier, validité, seuil et durée des droits) ; chaque mouvement les conserve. Un
  remboursement partiel recalcule le crédit sur le montant restant **avec ces règles figées**.
  Modifier les règles ne touche que les commandes suivantes.

## R3. Bons d'achat : lots, ordre de consommation, expiration

- **Decision** : chaque crédit (et chaque restitution) forme un **lot** avec sa date de fin de
  validité. Une utilisation consomme les lots **qui expirent le plus tôt d'abord** (FR-012).
  Une action planifiée d'Odoo (simulée en démonstration) crée un mouvement « expiration » pour
  le reste d'un lot échu. Le solde reste la somme des mouvements (FR-022, SC-004).
- **Restitution** (FR-017) : les bons rendus retrouvent **leur date de validité d'origine** ;
  s'ils sont déjà expirés, ils bénéficient de **30 jours de grâce** (hypothèse confirmée).
- **Bons déjà dépensés à retirer** (hypothèse confirmée) : Odoo **déduit le montant manquant du
  remboursement** versé au client et prévient l'équipe ; en démonstration, la décision de
  remboursement est réduite d'autant, avec une note.

## R4. Droits d'assistance

- Règles de F11 conservées (seuil par commande, durée, cumul ou remise à zéro, plafond,
  jamais de raccourcissement, retrait de la période apportée). Ajouts : statut « inactif »
  calculé dès la date de fin passée ; **ajustements manuels** dans Odoo avec motif et auteur
  (FR-027) ; seuls les consommables et accessoires comptent (FR-009) ; mises à disposition et
  commandes financées n'ouvrent rien (hypothèse confirmée).

## R5. Assistance à l'acte (FR-013, FR-038)

- **Decision** : un article de service « Assistance à l'acte — une intervention », prix HT fixé
  dans Odoo, s'achète par le panier et le paiement par carte de F04. À l'enregistrement de la
  commande payée, Odoo crée une **intervention payée** (disponible). L'équipe la **clôt** dans
  Odoo (démonstration : bouton) ; le client est prévenu. Elle ne crédite ni bons ni droits.
  Proposée seulement aux clients sans droits actifs.

## R6. Bons d'achat dans le panier (FR-012, F04)

- **Decision** : le paramètre `fidelite.bons_au_panier` passe à vrai. Le client choisit le
  **montant** à utiliser (par défaut, le maximum utilisable), plafonné par Odoo au montant
  éligible des achats (hors port, hors mises à disposition). Les bons ne sont débités qu'au
  paiement (mouvement « utilisation » à la création de la commande) ; un paiement abandonné ne
  débite rien.
- Le panier affiche ce que la commande **rapportera** (bons, droits) et **ce qui manque pour
  le palier suivant** ; les fiches consommables affichent ce que l'achat rapporte (FR-024).

## R7. Suivi et emails

- **Decision** : le site relève toutes les 5 minutes les **nouveaux mouvements** et les
  **changements de droits** dans Odoo (même mécanique que F04 et F05) et prévient le client
  une seule fois : crédit, ouverture ou prolongation des droits, retrait, restitution,
  intervention clôturée. Tâche quotidienne : rappel avant la **fin des droits** et avant
  l'**expiration des bons** (délais réglés au back-office), et, en démonstration, l'expiration
  des lots échus.

## R8. Promotions (FR-030 à FR-034)

- Le calcul reste celui du devis de F04 (remises automatiques, ventes flash, code promo, règle
  de cumul affichée). F06 ajoute : **limites d'usage** des codes (nombre total, par client,
  montant minimum, clients nouveaux), l'**annonce automatique** des promotions en cours dans le
  bandeau et sur les fiches (prix d'origine, prix remisé HT, date de fin), et leur arrêt à la
  minute de la date de fin (SC-010).

## R9. Écrans

- **Mon compte** : « Bons d'achat » (solde, prochaine expiration, historique relié aux
  commandes) et « Droits d'assistance » (statut, date de fin, origine, comment prolonger,
  assistance à l'acte et interventions). Avertissement avant suppression du compte (RGPD) :
  cagnotte et droits perdus.
- **Back-office** : page « Assistance » en lecture seule pour toute l'équipe (recherche par
  nom, cabinet, email, téléphone, RPPS, SIRET) ; aucun écran de réglage du programme
  (FR-029). **Démonstration → Paramètres commerciaux** reste l'équivalent d'Odoo (règles,
  promotions, ajustements manuels, clôture d'intervention).
