# Guide de validation — F06 Fidélité, bons d'achat et droits d'assistance

Prérequis : ceux de F11 à F05 ; base de démonstration remplie ; site lancé ; boîte de
démonstration ouverte.

## 1. Gagner des bons (US1)

Avec les paliers par défaut, payer trois commandes de consommables de 400, 800 et 1 200 € HT :
crédits de 0, 40 et 120 €, emails, historique avec la commande et la fin de validité. Commande
mixte équipement + consommables : seuls les consommables comptent. Au panier : gains annoncés
et manque pour le palier suivant.

## 2. Droits d'assistance (US2)

Commande au-dessus du seuil : droits actifs, email avec la date de fin. Seconde commande :
fin prolongée (cumul, plafond). Sous le seuil : rien, et ce qui manquait est affiché.

## 3. Utiliser ses bons (US3)

Solde 120 € : utiliser 50 € → reste 70 € ; les bons qui expirent le plus tôt partent en premier.
Paiement abandonné : rien n'est débité.

## 4. Annuler ou rembourser (US4)

Rembourser intégralement une commande qui a crédité et ouvert des droits : retraits. Commande
payée en partie en bons : bons rendus avec leur validité d'origine. Remboursement partiel :
crédit recalculé au taux de la date de commande.

## 5. Mon compte et équipe (US5, US6, US9)

« Bons d'achat » : solde = somme de l'historique. « Droits d'assistance » : statut et
prolongation ; sans droits, assistance à l'acte achetée par carte, intervention visible, puis
clôturée par l'équipe. Back-office « Assistance » : client retrouvé en moins de 15 secondes.

## 6. Règles et promotions (US7, US8)

Modifier un taux au démonstrateur : la commande suivante suit le nouveau taux, les crédits
passés ne bougent pas. Créer une vente flash : annoncée au bandeau et sur la fiche, appliquée
au panier, arrêtée à sa fin.

## 7. Contrôles automatiques

```bash
npm run lint
npm test
npm run test:e2e -- tests/e2e/f06
```
