# Data Model — F25 Branchement de Brevo

Aucune migration. F25 s'appuie sur les modèles de F10 et ajoute de la configuration.

## Configuration (variables d'environnement)

| Variable | Obligatoire | Valeurs | Rôle |
|---|---|---|---|
| `CONNECTOR_EMAILING` | non (défaut `demo`) | `demo` \| `real` | mode du connecteur |
| `EMAILING_API_KEY` | en `real` | clé API Brevo | secret, jamais affiché |
| `EMAILING_ENVIRONNEMENT` | en `real` | `recette` \| `production` | active la garde de recette |
| `EMAILING_ADRESSES_AUTORISEES` | en `real` + `recette` | liste séparée par des virgules : `nom@domaine.fr` ou `@domaine.fr` | seuls destinataires permis en recette |
| `EMAILING_TEST_DESTINATAIRE` | tests de contrat en `real` | une adresse autorisée | boîte recevant les tests |

Règles :

- valeur hors liste pour `EMAILING_ENVIRONNEMENT` = variable manquante → `ConfigurationIncomplete` ;
- en recette, liste vide ou absente = variable manquante ;
- en production, liste renseignée = ignorée + signalement (FR-017) ;
- comparaison des adresses insensible à la casse, espaces retirés.

## Envoi (existant, F10)

Champs utilisés par F25 : `cle`, `famille`, `destinataire`, `etat`, `motif`,
`connecteurEnvoiId` (= `messageId` Brevo), `rendu`/`texte`/`objet`, `envoyeLe`, `remisLe`,
`ouvertLe`, `essais`, `prochainEssai`.

Transitions ajoutées :

| De | Événement | Vers | Effet |
|---|---|---|---|
| `programme` | recette + destinataire non autorisé | `annule` | motif « Bloqué en recette : adresse non autorisée » ; rendu conservé |
| `envoye`/`remis` | suivi `plainte: true` | inchangé | consentement commercial retiré (une fois) |

Les autres transitions (envoyé, remis, rejeté, bloqué, reprise) sont celles de F10.

## SuiviEnvoi (contrat, évolution)

```ts
type SuiviEnvoi = {
  etat: "envoye" | "remis" | "rejete";
  ouvertLe: Date | null;
  motifRejet: string | null;
  rejetDefinitif: boolean;
  plainte: boolean; // F25 : signalé comme indésirable ou désinscrit chez l'outil
};
```

## Contact Brevo (reflet)

`email` + attributs booléens de consentement issus des préférences du site. Aucune autre
donnée (ni nom, ni cabinet, ni téléphone).

## Étiquette d'idempotence

`cle:` + 32 premiers caractères hexadécimaux du SHA-256 de la clé de l'envoi. Ne contient
aucune donnée personnelle.
