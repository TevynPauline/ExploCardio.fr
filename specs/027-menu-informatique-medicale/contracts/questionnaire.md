# Contrat : envoi du questionnaire Informatique médicale

Server Action `envoyerDemandeInformatique(donnees, jetonAntiRobots)` appelée à la fin de l'étape 3.

## Entrée

Champs décrits dans [data-model.md](../data-model.md) (`DemandeInformatique`), sans `etat`,
`notes`, `compteId` (déduit de la session), `consentement` (case cochée → date serveur).

## Validation (serveur, même module que la validation par étape du navigateur)

| Champ | Erreur affichée |
|---|---|
| interets vide | « Cochez au moins un sujet. » |
| medecins, postes hors bornes | « Indiquez un nombre entre 1 et 50. » / « … entre 1 et 200. » |
| logiciels.autre sans précision | « Précisez le logiciel. » |
| nom, cabinet vides | « Indiquez votre nom. » / « Indiquez le nom du cabinet. » |
| codePostal | « Indiquez un code postal de 5 chiffres. » |
| email | « Indiquez une adresse e-mail valide. » |
| telephone | « Indiquez un numéro de téléphone français. » |
| consentement absent | « Cochez la case pour que nous puissions vous recontacter. » |

## Réponses

- `{ ok: true }` → confirmation « Merci, votre demande est bien reçue. Nous vous appelons sur
  le créneau choisi. » ; focus sur la confirmation.
- `{ ok: false, erreurs: { champ: message } }` → retour à la première étape en erreur, focus sur
  le premier champ en erreur.
- `{ ok: false, motif: "robot" | "limite" }` → message générique des formulaires publics.

## Effets

1. Création de la `DemandeInformatique` (état `nouvelle`).
2. `notifierEquipe({ canal: "email", destinataires: [adresse de l'équipe], objet: "Nouvelle demande Informatique médicale", texte, declencheur: "informatique" }, "informatique:<id>")`.
   Une panne du connecteur emailing n'empêche pas l'enregistrement (envoi reprogrammé).
3. Aucune donnée n'est envoyée à 2i ni à PCA.
