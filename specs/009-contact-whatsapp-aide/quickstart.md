# Guide de validation — F09 Contact WhatsApp et centre d'aide

Prérequis : ceux de F11 à F12 ; base de démonstration remplie ; site lancé.

## 1. Contact (US1, US2)

- Pied de page, page Assistance, « Mon compte », une fiche produit, une page d'aide : numéro,
  horaires, état (ouvert ou prochaine réponse), boutons « Appeler » et « Écrire sur WhatsApp »,
  mention « Ne transmettez aucune donnée patient ». En démonstration, les boutons ouvrent la
  page qui explique que personne n'est contacté.
- Connecté : le message pré-rempli contient « Dr [nom], cabinet [cabinet] », rien d'autre ;
  déconnecté : le modèle à compléter (vérifiable dans le lien en mode réel, tests unitaires).
- Un email transactionnel (boîte de démonstration) contient le bloc de contact.

## 2. Réglages (US4)

Back-office → Coordonnées et textes : changer le numéro, les horaires, ajouter une fermeture
exceptionnelle → mis à jour partout en moins de 5 minutes ; numéro vidé → plus aucun bouton,
lien vers le formulaire de contact.

## 3. Centre d'aide (US3, US4)

Back-office → Centre d'aide : créer un mode d'emploi relié au Holter DMS 300-4L, le publier ;
`/aide` : le retrouver par appareil et par recherche ; la fiche du Holter le propose ; une
vidéo n'est publiable qu'avec ses sous-titres et sa transcription ; une question de FAQ
ouverte remonte en tête ; une recherche sans résultat invite à écrire sur WhatsApp.

## 4. Droits (US5)

« Mon compte » : l'état des droits d'assistance à côté du contact ; Back-office → Assistance :
client retrouvé par son téléphone.

## 5. Contrôles automatiques

```bash
npm run lint
npm test
npm run test:e2e -- tests/e2e/f09
```
