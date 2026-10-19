# Guide de validation — F05 Mise à disposition Express

Prérequis : ceux de F11 à F04 ; base de démonstration remplie ; site lancé ; emails dans la
boîte de démonstration ; compte administrateur pour l'écran **Démonstration → Locations**.

## 1. Dépannage express (US1)

Ouvrir `/mise-a-disposition` un jour ouvré avant l'heure limite. Attendu : équipements,
premier mois et mois suivants HT puis TTC, livraison « demain ». Choisir un équipement,
commander : date du lendemain proposée, autres jours ouvrés au choix ; récapitulatif complet
(pack, échéance, valeur de remplacement, conditions) ; payer (carte ou SEPA). Location
« commandée » dans « Mon compte ». Changer l'heure limite au back-office pour la placer avant
l'heure actuelle : la première date devient le jour ouvré suivant. Passer tous les appareils en
maintenance : plus de promesse de lendemain, première date réelle affichée.

## 2. Sans compte (US2)

Visiteur : choisir une mise à disposition, « Commander », créer son compte, confirmer
l'email : reprise du tunnel, appareil, date et kit conservés. Message « expédition après
vérification de votre compte » avant de payer. Payer : alerte prioritaire dans la boîte de
démonstration. Valider le compte : expédition débloquée (date recalculée si l'heure limite
est passée, email). Refuser un autre compte dans le même cas : commande annulée, remboursée.

## 3. Kit (US5)

Première location d'un DMS : kit ajouté d'office. Seconde location du même type : pas de kit,
message « déjà en votre possession ». Location d'un autre type : son kit est demandé.
Enregistrer un kit au démonstrateur : il n'est plus demandé.

## 4. Expédition, suivi, résiliation, retour (US1, US3, US4)

Démonstration → Locations : préparer et expédier (appareil, suivi) : n° de série dans
« Mon compte », email avec suivi et contact pour la formation, accès Cloud ouvert, alerte
formation. Marquer livrée : location « en cours ». Résilier depuis « Mon compte » : date de
fin, date limite de retour, étiquette PDF, fermeture Cloud programmée, prélèvement arrêté.
« Prolonger » : résiliation annulée. Résilier à nouveau, enregistrer le retour : location
terminée, email ; avec dégradation : montant facturé et indiqué.

## 5. Échéances, impayés, retards (US6)

Avancer la date : rappel avant échéance, échéance prélevée et facturée. Prélèvement échoué :
email, nouvelles tentatives ; au terme : accès suspendu, retour demandé, équipe alertée.
Résiliation sans retour : rappels, puis facturation du mois suivant au-delà de la tolérance
(prévenu avant).

## 6. Achat ou financement (US7)

Depuis une location : « Passer à l'achat » ajoute l'appareil neuf au panier ; « Passer au
financement » ouvre la demande préremplie.

## 7. Contrôles automatiques

```bash
npm run lint
npm test
npm run test:e2e -- tests/e2e/f05
```

Attendu : jamais deux locations sur un même appareil, même en commandes simultanées ; kit
jamais facturé deux fois d'office ; disponibilité à jour en moins d'une minute ; écrans
conformes WCAG 2.2 AA.
