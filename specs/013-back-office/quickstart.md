# Guide de validation — F13 Back-office

Prérequis : ceux de F11 à F10 ; base de démonstration remplie ; comptes de démonstration
`admin@`, `support@` (et un commercial créé au cours du guide).

## 1. Rôles (US9, SC-003, SC-008)

- Administrateur → Équipe : inviter un commercial ; l'email d'invitation arrive dans la boîte
  de démonstration ; il choisit son mot de passe et active la double authentification.
- Commercial : voit Clients, Demandes, Catalogue, Contenus, Commandes, Locations, Logiciels
  Cloud (lecture), Paramètres → Offre de bienvenue ; toute autre adresse (Paramètres,
  Emails, Équipe, Journal, Démonstration) renvoie « réservée à un autre rôle ».
- Support : fiche client en lecture seule, ouvre ou ferme un accès Cloud, rien d'autre ; aucun
  bouton de modification visible.
- Désactiver le commercial : il ne peut plus se connecter ; ses actions restent au journal.
  Tenter de désactiver le dernier administrateur : refusé.

## 2. Comptes et clients (US1, US5, SC-004, SC-005)

À traiter → un compte en attente (prioritaire s'il a commandé une mise à disposition
express) → Valider : fiche créée dans la base fictive, email dans la boîte. Support : retrouver
`client.droits` par son téléphone en moins de 15 secondes ; droits, locations, accès Cloud,
commandes et factures affichés.

## 3. Contenus et paramètres (US2, US4, SC-001, SC-006)

- Bandeau : nouveau message en préparation → Aperçu (ordinateur et mobile) → Publier :
  visible sur le site en moins d'une minute.
- Pages : modifier « Assistance », aperçu, publier ; revenir au texte d'origine.
- Paramètres : passer l'heure limite à 13:00 → la date proposée pour une mise à disposition
  suit ; « 25:00 » refusé avec l'explication ; historique → « Remettre cette valeur ».
- Deux onglets sur le même contenu : la seconde enregistrement est refusé avec l'auteur et
  l'heure de la première, saisie conservée.

## 4. Demandes, journal, démonstration (US6 à US8)

- Messages de contact : nouveau → en cours → traité, avec note.
- Panne simulée « Odoo » puis 5 opérations : Journal → Connecteurs, filtre « erreur » ; une
  alerte dans la boîte de démonstration.
- Session : 30 minutes sans action (réglage à 1 minute pour l'essai) → reconnexion demandée.

## Contrôles automatiques

```bash
npm test -- tests/unit/back-office
npx playwright test tests/e2e/f13
```
