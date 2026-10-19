# Recherche et décisions techniques — F12 Accès à la plateforme Cloud HDS

Point de départ : F11 a livré le connecteur PCA (ouvrir, passer en délai de grâce, suspendre,
rétablir, fermer, confirmer une tâche, lire les droits) et son mode démonstration, avec deux
sous-modes (`PCA_DEMO_SUBMODE=auto|manual`). F05 l'utilise déjà : l'accès au logiciel d'une
location est ouvert à l'expédition, suspendu en cas d'impayé, rétabli, puis fermé à la fin, et
sa référence est rangée dans `SuiviLocation`. F04 fournit le mécanisme d'abonnement (Stripe :
carte ou SEPA ; Odoo : abonnement `objet = logiciel` déjà prévu). F12 reprend ces morceaux,
les regroupe et livre les écrans. **Aucune nouvelle technologie.**

## R1. Où vit l'état d'un accès

- **Decision** : le site tient un registre de ses **accès logiciels** (base du site) : médecin,
  logiciel, origine (période incluse à l'achat, location, abonnement, geste manuel), référence
  de la commande ou de l'abonnement, référence du droit sur la plateforme, état, dates (début,
  fin prévue, fin du délai de grâce), envois déjà faits. La plateforme reste la référence de ce
  qui est réellement ouvert ; le site la relit pour afficher et rattraper.
- **Rationale** : la constitution (principe IV) confie au site la gestion des comptes des
  médecins et l'ouverture ou la fermeture de leurs droits ; ce n'est pas une donnée de gestion
  d'Odoo (aucune valeur en euros). Un registre unique remplace les champs `droitCloud*` de
  `SuiviLocation` (repris par une migration) et sert aussi aux achats et aux abonnements.
- **Alternatives** : laisser chaque module (F04, F05) tenir ses propres références → états
  dispersés, impossible d'afficher « Mes logiciels Cloud » ni d'alerter de façon uniforme.

## R2. Un seul compte par médecin (FR-003, SC-003)

- **Decision** : le contrat PCA gagne la notion de **compte** : `ouvrirDroit` crée le compte du
  médecin s'il n'existe pas, sinon y ajoute le droit (clé d'idempotence par médecin et
  logiciel) ; `lireCompte` et `mettreAJourMedecin` (email, cabinet modifiés sur le site) sont
  ajoutés. En démonstration, une table `CompteCloud` unique par partenaire le prouve, y
  compris pour deux souscriptions simultanées (contrainte d'unicité).

## R3. Déclencheurs

| Événement | Effet | Où |
|---|---|---|
| Achat payé d'une configuration « appareil + logiciel Cloud » | Ouverture pour la période incluse (mois fixés dans Odoo par produit, 12 par défaut) | effets de commande de F04 |
| Location incluant un logiciel, expédiée | Ouverture (au plus tard à la livraison) | suivi des locations de F05 |
| Abonnement logiciel payé | Ouverture, ou prolongation sans interruption de l'accès existant | effets d'abonnement de F04 |
| Résiliation (location, abonnement), fin de période incluse | Fin prévue enregistrée ; à la date : délai de grâce ; au terme : fermeture | tâche horaire de F12 |
| Résiliation annulée (« Prolonger ») | Fin programmée annulée | F05 |
| Impayé non régularisé / régularisation | Suspension / rétablissement | F05 |
| Compte du site suspendu / supprimé | Suspension / fermeture (délai de grâce) | F02 (validation, RGPD) |
| Email ou cabinet modifié | Mise à jour du médecin sur la plateforme | F02 (Mon compte) |
| Remboursement intégral d'un achat **avant la livraison** | Fermeture immédiate, sans délai de grâce | suivi des commandes de F04 |

Toutes les actions passent par **un seul module de domaine** (`src/domaine/cloud/`), qui
appelle le connecteur, met à jour le registre, journalise (FR-018), prévient le client et
crée la tâche de l'équipe en sous-mode manuel.

## R4. Sous-mode manuel (FR-019 à FR-022)

- **Decision** : le connecteur renvoie `a_ouvrir` / `a_fermer` ; le domaine crée alors une
  **tâche** (médecin, coordonnées professionnelles, logiciel, action, date à respecter). Le
  médecin voit « en cours d'ouverture » et ne reçoit l'email qu'à la confirmation : les emails
  et les écrans sont identiques dans les deux sous-modes (SC-006). Une tâche d'ouverture non
  confirmée la veille de la livraison, ou de fermeture à sa date, alerte l'équipe une fois
  (SC-007). En mode réel, le sous-mode est choisi par une variable (`PCA_SUBMODE`), au
  branchement (F14).

## R5. Fin des droits (FR-007 à FR-011, FR-029, FR-030)

- Tâche **horaire** (`acces-cloud`) : à la fin prévue → délai de grâce (consultation et
  récupération des données seulement) ; au terme du délai (30 jours par défaut, réglé au
  back-office) → fermeture. Rappels : **30 jours** avant la fin d'une période incluse
  (proposition de l'abonnement), **7 jours** avant toute fin de droits (date de fin, délai de
  grâce, récupération des données) ; délais réglés au back-office. Un accès qui devrait être
  fermé et ne l'est pas (plateforme indisponible, tâche non faite) déclenche une alerte
  (FR-011), sans jamais être oublié.
- Un abonnement souscrit avant la fin de la période incluse prend effet à cette date : l'accès
  est simplement prolongé, sans passer par le délai de grâce (SC-011).

## R6. Souscrire l'abonnement logiciel (F04 FR-049, décision D3 de F04)

- **Decision** : la souscription réutilise **le panier et le tunnel de F04**, comme une mise
  à disposition sans appareil : ni date de livraison, ni kit, ni réservation d'appareil ;
  carte ou SEPA ; conditions d'abonnement à accepter. Pour une poursuite après la période
  incluse, la prise d'effet est la fin de la période et **rien n'est prélevé avant** :
  l'autorisation est donnée maintenant, la première mensualité tombe à la prise d'effet.
  Bouton « Poursuivre avec l'abonnement » dans « Mes logiciels Cloud » et sur la fiche du
  logiciel.
- **Alternatives** : parcours de souscription séparé → doublerait la gestion des paiements,
  des CGV et des confirmations déjà éprouvées.

## R7. « Mes logiciels Cloud » et lien vers la plateforme

- Liste des accès (nom, état, début, fin prévue, fin du délai de grâce) ; bouton « Accéder à
  la plateforme » (nouvel onglet) quand l'accès est actif ou en délai de grâce ; aide à la
  première connexion (contenu éditable en attendant le centre d'aide de F09) ; bouton
  « Écrire sur WhatsApp » existant (F09) ; offre et souscription pour un client sans
  logiciel. Aucune donnée de patient, aucun mot de passe : le site ne reçoit jamais
  d'identifiant de la plateforme (la plateforme envoie elle-même l'invitation).
- L'adresse de la plateforme est un paramètre du back-office ; **en démonstration, elle
  mène à une page simulée du site**, jamais au vrai service.

## R8. Gestion par l'équipe (FR-015 à FR-018)

- Page **Back-office → Logiciels Cloud** (administrateur et support ; pas les commerciaux) :
  tâches à faire en tête, accès par client (recherche comme la page Assistance de F06),
  actions ouvrir, suspendre, rétablir, fermer, avec motif obligatoire, journalisées. F13
  reprendra cette page dans sa navigation.

## R9. Offre « en préparation » (FR-023 à FR-025)

- Le badge existant (`accueil.badge_hebergement`, F01) gouverne la page « Hébergement des
  données de santé » : tant qu'il est présent, aucune souscription à l'offre d'hébergement et
  un **formulaire d'intérêt** (coordonnées, besoin), enregistré comme une demande de devis
  (F03) visible au back-office et copiée en opportunité dans Odoo. Retirer le badge présente
  l'offre normalement.
