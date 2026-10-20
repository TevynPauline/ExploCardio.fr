# Modèle de données — F12 Accès à la plateforme Cloud HDS

## 1. Base du site — changements

| Objet | Changement |
|---|---|
| `AccesLogiciel` — **nouveau** (`acces_logiciel`) | Compte client, partenaire Odoo, logiciel (référence d'article), libellé ; **origine** `periode_incluse` / `location` / `abonnement` / `manuel` ; référence source (commande, abonnement) ; référence du droit sur la plateforme (`pcaRef`, jamais d'identifiant de connexion) ; **état** `en_ouverture` / `actif` / `grace` / `suspendu` / `ferme` ; `debut`, `finPrevue`, `finGrace` ; envois faits (`ouvertureNotifiee`, `rappelPeriodeEnvoye`, `rappelFinEnvoye`, `graceNotifiee`, `fermetureNotifiee`) ; `alerteLe` (dernière alerte d'accès non fermé) ; créé le, modifié le. Unicité : (compte, logiciel, origine, référence source) |
| `TacheAcces` — **nouveau** (`tache_acces`, sous-mode manuel) | Accès, action `ouvrir` / `suspendre` / `retablir` / `fermer`, date à respecter, état `a_faire` / `realisee`, alerte envoyée le, confirmée le, confirmée par |
| `SuiviLocation` | Champs `droitCloudRef`, `droitCloudEtat` **retirés** ; les droits déjà ouverts sur la plateforme sont repris dans `AccesLogiciel` par `reprendreAccesExistants` à la réinitialisation de la démonstration |
| `Parametre` (démonstration) | `demo.pca_sous_mode` : sous-mode de la plateforme simulée réglé à l'écran de démonstration |
| `JournalAction` | Actions `cloud.ouverture`, `cloud.prolongation`, `cloud.grace`, `cloud.suspension`, `cloud.retablissement`, `cloud.fermeture`, `cloud.tache_confirmee`, avec auteur ou déclencheur et motif (FR-018) |
| `DemandeDevis` | Objet « Hébergement des données de santé — intérêt » pour le formulaire d'intérêt (aucun changement de structure) |
| `Parametre` | `cloud.url_plateforme` ; `cloud.delai_grace_jours` (30) ; `cloud.rappel_periode_jours` (30) ; `cloud.rappel_fin_jours` (7) ; `cloud.aide_premiere_connexion` (texte) |

Transitions d'un accès :

```text
en_ouverture ──confirmation / ouverture auto──▶ actif ──fin prévue──▶ grace ──fin du délai──▶ ferme
     │                                           │  ▲                    │
     └──échec : reste en_ouverture, alerte,      ▼  │ rétablissement     └─abonnement souscrit─▶ actif
        reprise au passage suivant            suspendu
```

Prolongation (abonnement souscrit, résiliation annulée) : `finPrevue` repoussée ou effacée,
l'état reste `actif`. Fermeture sans délai de grâce : remboursement intégral avant livraison.

## 2. Base fictive (plateforme PCA simulée, Odoo) — changements

| Objet | Changement |
|---|---|
| `CompteCloud` — **nouveau** (`cloud_account`) | Partenaire (**unique**), email, cabinet, état ; créé au premier droit ouvert |
| `AccesCloud` | **Ajout** `compteId` ; clé d'idempotence par médecin et logiciel |
| `Variante` (Odoo) | **Ajouts** `logicielInclus` (référence du logiciel) et `moisInclus` (12 par défaut) pour les configurations « appareil + logiciel Cloud » |
| Logiciels Cloud (Odoo) | Offre mensuelle (`OffreMiseADisposition` avec `logiciel` = la référence du logiciel, valeur de remplacement 0) : l'abonnement, souscriptible au panier sans appareil |
| `Abonnement` (Odoo) | `objet = logiciel` utilisé ; un `debut` futur vaut prise d'effet différée (première échéance à cette date) |

Aucun mot de passe, aucun identifiant de connexion et aucune donnée de patient n'est stocké
d'un côté ou de l'autre (FR-014, SC-005).
