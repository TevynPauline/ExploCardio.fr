# Guide de validation — F12 Accès à la plateforme Cloud HDS

Prérequis : ceux de F11 à F06 ; base de démonstration remplie ; site lancé ; boîte de
démonstration ouverte. Sous-mode automatique (`PCA_DEMO_SUBMODE=auto`) sauf mention.

## 1. Ouverture (US1)

- Louer un Holter DMS « + logiciel Cloud », l'expédier au démonstrateur : « Mes logiciels
  Cloud » montre le logiciel actif avant la livraison ; un email d'ouverture est reçu.
- Acheter une configuration « + logiciel Cloud » : accès actif dès le paiement, fin prévue
  à 12 mois.
- Deux logiciels pour le même médecin : un seul compte sur la plateforme simulée.
- Logiciel « DEMO-ACCES-REFUSE » : alerte à l'équipe, état « en cours d'ouverture », reprise.

## 2. Fin des droits (US2)

- Résilier la location : rappel 7 jours avant ; à la date de fin, « délai de grâce » ;
  30 jours plus tard (« Avancer la date »), « fermé ». Les autres logiciels restent actifs.
- « Prolonger » avant la fin : fermeture annulée.
- Période incluse : rappel 30 jours avant avec la proposition d'abonnement ; souscrire →
  accès continu, sans délai de grâce ; ne pas souscrire → délai de grâce puis fermeture.

## 3. Mon compte (US3)

Accès actif, en délai de grâce et fermé affichés avec leurs dates ; « Accéder à la
plateforme » ouvre la page simulée dans un nouvel onglet ; aide à la première connexion et
WhatsApp présents ; client sans logiciel : offre et souscription. Aucun mot de passe.

## 4. Équipe (US4, US5)

- Back-office → Logiciels Cloud : ouvrir, suspendre, rétablir, fermer avec un motif ;
  journal ; email au client. Un commercial n'y a pas accès.
- `PCA_DEMO_SUBMODE=manual` : une location expédiée crée une tâche ; le client voit « en
  cours d'ouverture » ; tâche confirmée → actif et email ; tâche non confirmée la veille de
  la livraison → alerte.

## 5. Offre en préparation (US6)

Page « Hébergement des données de santé » : badge « En préparation », aucune souscription,
formulaire d'intérêt → demande visible au back-office ; badge retiré → offre normale.

## 6. Contrôles automatiques

```bash
npm run lint
npm test
npm run test:e2e -- tests/e2e/f12
```
