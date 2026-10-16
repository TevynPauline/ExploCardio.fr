# Contrat des écrans — F02

## Pages publiques et compte

| Chemin | Écran | Accès |
|---|---|---|
| `/inscription` | Formulaire d'inscription (FR-001 à FR-009), offre de bienvenue si active | Visiteur |
| `/inscription/verifier-email` | « Consultez votre boîte » ; renvoi de l'email (3 par heure) | Visiteur |
| `/connexion` | Connexion (reprend la page de F11 dans la mise en page publique) ; `?retour=` | Visiteur |
| `/connexion/double-authentification` | Second facteur ou code de secours (F11) | En cours de connexion |
| `/mot-de-passe-oublie` | Demande du lien ; message identique que l'email soit connu ou non | Visiteur |
| `/reinitialiser-mot-de-passe?token=` | Nouveau mot de passe, règles affichées | Lien reçu |
| `/mon-compte` | Tableau de bord : statut, offre de bienvenue, rubriques, contact WhatsApp | Client connecté |
| `/mon-compte/informations` | Identité, téléphone, spécialité, email (avec confirmation), numéro (demande de changement) | Client connecté |
| `/mon-compte/adresses` | Cabinet, livraison, facturation | Client connecté |
| `/mon-compte/preferences` | Newsletter : abonnement, désabonnement | Client connecté |
| `/mon-compte/securite` | Mot de passe, double authentification, codes de secours | Client connecté |
| `/mon-compte/donnees` | Export des données, suppression du compte | Client connecté |
| `/mon-compte/commandes`, `factures`, `locations`, `bons-achat`, `assistance`, `logiciels` | « Bientôt disponible », sans erreur | Client connecté ; remplacées par F04, F05, F06, F12 |

Un visiteur non connecté qui ouvre une page `/mon-compte…` est redirigé vers
`/connexion?retour=…`. Le lien « Mon compte / Connexion » de l'en-tête (F01) mène à
`/mon-compte` quand le visiteur est connecté.

## Back-office

| Chemin | Écran | Rôles |
|---|---|---|
| `/admin/comptes` | Comptes par statut (en attente d'abord), recherche | admin, commercial |
| `/admin/comptes/[id]` | Fiche : identité, numéro, cabinet, adresses, dates, décisions ; valider, refuser (motif), suspendre (motif), rétablir | admin, commercial |
| `/admin/comptes/demandes` | Changements de numéro à vérifier ; signalements (réinscription d'un compte refusé) | admin, commercial |
| `/admin/comptes/reglages` | Validation automatique, offre de bienvenue (active, texte), spécialités | admin |

Chaque action est journalisée (auteur, date, avant, après). Messages d'erreur reliés aux
champs, saisie conservée (FR-043).

## Règles communes

- Aucun message ne révèle si une adresse email possède un compte (FR-031, SC-012) :
  inscription refusée, connexion échouée et mot de passe oublié affichent un texte identique
  dans tous les cas.
- Parcours d'inscription et de connexion réalisables au clavier seul (SC-011).
- Aucun champ libre n'invite à saisir une donnée de patient (FR-009).
