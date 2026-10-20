# Contrats — changements apportés par F12

Les contrats complets sont dans `specs/011-connecteurs-base-demonstration/contracts/`. Les
tests de contrat communs aux deux modes sont complétés en conséquence.

## PCA (`pca.md`)

| Opération | Changement |
|---|---|
| Ouvrir un droit | Crée le **compte** du médecin s'il n'existe pas, sinon ajoute le droit au compte existant ; jamais deux comptes (clé d'idempotence : médecin + logiciel + origine) |
| Prolonger un droit — **nouvelle** | droit, nouvelle fin prévue (ou aucune) → état `actif` |
| Lire le compte d'un médecin — **nouvelle** | partenaire → `{ ref, etat } | null` |
| Mettre à jour le médecin — **nouvelle** | partenaire, email, cabinet → rien ; l'identifiant de connexion n'est pas cassé |
| Confirmer une tâche | Inchangée ; couvre aussi suspendre et rétablir en sous-mode manuel |

Sous-mode : `PCA_DEMO_SUBMODE` en démonstration ; `PCA_SUBMODE=auto|manual` en mode réel
(choisi au branchement, F14).

## Odoo (`odoo.md`)

| Domaine | Changement |
|---|---|
| Catalogue | Variante : `logicielInclus: { logiciel, moisInclus } | null` ; pour un article **logiciel**, l'offre de mise à disposition est l'abonnement mensuel (aucun appareil, `logiciel` = sa propre référence) |
| Devis | Ligne mensuelle : `priseEffet` facultative (abonnement différé à la fin d'une période incluse : premier mois à 0 maintenant) |
| Location et abonnements | `creerAbonnement` accepte `objet = logiciel` sans appareil ; `debut` dans le futur = prise d'effet différée, première échéance à cette date ; `listerLocations` renvoie aussi les abonnements logiciels ; à la fin d'une résiliation, un abonnement logiciel est terminé (aucun retour d'appareil) |

## Stripe (`stripe.md`)

| Opération | Changement |
|---|---|
| Ouvrir une session d'abonnement | `objet = logiciel` ; `premierMontantTtc = 0` et `debutPrelevements` pour une prise d'effet différée (autorisation seule) |

## Emails (`emails.md`, connecteur emailing)

Accès ouvert (lien vers la plateforme, première connexion) ; fin de période incluse proche
(proposition d'abonnement) ; fin des droits proche (date, délai de grâce, récupération des
données) ; passage en délai de grâce ; accès fermé ; accès suspendu ; accès rétabli. Mêmes
emails dans les deux sous-modes. Alertes à l'équipe : tâche créée, tâche en retard, échec
d'ouverture, accès non fermé à temps.
