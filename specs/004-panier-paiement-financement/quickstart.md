# Guide de validation — F04 Panier, paiement et financement

Prérequis : ceux de F11 à F03 ; base de démonstration remplie ; site lancé ; compte client
validé (par exemple `client.droits@demo.explocardio.test`) ; emails dans la boîte de
démonstration.

## 1. Panier (US1)

Ajouter un Holter à l'achat et une mise à disposition. Attendu : blocs « Paiement unique »
(HT, remises, port, TVA, TTC) et « Abonnement mensuel » (1er mois, mois suivants). Modifier
une quantité : totaux mis à jour. Code `DEMO10` : remise sur sa ligne ; code inconnu : motif.
Se déconnecter, se reconnecter : panier retrouvé ; un panier de visiteur est fusionné à la
connexion.

## 2. Payer par carte (US2, US3)

Commander : adresses préremplies, livraison standard ou express, carte American Express sur
la page de paiement de démonstration, issue « accepté ». Attendu : confirmation, email, commande
dans « Mon compte » et dans la base fictive, facture « FICTIVE », stock décompté, cadeau de
bienvenue à 0 € pour une première commande. Refaire avec « refusé » (panier conservé),
« authentification forte », « confirmation répétée » (une seule commande), « confirmation
tardive » en fermant la page (commande créée ensuite). Passer un article en rupture avant de
payer : alerte et retour au panier.

## 3. Virement (US4)

Choisir le virement : confirmation avec RIB et référence, commande « en attente de
paiement ». Dans **Démonstration → Paiements**, « Virement reçu » : commande payée, facture,
email.

## 4. Mise à disposition (US5)

Panier mixte : payer l'achat puis autoriser le prélèvement (carte ou SEPA). Attendu :
abonnement, location dans « Mon compte », facture du premier mois. Simuler une échéance :
facture et email.

## 5. Financement (US6, US8)

Depuis une fiche, « Demander mon financement » : équipements et coordonnées préremplis ;
envoyer. Attendu : statut « reçue » dans « Mon compte », emails sans nom d'organisme. Dans
`/admin/financements`, passer à « accordée », créer la commande financée : visible sans montant
à payer.

## 6. Suivi et remboursement (US7)

Dans **Démonstration → Paiements**, marquer une commande expédiée (transporteur, suivi) :
email et suivi dans « Mon compte ». Décider un remboursement : avoir, statut « remboursée ».

## 7. Contrôles automatiques

```bash
npm run lint
npm test
npm run test:e2e -- tests/e2e/f04
```

Attendu : une seule commande par paiement dans tous les cas ; aucune donnée de carte ; tunnel
au clavier seul ; du panier à la confirmation en moins de 2 minutes.
