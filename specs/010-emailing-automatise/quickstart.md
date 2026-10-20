# Guide de validation — F10 Emailing automatisé

Prérequis : ceux de F11 à F12 ; base de démonstration remplie ; site lancé ; Back-office →
Démonstration → Boîte de démonstration pour lire les emails (aucun n'est réellement envoyé).

## 1. Emails transactionnels (US1)

- Inscription, validation du compte, commande payée par carte, expédition (bouton de la
  démonstration), demande de financement : un email chacun dans la boîte, en moins de
  5 minutes, un seul même en rejouant l'événement.
- Le compte a tout désactivé et n'est pas abonné : il reçoit quand même ces emails.
- L'email d'expédition contient le suivi ; celui de facture mène à « Mon compte → Factures ».
- Commande avec une adresse `…@rejet.demo.explocardio.test` : l'équipe est alertée.

## 2. Réapprovisionnement (US2)

Back-office → Démonstration : donner à un compte trois commandes d'électrodes espacées de
60 jours, la dernière il y a 53 jours ; lancer les scénarios (bouton « Lancer maintenant ») →
une relance avec le prix HT, le gain en bons et droits, « Commander de nouveau » (le panier
s'ouvre avec l'article). Relancer : rien de plus. Passer une commande puis relancer : rien.

## 3. Consentement et préférences (US3, US4)

- Lancer une campagne de test : seul l'abonné confirmé la reçoit, avec « Se désinscrire ».
- Suivre « Se désinscrire » sans être connecté : plus aucun email commercial ; une campagne
  déjà programmée ne lui parvient pas.
- « Mon compte → Préférences » : désactiver le réapprovisionnement → plus de relance ;
  réactiver. Même réglage depuis le lien d'un email, sans connexion.

## 4. Alertes, panier, impayés (US5 à US7)

- Droits d'assistance à 5 jours de leur fin, bons à 20 jours de l'expiration : une alerte
  chacun, une seule fois ; plus rien après une commande qui prolonge les droits.
- Panier d'un compte laissé 24 h (avancer l'horloge de la démonstration) : un rappel aux prix
  du jour ; aucun si le panier est commandé.
- Commande par virement : relances à J-5, J-2, J-1 avant l'échéance, la dernière annonçant
  l'annulation et sa date ; plus rien dès le virement reçu. Location en prélèvement refusé :
  relances jusqu'à la suspension annoncée.

## 5. Administration (US8)

- Scénarios : passer l'avance du réapprovisionnement à 10 jours, désactiver le panier
  abandonné → appliqué aux envois suivants.
- Modèles : modifier l'objet de « Confirmation de commande », prévisualiser, s'envoyer un
  test, publier (moins de 5 minutes) ; une variable inconnue est refusée ; revenir au texte
  d'origine.
- Suivi : retrouver un client, ses emails, leur état ; résultats d'un scénario.
- Panne simulée « emailing » (Pannes simulées) pendant une commande, puis fin de la panne :
  l'email part une seule fois.

## Contrôles automatiques

```bash
npm test -- tests/unit/emailing tests/contract/emailing
npx playwright test tests/e2e/f10
```
