# Contrat du connecteur PCA (plateforme Cloud HDS)

Aucune donnée de patient ne transite par ce connecteur ; seuls l'identité professionnelle du
médecin, son email, son RPPS ou SIRET, son cabinet et les logiciels sont transmis (F12,
FR-026). Aucun mot de passe n'est jamais reçu ni stocké.

## Opérations

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Ouvrir un droit | médecin, logiciel, date de début, date de fin prévue, clé | état (`actif`, ou `a_ouvrir` en mode manuel) | `CloudAccessDenied`, `ServiceUnavailable` | F05, F12 |
| Passer en délai de grâce | droit, date | état `grace` | `NotFound` | F12 |
| Suspendre / rétablir | droit, motif | état | `NotFound` | F05, F12, F13 |
| Fermer un droit | droit, date | état `ferme` | `NotFound` | F12 |
| Lire les droits d'un médecin | médecin | droits et états | — | F12, F13 |

## Deux sous-modes du mode réel (F12, FR-019)

- **automatique** : les opérations agissent directement sur la plateforme ;
- **manuel** : chaque opération crée une tâche pour l'équipe et renvoie l'état
  `a_ouvrir` (ou `a_fermer`) ; la confirmation de la tâche dans le back-office fait passer
  le droit à son état final.

Le sous-mode ne change rien pour le médecin (mêmes états visibles, mêmes emails).

## Mode démonstration

Simule les deux sous-modes (choix par variable `PCA_DEMO_SUBMODE=auto|manual`) et tient les
états dans la base de démonstration. Aucun compte réel n'est créé.
