# Research: F27 — Nouveau menu et page Informatique médicale

État des lieux lu dans le code le 2026-11-16 et dans la copie de test d'Odoo (lecture seule).

## R1 — Où lire l'arborescence des catégories

- **Decision**: le connecteur Odoo expose l'arbre des catégories d'Odoo **sous chaque catégorie
  reliée à une rubrique** (correspondance F14 : « Holter ECG » → `holter-ecg`, « MAPA » → `mapa`,
  etc.). La racine de chaque branche est la rubrique (code inchangé) ; ses descendants reçoivent
  un code stable `<rubrique>/<slug du chemin relatif>` (ex.
  `holter-ecg/accessoires-holter-ecg/cables-pour-holter-ecg`). Chaque article garde `categorie`
  (sa rubrique, inchangée) et gagne `categorieDetail` (le code de sa catégorie la plus précise).
  `listerArticles(code)` accepte un code de rubrique ou de sous-catégorie et inclut les
  sous-niveaux.
- **Rationale**: le réel lit déjà `product.category` (`complete_name`, `parent_id`) pour
  calculer la rubrique ; la base de démonstration a déjà une table `product_category` avec
  parent. On garde les rubriques, dont dépendent les adresses des familles et des fiches
  produit, la recherche et les gammes phares.
- **Alternatives considered**: catégories de site e-commerce d'Odoo (`product.public.category`,
  multiples) — module Site web non installé ; arborescence saisie au back-office du site — 
  duplication interdite par le principe III.

## R2 — Profondeur et ordre

- **Decision**: trois niveaux au plus sous la rubrique dans le menu (rubrique, sous-catégorie,
  sous-sous-catégorie) ; un niveau plus profond est rattaché à son ancêtre de niveau 3. Ordre
  alphabétique (Odoo n'a pas d'ordre sur `product.category`), sauf l'ordre fixe des colonnes.
  Une catégorie sans article vendable publié est masquée.
- **Rationale**: lisible dans un seul panneau ; fidèle à Odoo sans paramètre d'ordre à gérer.

## R3 — Consommables

- **Decision**: un article est « consommable » si sa propriété Odoo « Type d'article » vaut
  « Consommable » (`TypeArticle = "consommable"`, déjà obligatoire et lue depuis F14 ; déjà
  présente dans le seed de démonstration). Le panneau range les consommables par rubrique :
  Holter ECG, MAPA, effort, ECG de repos ; la rubrique `accessoires` (Odoo « Consommables »)
  devient la colonne « Autres consommables ».
- **Rationale**: aucune nouvelle donnée à saisir pour Régis ; l'étiquette produit initialement
  envisagée ferait doublon avec cette propriété.
- **Alternatives considered**: étiquettes produit Odoo (`product.tag`) — saisie en double ;
  catégorie « Consommables » seule — empêche la double présence.

## R4 — Adresses

- **Decision**: les adresses des familles (`/holter-ecg`, `/holter-ecg/ecg-de-repos`,
  `/holter-tensionnel`, `/epreuve-effort`, `/accessoires-consommables`) et des fiches produit ne
  changent pas. Les liens du panneau « Produits » mènent à la page de famille filtrée
  `?categorie=<code>`. L'ancien filtre `?type=<slug>` (sous-catégories F03) est ignoré (liste
  complète). Nouvelle page `/consommables`. `/services/hebergement-donnees-sante` est redirigée
  en 308 vers `/informatique-medicale#hebergement` (`next.config.ts`, `redirects`).
- **Rationale**: zéro page introuvable et zéro perte de référencement (SC-007) avec un seul
  renvoi.

## R5 — Sous-catégories du site (F03)

- **Decision**: supprimer la table `sous_categorie`, la colonne `contenu_produit.sous_categorie_id`,
  la page « Catalogue → Sous-catégories » du back-office et le champ correspondant de la fiche
  contenu. Le filtre « Type » des pages de famille devient un filtre « Catégorie » alimenté par
  l'arbre d'Odoo.
- **Rationale**: deux classements concurrents (site et Odoo) dérouteraient Régis et dupliquent
  une donnée d'Odoo. Les seules sous-catégories saisies sont celles de la démonstration.
- **Alternatives considered**: les garder comme filtre secondaire — double saisie durable.

## R6 — Forme du menu

- **Decision**: `EntreeNavigation` gagne `colonnes` (titre, lien, liens de niveau 2, chacun avec
  ses liens de niveau 3) et `carte` (encadré d'appel, ou rappel « Vos consommables »). Les entrées sont :
  `produits`, `consommables`, `informatique`, `location`, `services` ; « Qui sommes-nous » et
  « Contact » sont deux liens simples. Le comportement de survol a62ebf2 est conservé tel quel.
  Produits phares et liens rapides du menu (`ElementMenu`, F01) sont supprimés à la demande de
  Régis (2026-11-16) : table, réglage du back-office et tests associés.
- **Rationale**: un seul composant de panneau pour toutes les entrées ; préparé côté serveur.

## R7 — Menu mobile

- **Decision**: `MenuMobile` affiche les mêmes données en listes dépliables imbriquées
  (`<details>`-like accessible, boutons `aria-expanded`), niveau 3 inclus, cibles 44 px.

## R8 — Textes de la page

- **Decision**: module `src/domaine/informatique/textes.ts` sur le modèle de `textes-raisons.ts`
  (F23) : clés de `contenu`, valeurs par défaut reprenant la maquette, longueurs maximales ;
  éditeur dans « Contenus → Informatique médicale ». Les mentions de conformité (HDS, ISO 27001,
  RGPD, CNCF) sont des textes modifiables, validés par Régis avant la mise en ligne.

## R9 — Questionnaire

- **Decision**: composant client à trois étapes, état local, validation par étape côté
  navigateur et validation complète côté serveur (Server Action) avec le module de domaine,
  comme le formulaire de contact ; anti-robots (`anti-robots.ts`) et limites
  (`limites.ts`) des formulaires publics ; rien n'est enregistré avant l'envoi final. Session
  lue côté serveur pour préremplir et rattacher le compte.
- **Rationale**: même protection et même expérience que les formulaires existants.

## R10 — Notification

- **Decision**: `notifierEquipe` (F10) avec la clé `informatique:<id>`, canal e-mail, adresse
  de l'équipe déjà paramétrée pour les messages de contact, objet « Nouvelle demande
  Informatique médicale ». Le connecteur emailing de démonstration simule ; F25 (Brevo) rend
  l'envoi réel sans changement ici.

## R11 — Lien suivi

- **Decision**: paramètre de fonctionnement `partenaire.pca.lien` (adresse complète, défaut
  `https://patient-care-anywhere.com/`) ; Régis y colle le lien suivi que Nelson lui fournit,
  quel que soit le format du code. Liens sortants : nouvel onglet, `rel="noopener"`, mention
  « (nouvel onglet) » pour les lecteurs d'écran.
- **Rationale**: le format du code de suivi est inconnu ; une adresse complète couvre tous les
  cas sans code à faire évoluer.

## R12 — Motif « trois points »

- **Decision**: retirer le motif devant les titres des colonnes des panneaux du menu et devant
  les titres de la page Informatique médicale uniquement ; le reste du site est inchangé.
