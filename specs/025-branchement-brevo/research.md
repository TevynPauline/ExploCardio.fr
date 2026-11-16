# Research — F25 Branchement de Brevo

## R1. Appels à Brevo : HTTP direct, sans SDK

- **Decision** : `fetch` vers l'API v3 (`https://api.brevo.com/v3`), en-tête `api-key`,
  délai de 10 s, aucune reprise interne (la reprise est déjà faite par le domaine, F10
  FR-034).
- **Rationale** : quatre appels seulement ; même approche que le client Odoo (F14) ; pas de
  dépendance supplémentaire ; `fetch` injectable pour les tests.
- **Alternatives** : SDK officiel (dépendance lourde, typage peu utile ici).

## R2. Envoi

- **Decision** : `POST /smtp/email` avec `sender` (`ExploCardio.fr`, `contact@explocardio.fr`),
  `replyTo` identique, `to`, `subject`, `htmlContent`, `textContent`, `tags`
  (`cle:<empreinte>`, famille, modèle) et, pour service et commercial, `headers`
  `List-Unsubscribe: <url>` et `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
  L'expéditeur est une constante du connecteur (pas une variable : il est vérifié dans
  Brevo).
- **Rationale** : rendu fait par le site (F10, D2) ; désinscription en un clic vers la route
  existante du site (RFC 8058).
- **Alternatives** : modèles Brevo (exclus : les modèles vivent au back-office).

## R3. Idempotence

- **Decision** : Brevo n'offre pas de clé d'idempotence. Chaque envoi porte l'étiquette
  `cle:<sha256(cle) tronqué à 32>`. Avant un `POST`, le connecteur cherche cette étiquette
  dans les événements des 7 derniers jours (`GET /smtp/statistics/events?tags=…`) : si un
  envoi existe, il renvoie son `messageId` sans renvoyer l'email.
- **Rationale** : le domaine ne rappelle le connecteur qu'en cas d'échec ou de délai dépassé ;
  la vérification préalable couvre le cas « Brevo a envoyé mais la réponse s'est perdue ».
  Coût : une lecture par envoi, négligeable aux volumes prévus.
- **Risque résiduel** : événement pas encore visible lors d'une reprise immédiate ; la
  première reprise du domaine a lieu après 1 minute, délai suffisant en pratique.
- **Alternatives** : en-tête personnalisé seul (non interrogeable) ; table locale
  (ne couvre pas la réponse perdue).

## R4. Suivi sans webhook

- **Decision** : `lireSuivi(messageId)` lit `GET /smtp/statistics/events?messageId=…&days=7`.
  La tâche `emails-suivi` passe de 15 à 5 minutes. Aucun webhook.
- **Rationale** : le site relève déjà le suivi par tâche (F10) ; pas d'adresse publique à
  protéger (Brevo ne signe pas ses webhooks) ; FR-012 est satisfaite sans message entrant ;
  SC-003 (5 minutes) tenu.
- **Alternatives** : webhook Brevo avec jeton secret dans l'adresse (plus réactif, mais une
  route publique de plus et une authentification faible).

## R5. Plaintes et désinscriptions venues de Brevo

- **Decision** : `SuiviEnvoi` gagne `plainte: boolean` (événement `spam`). Le domaine retire
  alors le consentement commercial (newsletter et promotions). Les désinscriptions passent
  par la route du site (en-tête), jamais par Brevo ; un événement `unsubscribed` éventuel est
  traité comme une plainte.
- **Démonstration** : `plainte` vaut `true` pour `@plainte.demo.explocardio.test`, `false`
  sinon (même contrat, testable en phase 1).
- **Alternatives** : laisser Brevo gérer sa liste de blocage (le site cesserait d'être la
  référence des consentements).

## R6. Correspondance des événements

| Événement Brevo | `SuiviEnvoi` |
|---|---|
| `requests`, `deferred` | `envoye` |
| `delivered` | `remis` |
| `opened`, `uniqueOpened`, `proxyOpen` | `ouvertLe` = première date |
| `hardBounce`, `invalid`, `blocked`, `error` | `rejete`, `rejetDefinitif: true`, motif |
| `softBounce` | `rejete`, `rejetDefinitif: false`, motif |
| `spam`, `unsubscribed` | `plainte: true` |

Priorité : rejet > remis > envoyé. Un `messageId` sans aucun événement après 7 jours :
`NotFound`.

## R7. Erreurs

| Réponse Brevo | Erreur du contrat |
|---|---|
| 401, 403 (clé refusée) | `ConfigurationIncomplete` (variable `EMAILING_API_KEY`) |
| 400 `invalid_parameter` sur l'adresse | `OperationRefusee` (adresse invalide, comme en démonstration) |
| 402 ou `not_enough_credits` (quota) | `ServiceUnavailable`, cause `quota` |
| 429, 5xx, délai dépassé, réseau | `ServiceUnavailable` |

La clé est retirée de tout message, détail et journal.

## R8. Garde de recette

- **Decision** : `EMAILING_ENVIRONNEMENT` (`recette` | `production`, obligatoire en mode
  réel) et `EMAILING_ADRESSES_AUTORISEES` (obligatoire en recette : adresses exactes ou
  domaines `@exemple.fr`, séparés par des virgules).
  - **Domaine** (`envoi.ts`) : en recette, un destinataire non autorisé → l'envoi passe à
    `annule`, motif « Bloqué en recette : adresse non autorisée », rendu **conservé** pour
    consultation au back-office. Pas d'alerte (ce n'est pas une anomalie).
  - **Connecteur** : refuse (`OperationRefusee`) tout envoi hors liste en recette — seconde
    barrière si un appel contournait le domaine.
  - **Production** : une liste renseignée est ignorée et signalée une fois au démarrage et
    au back-office (FR-017).
- **Rationale** : même schéma que `ODOO_ENVIRONNEMENT` (F14) ; aucune migration (état
  `annule` existant).
- **Alternatives** : nouvel état `bloque_recette` (migration pour un cas de recette
  seulement) ; boîte de démonstration (masquée quand Odoo est réel).

## R9. Contacts

- **Decision** : `mettreAJourContact` → `POST /contacts` avec `updateEnabled: true` et les
  attributs de consentement (`NEWSLETTER`, `PROMOTIONS`, … en booléens). Jamais de mise en
  liste de blocage côté Brevo (elle bloquerait aussi les transactionnels).
- **Rationale** : reflet minimal (FR-013) ; aucune campagne n'est envoyée depuis Brevo.

## R10. Offre gratuite et marque Brevo

- **Decision** : à vérifier en recette (quickstart, étape 2) que les emails transactionnels
  ne portent ni logo ni pied de page Brevo. Si c'était le cas, passer à l'offre payante
  d'entrée (sans changement du site).

## R11. Quota et priorité

- **Decision** : `releverEnvois` traite les transactionnels avant les autres familles. Quota
  atteint → `ServiceUnavailable` cause `quota` : l'envoi reste programmé (reprise existante)
  et l'alerte de panne prolongée existante (30 minutes) précise « quota journalier atteint ».

## R12. Tests de contrat en mode réel

- **Decision** : en mode réel, la suite utilise `EMAILING_TEST_DESTINATAIRE` (boîte de
  l'équipe, autorisée en recette) ; les cas de rejet et de plainte, impossibles à provoquer
  à la demande chez Brevo, ne s'exécutent qu'en démonstration et sont vérifiés à la main en
  recette (quickstart). La suite reste ignorée sans clé (harnais existant).

## Mise à jour de F10

La décision D1 de F10 (envoi depuis `mail.explocardio.fr`) est remplacée : envoi depuis
`explocardio.fr` (domaine authentifié le 2026-11-14), le sous-domaine étant déjà celui de la
messagerie o2switch. Une note de renvoi sera ajoutée à `specs/010-emailing-automatise/plan.md`.
