# Data model — F26

Aucune migration.

## Fichier stocké (existant, table `fichier_stocke`)

| Champ | Rôle |
|---|---|
| `chemin` | adresse publique `/stockage/<dossier>/<nom aléatoire>.<ext>` (clé) |
| `type`, `taille`, `octets`, `creeLe` | inchangés |

- Mode démonstration : lieu de rangement des fichiers (comme aujourd'hui).
- Mode réel : secours en lecture pour les fichiers pas encore repris ; plus aucune
  écriture. Lignes effacées seulement par `--effacer-la-base` (R7).

## Objet du compartiment (mode réel)

- Clé : `stockage/<dossier>/<nom>.<ext>` (chemin public sans le `/` initial).
- `Content-Type` déposé pour information ; le type servi est déduit de l'extension.
- Jamais modifié après dépôt.

## Configuration (variables d'environnement)

| Variable | Valeurs | Obligatoire en réel |
|---|---|---|
| `CONNECTOR_STOCKAGE` | `demo` (défaut) / `real` | — |
| `STOCKAGE_ENVIRONNEMENT` | `recette` / `production` | oui |
| `STOCKAGE_COMPARTIMENT` | nom contenant le mot de l'environnement, pas l'autre | oui |
| `STOCKAGE_CLE_ACCES` | identifiant de clé Scaleway (`SCW…`) | oui |
| `STOCKAGE_CLE_SECRETE` | clé secrète | oui |
| `STOCKAGE_REGION` | défaut `fr-par` | non |

## Bilan de reprise (sortie du script, non stocké)

`copiés`, `déjà présents`, `en erreur` (avec chemins), `restant en base`.
