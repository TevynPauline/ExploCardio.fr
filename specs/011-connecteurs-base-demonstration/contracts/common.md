# Règles communes à tous les connecteurs

## Sélection du mode

- Une variable d'environnement par connecteur : `CONNECTOR_ODOO`, `CONNECTOR_STRIPE`,
  `CONNECTOR_PCA`, `CONNECTOR_EMAILING`, valeurs `demo` ou `real`. Valeur par défaut :
  `demo`.
- Le **registre des connecteurs** est le seul point d'accès. Il lit ces variables au
  démarrage et fournit l'implémentation. Les pages, composants, actions serveur et tâches
  de fond ne connaissent que les interfaces.
- En mode `real`, le registre vérifie au démarrage la présence des variables du service
  (identifiants, adresses). S'il en manque, le connecteur lève `ConfigurationIncomplete` à
  chaque appel ; il ne bascule jamais seul en démonstration (FR-007).

## Erreurs typées (identiques dans les deux modes)

| Erreur | Signification | Exemple de déclencheur en démonstration |
|---|---|---|
| `ServiceUnavailable` | Le service ne répond pas ou est en panne | Panne simulée activée dans le back-office |
| `PaymentDeclined` | Paiement refusé | Issue « refusé » sur la page de paiement de démonstration |
| `AuthenticationRequired` | Authentification forte demandée | Issue « authentification forte » |
| `OutOfStock` | Quantité indisponible | Stock à zéro ou état « indisponible » dans la base |
| `CloudAccessDenied` | Ouverture d'accès refusée par la plateforme | Cas prévu dans la base |
| `NotFound` | Objet inconnu (référence, client, commande) | Référence absente de la base |
| `ConfigurationIncomplete` | Connecteur réel sans configuration complète | Mode `real` sans variables |
| `DemoDataRejected` | Tentative d'envoyer une donnée de démonstration à un service réel | Donnée marquée fictive passée à une implémentation `real` (FR-017, SC-012) |

Chaque erreur porte un message en français destiné à l'équipe et un code stable utilisé par
les pages pour afficher le message client prévu par la spec concernée.

## Règles transverses

- **Idempotence** : toute écriture reçoit une clé d'idempotence fournie par l'appelant ;
  rejouer la même écriture ne crée rien de plus.
- **Journal** : chaque appel est inscrit au journal des connecteurs (connecteur, mode,
  opération, objet, résultat, durée), sans donnée de carte ni donnée de patient.
- **Données de démonstration marquées** : tout objet issu de la base de démonstration porte
  une marque « fictif » ; les implémentations `real` refusent un objet ainsi marqué.
- **Garde réseau** : dès qu'un connecteur est en mode `demo`, aucune requête sortante vers
  le domaine de ce service n'est autorisée côté serveur.
- **Pannes simulées** : en mode `demo`, chaque connecteur consulte l'état « panne simulée »
  et lève `ServiceUnavailable` si elle est active (FR-025).
- **Pas de dépendance au mode** dans le résultat : mêmes formes de données, mêmes erreurs.
