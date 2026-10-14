# Contrat du connecteur emailing

## Opérations

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Envoyer un email transactionnel | modèle, destinataire, données, clé | identifiant d'envoi | `ServiceUnavailable` | F02, F04, F05, F06, F10, F12 |
| Envoyer une notification d'équipe | canal (`email`, `sms`), destinataires, texte, clé | identifiant d'envoi | `ServiceUnavailable` | F10, F13 |
| Mettre à jour un contact marketing | email, consentements | — | `ServiceUnavailable` | F01, F02, F10 |
| Lire l'état de remise | identifiant d'envoi | état (`envoye`, `remis`, `rejete`) | `NotFound` | F10 |

Les modèles sont rendus par le site (à la charte) avant l'envoi ; le connecteur transmet le
rendu final. Aucune donnée de patient, de carte ni aucun mot de passe dans un message.

## Mode démonstration

- Aucun email ni SMS réel n'est envoyé (FR-029).
- Chaque message est enregistré dans la **boîte de démonstration** (base du site) avec son
  type, son destinataire, son objet, son rendu et son déclencheur ; il est consultable par
  l'administrateur dans le back-office (F13).
- L'état de remise est simulé à « remis », ou à « rejeté » pour les adresses de test
  prévues à cet effet.
