# Contrat du connecteur PCA (plateforme Cloud HDS)

Aucune donnée de patient ne transite par ce connecteur ; seuls l'identité professionnelle du
médecin, son email, son RPPS ou SIRET, son cabinet et les logiciels sont transmis (F12,
FR-026). Aucun mot de passe n'est jamais reçu ni stocké.

## Opérations

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Ouvrir un droit | médecin, logiciel, date de début, date de fin prévue, clé | état (`actif`, ou `a_ouvrir` en mode manuel) ; crée le **compte** du médecin s'il n'existe pas, sinon y ajoute le droit (un seul compte par médecin, F12 FR-003) | `CloudAccessDenied`, `ServiceUnavailable` | F05, F12 |
| Prolonger un droit | droit, nouvelle fin prévue (ou aucune) | état `actif` (sort du délai de grâce) | `NotFound` | F12 |
| Passer en délai de grâce | droit, date | état `grace` | `NotFound` | F12 |
| Suspendre / rétablir | droit, motif | état | `NotFound` | F05, F12, F13 |
| Fermer un droit | droit, date | état `ferme` (ou `a_fermer` en mode manuel) ; le compte et les autres droits sont conservés | `NotFound` | F12 |
| Confirmer une tâche | droit | état final (`actif` ou `ferme`) | `NotFound` | F12 |
| Lire les droits d'un médecin | médecin | droits et états | — | F12, F13 |
| Lire le compte d'un médecin | médecin | `{ ref, etat }` ou rien | — | F12 |
| Mettre à jour le médecin | médecin (email, cabinet) | — ; l'identifiant de connexion reste valable | — | F12 |

## Deux sous-modes du mode réel (F12, FR-019)

- **automatique** : les opérations agissent directement sur la plateforme ;
- **manuel** : chaque opération crée une tâche pour l'équipe et renvoie l'état
  `a_ouvrir` (ou `a_fermer`) ; la confirmation de la tâche dans le back-office fait passer
  le droit à son état final.

Le sous-mode ne change rien pour le médecin (mêmes états visibles, mêmes emails).

Choix du sous-mode réel : variable `PCA_SUBMODE=auto|manual`, au branchement (F14).

## Mode démonstration

Simule les deux sous-modes (réglage de l'écran de démonstration « Pannes simulées », sinon
variable `PCA_DEMO_SUBMODE=auto|manual`) et tient les comptes et les états dans la base de
démonstration. Aucun compte réel n'est créé.

## Ce que Nelson doit fournir (F12, D7)

- une API pour créer le compte d'un médecin, ajouter, prolonger, passer en lecture seule
  (délai de grâce), suspendre et retirer un droit, et lire les droits ;
- l'invitation à créer son mot de passe envoyée par la plateforme elle-même : le site ne voit
  jamais d'identifiant de connexion ;
- si possible, une connexion unique depuis « Mes logiciels Cloud ».

À défaut d'API, le sous-mode manuel : l'équipe réalise chaque ouverture et fermeture sur la
plateforme et la confirme dans Back-office → Logiciels Cloud.
