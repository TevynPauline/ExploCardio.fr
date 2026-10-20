# Modèle de données — F10 Emailing automatisé

Base du site (données réelles dès la phase 1), sauf mention contraire. Les données qui
déclenchent les scénarios (commandes, bons, droits, paiements) restent dans Odoo et sont lues
par son connecteur.

## Envoi (`envoi`) — trace et file

| Champ | Type | Règles |
|---|---|---|
| id | cuid | |
| cle | texte unique | idempotence : un même événement = une seule ligne (FR-007) |
| famille | enum `transactionnel` · `service` · `commercial` · `equipe` | lue dans le catalogue des modèles |
| modele | texte | code du catalogue (ex. `confirmation_commande`) |
| scenario | enum ? `reapprovisionnement` · `panier_abandonne` · `alerte_bons` · `alerte_droits` · `impaye` · `campagne` | null pour un événement simple |
| compteId | texte ? | |
| destinataire | texte | adresse confirmée du compte au moment de la création |
| declencheur | texte | événement lisible (« commande payée ») |
| variables | JSON ? | valeurs des variables du modèle ; jamais de secret ni de donnée de carte |
| rendu | texte ? | rendu conservé uniquement jusqu'à l'envoi (lien secret), puis effacé |
| objet | texte ? | objet effectivement envoyé |
| references | texte[] | articles concernés (conversion des relances) |
| campagneId | texte ? | |
| etat | enum `programme` · `envoye` · `remis` · `rejete` · `annule` · `bloque` | voir transitions |
| motif | texte ? | annulation (« désinscrit », « objet disparu », « fréquence »), blocage (« variable manquante : nom »), rejet |
| programmeLe | date | date d'envoi prévue (reportée par la fréquence ou les plages) |
| essais | entier | défaut 0 ; prochain essai espacé (1, 2, 5, 10, 30 min…) |
| prochainEssai | date ? | |
| envoyeLe, remisLe, ouvertLe | date ? | |
| connecteurEnvoiId | texte ? | identifiant renvoyé par le connecteur |
| creeLe | date | |

Index : `(etat, programmeLe)`, `(destinataire, creeLe)`, `(compteId, creeLe)`, `(scenario, creeLe)`.

Transitions :

```text
programme ──envoi accepté──▶ envoye ──suivi──▶ remis ──(ouvertLe renseigné)
    │                           └──suivi──▶ rejete
    ├── règle non remplie (désinscrit, préférence, objet disparu, fréquence > 7 j) ──▶ annule
    ├── variable obligatoire manquante, adresse suspendue ──▶ bloque (alerte équipe)
    └── connecteur indisponible ──▶ programme (essais + 1, prochainEssai)
```

## ModeleEmail (`modele_email`) — textes modifiables (D2)

| Champ | Type | Règles |
|---|---|---|
| code | texte, clé | code du catalogue |
| textesPublies | JSON ? | `{ objet, titre, apercu, blocs: { <nom>: texte } }` ; null = textes par défaut du code |
| textesBrouillon | JSON ? | |
| publieLe, publiePar | date ?, texte ? | |
| modifieLe, modifiePar | date, texte | |

Validation à la publication : uniquement les variables déclarées du modèle ; toutes les
variables obligatoires présentes dans au moins un texte ; objet ≤ 120 caractères ; aucun
lien autre que les variables d'adresse du site. Journal (`JournalAction`) à chaque
publication et retour au texte d'origine.

Le **catalogue** (code, pas en base) déclare pour chaque modèle : code, famille, libellé,
module d'origine, scénario éventuel, variables `{ nom, description, exemple, obligatoire }`,
textes par défaut, justification affichée dans les préférences (« toujours envoyé : suivi de
votre commande »).

## PreferencesEmail (`preferences_email`)

| Champ | Type | Règles |
|---|---|---|
| email | texte, clé | en minuscules |
| compteId | texte ? | |
| reapprovisionnement | booléen | défaut vrai |
| panierAbandonne | booléen | défaut vrai |
| alerteBons | booléen | défaut vrai |
| alerteDroits | booléen | défaut vrai |
| modifieLe | date | |

Absence de ligne = tout actif. Chaque changement ajoute un `Consentement` (existant) :
objet `email:reapprovisionnement` … ou `newsletter`, état, date, origine
(`mon_compte`, `lien_email`, `desinscription_un_clic`, `equipe`), texte présenté (FR-014).
L'abonnement à la newsletter reste porté par `Consentement` (comptes) et
`InscriptionNewsletter` (pied de page), inchangés.

## AdresseRejetee (`adresse_rejetee`) — D10

| Champ | Type | Règles |
|---|---|---|
| email | texte, clé | |
| rejetsTemporaires | entier | remis à 0 à chaque remise réussie |
| suspendueLe | date ? | rejet définitif ou 3 rejets temporaires |
| motif | texte ? | |
| leveeLe, leveePar | date ?, texte ? | levée par l'administrateur |

## Campagne (`campagne`) — D7

| Champ | Type | Règles |
|---|---|---|
| id | cuid | |
| type | enum `promotion` · `vente_flash` · `nouveaute` | |
| objet, titre, texte | texte | variables limitées à `{{prenom_nom}}` |
| lien, libelleLien | texte ? | adresse du site uniquement |
| programmeePour | date ? | ramenée dans les plages autorisées |
| etat | enum `brouillon` · `programmee` · `en_cours` · `envoyee` · `annulee` | |
| testEnvoyeLe | date ? | obligatoire avant de programmer |
| destinataires | entier ? | figé au lancement |
| creePar, creeLe | | |

Lancement : une ligne `Envoi` (famille commercial, clé `campagne:<id>:<email>`) par abonné
confirmé, comptes suspendus, refusés ou supprimés exclus ; désinscription avant l'envoi →
annulé à la relève (FR-013).

## Paramètres (`Parametre`, existant)

| Clé | Défaut | Rôle |
|---|---|---|
| `emailing.reappro.actif` / `.avance_jours` / `.commandes_min` / `.ecart_max_pct` | oui / 7 / 3 / 50 | relance de réapprovisionnement |
| `emailing.panier.actif` / `.delai_heures` | oui / 24 | panier abandonné |
| `emailing.alerte_bons.actif`, `emailing.alerte_droits.actif` | oui | alertes (délais : paramètres de F06) |
| `emailing.impayes.actif` | oui | relances d'impayés (niveaux : Odoo) |
| `emailing.frequence_max` / `.frequence_jours` | 2 / 7 | |
| `emailing.plage_debut` / `.plage_fin` | 8 / 19 | jours ouvrés, heure de Paris |
| `emailing.expediteur_nom` | ExploCardio.fr | |
| `emailing.alerte_panne_minutes` | 30 | alerte si l'outil reste indisponible |

## Base de démonstration (Odoo fictif)

**NiveauRelance** (`niveau_relance`) — équivalent des niveaux de relance des factures d'Odoo :
`niveau` (1, 2, 3), `joursAvantConsequence` (5, 2, 1), `annonceConsequence` (faux, faux, vrai),
`libelle`. Lu par `registre.odoo().factures.lireNiveauxRelance()`. Modifiable dans l'écran
« Paramètres commerciaux » de la démonstration (F11).

## Modifications

- `MessageDemonstration` : ajout de `ouvertLe` (renseigné à la consultation dans la boîte de
  démonstration) et de `texte` (version texte).
- Paramètre `virement.rappel_jours` (F04) : retiré, remplacé par les niveaux de relance.
