# Contrat — connecteur emailing, mode réel (F25)

Complète [specs/010-emailing-automatise/contracts/emailing.md](../../010-emailing-automatise/contracts/emailing.md).
Les deux modes passent la même suite (`tests/contract/emailing.test.ts`).

## Évolution commune aux deux modes

- `SuiviEnvoi.plainte: boolean` (R5). Démonstration : `true` pour
  `…@plainte.demo.explocardio.test`, sinon `false`.

## Opérations en mode réel

| Opération | Appel Brevo | Règles |
|---|---|---|
| `envoyerEmail(email, cle)` | 1. `GET /smtp/statistics/events?tags=cle:<empreinte>&days=7` ; 2. si absent : `POST /smtp/email` | garde de recette ; expéditeur et réponse `contact@explocardio.fr` ; en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` si `desinscription` ; étiquettes `cle:…`, `famille:…`, `modele:…` ; renvoie `{ envoiId: messageId }` |
| `envoyerNotificationEquipe(n, cle)` | idem `envoyerEmail` | `canal: "sms"` → envoyé par email (objet préfixé « [SMS] »), écart journalisé ; un email par destinataire, clé suffixée par l'adresse ; `envoiId` du premier |
| `mettreAJourContact({ email, consentements })` | `POST /contacts` (`updateEnabled: true`) | attributs booléens en majuscules ; aucune liste de blocage |
| `lireSuivi(envoiId)` | `GET /smtp/statistics/events?messageId=…&days=7` | correspondance [research R6](../research.md) ; aucun événement → `NotFound` |

## Erreurs (identiques aux deux modes)

| Situation | Erreur |
|---|---|
| Brevo indisponible, délai, 429, 5xx, quota (`cause: "quota"`) | `ServiceUnavailable` |
| Adresse invalide | `OperationRefusee` |
| Recette : destinataire non autorisé (seconde barrière) | `OperationRefusee` (`cause: "adresse_non_autorisee_en_recette"`) |
| Envoi inconnu | `NotFound` |
| Variable manquante, clé refusée (401/403) | `ConfigurationIncomplete` |
| Donnée de démonstration | `DemoDataRejected` (garde existante) |

## Données transmises (FR-009)

Destinataire, objet, HTML, texte, en-têtes de désinscription, étiquettes techniques. Jamais :
nom du client, cabinet, données de commande hors du rendu, donnée de patient, donnée de carte.
