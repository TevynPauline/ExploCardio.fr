# Modèle de données — F13 Back-office

Base du site uniquement. Aucune donnée de gestion d'Odoo n'est copiée : la fiche client et la
fiche produit lisent Odoo par son connecteur, en lecture seule.

## Utilisateur (`utilisateur`, existant) — ajouts

| Champ | Type | Règles |
|---|---|---|
| desactiveLe | date ? | non nul : connexion refusée, sessions supprimées |
| desactivePar | texte ? | auteur de la désactivation |
| inviteLe | date ? | date de l'invitation (équipe) |

Rôle existant : `client | admin | commercial | support`. Invariant : au moins un utilisateur
`admin` sans `desactiveLe`.

## MessageContact (`message_contact`, existant) — ajouts

| Champ | Type | Règles |
|---|---|---|
| etat | texte → enum `EtatMessage` `nouveau | en_cours | traite` | défaut `nouveau` (migration des valeurs existantes) |
| notes | texte ? | note interne, 2 000 caractères au plus |
| traitePar | texte ? | |
| traiteLe | date ? | |
| modifieLe | date | verrou optimiste |

## DemandeDevis (`demande_devis`, existant) — ajouts

| Champ | Type | Règles |
|---|---|---|
| traitePar | texte ? | |
| modifieLe | date | verrou optimiste |

## Contenu (`contenu`, existant)

Type `page` utilisé pour les textes des pages : `cle` = nom du texte (`assistance`,
`mentions-legales`…), corps Markdown, état `preparation | publie | retire`. Sans contenu
publié pour un nom : le fichier `contenus/<nom>.md` s'applique (version d'origine).

## Parametre / HistoriqueParametre (existants)

Inchangés. Nouveaux paramètres :

| Clé | Défaut | Rôle |
|---|---|---|
| `securite.inactivite_minutes` | 30 | fermeture des sessions d'équipe inactives |
| `connecteurs.seuil_alerte` | 5 | erreurs successives avant alerte |

« Remettre cette valeur » = nouvelle écriture (nouvelle ligne d'historique), jamais
d'effacement.

## Catalogue des paramètres (code, pas en base)

Pour chaque paramètre réglable : `cle`, `libelle`, `theme`, `aide`, `type`
(`heure`, `entier`, `texte`, `telephone`, `dates`, `horaires`, `booleen`, `liste`), bornes,
`roles` autorisés à le modifier (`admin`, ou `admin` + `commercial` pour l'offre de bienvenue).

## Matrice des droits (code, pas en base) — voir [contracts/droits.md](contracts/droits.md)
