# Recherche et décisions techniques — F13 Back-office

## R1. Inventaire : ce qui existe déjà (2026-10-21)

45 écrans existent sous `/admin`, livrés par les modules :

| Rubrique | Écrans existants | Module | Manque pour F13 |
|---|---|---|---|
| Comptes | liste à valider, fiche, demandes (changement de numéro), réglages (validation, offre de bienvenue), RGPD | F02, F05 | regroupement « Clients », fiche client complète |
| Catalogue | liste (états dont « Absent d'Odoo »), fiche produit, sous-catégories, services | F03 | colonne « ce qui manque » |
| Contenus | bandeau, tuiles, actualités, menus, marques, coordonnées et textes, centre d'aide | F01, F09 | aperçu, textes des pages, verrou optimiste ; paramètres de fonctionnement à sortir de « Coordonnées et textes » |
| Demandes | financements (statuts), devis (lecture seule) | F04, F12 | états et notes des devis ; messages de contact (absents) |
| Assistance | recherche client et droits | F06 | fiche complète (locations, accès Cloud, commandes, factures) |
| Logiciels Cloud | accès et tâches | F12 | — |
| Commandes, Locations | consultation | F04, F05 | — |
| Emails | suivi, scénarios, modèles, campagnes | F10 | — |
| Démonstration | 12 outils | F11 à F10 | garde administrateur sur chaque outil |
| Paramètres | dispersés (comptes/réglages, contenus/coordonnées, emails/scénarios) | — | écran unique + historique + remise d'une valeur |
| Équipe | **absent** | — | tout |
| Journal | **absent** (`JournalConnecteur`, `JournalAction` alimentés) | F11 | tout |
| Tableau de bord | mode des connecteurs | F11 | « À traiter » |

**Constat** (corrigé le 2026-10-21 pendant l'implémentation) : chaque rubrique est gardée par
sa mise en page (`layout.tsx`) et chaque action par sa propre garde ; l'inventaire initial, qui
ne lisait que les `page.tsx`, avait conclu à tort à 32 pages sans garde. En revanche, les
listes de rôles de ces gardes, écrites module par module, s'écartent de D2 (contenus réservés à
l'administrateur, accès Cloud fermés au commercial, comptes fermés au support) et ne sont
définies nulle part en un seul endroit. La durée de session est de 7 jours pour tous, sans
fermeture après inactivité.

## R2. Une matrice des droits unique (FR-020 à FR-023, SC-003, D2)

- **Decision** : `src/lib/droits.ts` déclare, pour chaque rubrique, les rôles qui la
  **voient** et ceux qui la **modifient**, plus quelques droits fins (`comptes.suspendre`,
  `cloud.agir`, `parametres.bienvenue`). Trois points d'application :
  1. une `layout.tsx` par rubrique appelle `exigerDroit(rubrique, "voir")` → aucune page ne
     s'ouvre par son adresse sans droit ;
  2. chaque action serveur appelle `exigerDroit(rubrique, "modifier")` (ou le droit fin) ;
  3. l'interface demande `peut(role, rubrique, "modifier")` pour ne pas afficher boutons et
     formulaires interdits (FR-022 : « n'apparaissent pas »).
- Un test unitaire vérifie que **chaque** fichier `actions.ts` du back-office appelle
  `exigerDroit` ou `exigerAdministrateur` dans chacune de ses fonctions exportées ; un test de
  bout en bout ouvre **toutes** les pages avec chaque rôle et compare au tableau attendu.

## R3. Écran Paramètres et historique (FR-015 à FR-019, D3)

- **Decision** : `src/domaine/parametres/catalogue.ts` décrit chaque paramètre réglable : clé,
  libellé, thème, type (heure, entier borné, texte, liste de dates, JSON d'horaires), règle de
  validation, rôles qui le modifient. L'écran se construit depuis ce catalogue ; les écrans
  existants (« Coordonnées et textes », « Réglages des comptes », « Scénarios ») utilisent la
  même validation. `ecrireParametre` (existant) conserve l'historique ; « Remettre cette
  valeur » réécrit une ancienne valeur (nouvelle ligne d'historique, rien n'est effacé).
- Valeurs incohérentes refusées avec l'explication (heure `HH:MM`, numéro au format
  international, dates valides, bornes). Rappel visible : prix, tarifs de mise à disposition,
  remises, promotions, bons d'achat, droits d'assistance, garanties → Odoo (FR-017).

## R4. Équipe (FR-023, FR-024, D4)

- **Decision** : `Utilisateur` reçoit `desactiveLe` et `desactivePar`. Invitation : création
  de l'utilisateur (rôle d'équipe, email vérifié), puis envoi du lien « choisir mon mot de
  passe » par le parcours de réinitialisation existant de Better Auth (valable 24 h pour une
  invitation) ; la double authentification est déjà exigée à la première connexion
  (`exigerEquipe`). Désactivation : sessions supprimées, connexion refusée par un crochet
  avant connexion (même message qu'un mauvais mot de passe), actions passées intactes.
  Garde-fou : au moins un administrateur actif à tout moment (refus explicite).

## R5. Inactivité (FR-024, D5)

- **Decision** : `proxy.ts` (déjà présent pour l'accès de démonstration) tient un cookie
  `ec_activite` (horodatage, `httpOnly`, `SameSite=Lax`) sur les pages `/admin` ; au-delà du
  délai (`securite.inactivite_minutes`, 30 par défaut), redirection vers
  `/connexion?raison=inactivite` et la session est supprimée à la page de connexion. Les pages
  publiques ne sont pas concernées (un client garde sa session).

## R6. Fiche client (FR-028, FR-029, SC-005, D6)

- **Decision** : `src/domaine/clients/` réunit les lectures déjà écrites par les modules
  (compte F02, droits F06, locations F05, accès Cloud F12, commandes et factures F04 par le
  connecteur Odoo). Odoo indisponible : les blocs concernés l'indiquent, le reste s'affiche.
  La recherche reprend celle de F06 (téléphone sur les chiffres seuls), étendue à l'email et
  au SIRET. La page « Assistance » redirige vers « Clients ».

## R7. Aperçu et textes des pages (FR-006, D7, D8)

- **Decision** : route `/apercu/[type]/[id]` réservée à l'équipe (garde `exigerEquipe`),
  `noindex`, qui rend la page publique concernée avec le brouillon à la place du contenu
  publié ; l'écran d'édition l'affiche dans deux cadres (1 280 px et 390 px).
- Textes des pages : `lireTexte(nom)` (seul point de lecture, F01) cherche d'abord un
  `Contenu` de type `page` publié pour ce nom ; à défaut, le fichier `contenus/<nom>.md`
  (version d'origine). Édition en Markdown simple, nettoyé (DOMPurify, comme aujourd'hui).

## R8. Modifications simultanées (D9)

- **Decision** : verrou optimiste : chaque formulaire porte la date de dernière modification
  lue ; l'action refuse si elle a changé (`modifieLe` du contenu, dernière ligne
  d'historique du paramètre), avec l'auteur et l'heure de la modification concurrente, et la
  saisie reste dans le formulaire.

## R9. Journal (FR-030, FR-033, D10)

- **Decision** : lecture paginée de `JournalConnecteur` et `JournalAction` (filtres,
  50 lignes par page). Seuil : à chaque erreur inscrite par `envelopper` (journal des
  connecteurs), si les N dernières opérations du connecteur sont en erreur
  (`connecteurs.seuil_alerte`, 5), notification d'équipe par F10, clé
  `alerte-connecteur:<nom>:<heure>` (une par heure au plus).

## R10. Messages de contact et devis (FR-025, FR-026, D11)

- **Decision** : `MessageContact.etat` (déjà présent : « nouveau ») prend les valeurs
  `nouveau | en_cours | traite`, avec `notes`, `traitePar`, `traiteLe` ; `DemandeDevis` a
  déjà `statut` et `notes` : l'écran devient modifiable (administrateur, commercial).
  Chaque changement est journalisé.
