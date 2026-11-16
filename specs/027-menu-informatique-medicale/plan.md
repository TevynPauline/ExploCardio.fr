# Implementation Plan: F27 — Nouveau menu et page Informatique médicale

**Branch**: `027-menu-informatique-medicale` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-menu-informatique-medicale/spec.md`

## Summary

La barre passe de sept à cinq entrées (Produits, Consommables, Informatique médicale, Location
et financement, Services) plus deux liens discrets. « Produits » affiche l'arborescence des
catégories d'Odoo sur trois niveaux : le connecteur Odoo l'expose désormais (aujourd'hui il
l'aplatit en cinq rubriques), et les sous-catégories saisies au back-office du site (F03) sont
retirées au profit de celles d'Odoo. « Consommables » regroupe les articles dont la propriété
Odoo « Type d'article » vaut « Consommable » (déjà lue depuis F14), rangés par rubrique. Les
adresses des familles et des fiches produit ne changent pas ; seule la page « Hébergement des
données de santé » est redirigée vers la nouvelle page « Informatique médicale ». Cette page
présente PCA (Indoor Informatique, 2i) et porte un questionnaire en trois étapes, ouvert à tous,
qui crée une demande suivie dans le back-office et notifie l'équipe par le connecteur emailing.
Les liens vers PCA utilisent un lien suivi paramétrable.

## Technical Context

**Language/Version**: TypeScript, Node 24

**Primary Dependencies**: Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4,
Prisma 7 (bases du site et de démonstration), better-auth (session pour le préremplissage)

**Storage**: base du site — nouvelle table `demande_informatique`, nouvelles clés de `contenu`
et de `parametre`, suppression de `sous_categorie` et de `contenu_produit.sous_categorie_id`,
suppression de `element_menu` (produits phares et liens rapides du menu) ;
base de démonstration — sous-catégories ajoutées
à `product_category` et produits rattachés (seed)

**Testing**: Vitest (unitaires, contrats communs aux deux modes du connecteur Odoo),
Playwright projets `mobile` et `desktop` (dont axe), Lighthouse de l'accueil en CI

**Target Platform**: navigateurs récents, ordinateur dès 1 024 px, téléphone et tablette

**Project Type**: application web Next.js unique (`app/`, `src/`, `prisma/`, `tests/`)

**Performance Goals**: accueil inchangé en CI (CLS ≤ 0,1, LCP ≤ 2 s) ; la navigation reste
préparée côté serveur et mise en cache (5 min, étiquettes catalogue et contenus) ; aucune
image ajoutée (schémas en HTML/SVG en ligne)

**Constraints**: WCAG 2.2 AA ; charte (tokens, aucun motif « trois points » sur les titres du
menu et de la page, pas de cœur ni de tracé ECG, pastels décoratifs) ; aucune donnée patient ;
aucun appel externe hors connecteurs ; en démonstration, aucun lien sortant ne transmet de
donnée (le lien suivi est une simple adresse)

**Scale/Scope**: ~35 articles et ~22 catégories Odoo aujourd'hui ; une dizaine de demandes
informatiques par mois attendues

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Le menu reste centré sur les quatre explorations. Le matériel et le support informatiques ne sont pas vendus ni mis au catalogue : orientation vers le partenaire 2i (FR-021). | OK |
| II. Simplicité et transparence | Sous-sous-catégorie en 2 clics, produit en 3 (SC-001). Prix du panneau Consommables en TTC puis HT (F22). | OK |
| III. Connecteurs, Odoo source de vérité | L'arborescence et le type « Consommable » sont lus dans Odoo par le connecteur, en démo comme en réel ; les sous-catégories propres au site (F03) sont supprimées, ce qui retire une duplication existante. Le back-office gère une nouvelle sorte de **demande** : voir ci-dessous. | OK après amendement |
| IV. Aucune donnée patient | Le questionnaire ne demande aucune donnée de santé ; champs libres courts et avertissement visible (FR-030). | OK |
| V. Sécurité et conformité | Anti-robots et limites d'envoi des formulaires publics ; journalisation des changements d'état ; RGPD (consentement, conservation, registre). Aucun secret : le lien suivi est une adresse publique. | OK |
| VI. Règles paramétrables au bon endroit | Aucune valeur en euros. Textes, lien suivi et adresse de notification sont des paramètres de fonctionnement du back-office. | OK |
| VII. Identité visuelle | Tokens, schémas en formes de la charte, motif « trois points » retiré des titres demandés. | OK |
| VIII. Accessibilité | Méga-menus conservés (clavier, Échap, focus) ; questionnaire à étapes annoncées, erreurs liées aux champs ; cibles 44 px ; mouvement réduit respecté. | OK |
| IX. Ton éditorial | Textes sobres, sans les promesses chiffrées du site de PCA (FR-024). | OK |
| X. Petits incréments | Six user stories livrables séparément ; critères [Phase 1] / [Phase 3]. | OK |
| XI. Langue et périmètre | Français ; médecins en France métropolitaine. | OK |

**Amendement adopté le 2026-11-16 (PATCH, 2.3.0 → 2.3.1)** : le principe III limite les demandes du
back-office à « financement et devis ». Une demande « Informatique médicale » est une demande
commerciale de même nature (contact entrant à rappeler). Proposition de libellé : « les
demandes (financement, devis et informatique médicale) ». Le principe IV nomme « Nelson /
Patient Care Anywhere » : préciser « Indoor Informatique (2i) / Patient Care Anywhere ». À faire
valider par Pauline : **validé et appliqué le 2026-11-16** (constitution 2.3.1). Aucun autre
écart.

**Re-check après la phase 1** : le modèle de données et les contrats ne créent aucune copie de
donnée d'Odoo (le connecteur ne fait que relayer `categ_id`, `complete_name` et la propriété
déjà lue). Rien de nouveau ne contrevient à la constitution.

## Project Structure

### Documentation (this feature)

```text
specs/027-menu-informatique-medicale/
├── plan.md              # Ce fichier
├── research.md          # Décisions R1 à R12
├── data-model.md        # Entités, migrations, états
├── quickstart.md        # Scénarios de vérification
├── contracts/
│   ├── odoo-catalogue.md        # Évolution du contrat Catalogue du connecteur Odoo
│   ├── navigation.md            # Forme des entrées du menu (serveur → composants)
│   └── questionnaire.md         # Action d'envoi, validations, réponses, notification
├── checklists/requirements.md
└── tasks.md             # Créé par /speckit-tasks
```

### Source Code (repository root)

```text
src/connecteurs/odoo/
├── interfaces/catalogue.ts          # Categorie (+ rubrique, niveau), Article/ResumeArticle (+ categorieDetail)
├── real/instantane.ts               # garde le chemin Odoo de chaque modèle ; arbre des catégories reliées
├── real/correspondance.ts           # codes stables des sous-catégories (slug du chemin)
├── real/catalogue.ts                # listerCategories() = arbre ; listerArticles(code) = sous-niveaux compris
└── demo/catalogue.ts                # mêmes règles sur product_category de la base de démonstration
prisma/demo/seed/catalogue.ts        # sous-catégories reprises du rangement Odoo ; produits rattachés
prisma/site/schema.prisma            # DemandeInformatique ; ElementMenu et SousCategorie supprimées
src/domaine/
├── navigation.ts                    # cinq entrées ; colonnes Produits / Consommables ; liens fixes
├── familles.ts                      # inchangé pour les adresses ; libellés de colonnes
├── catalogue/categories.ts          # filtre « catégorie » d'Odoo à la place du filtre « type » (F03)
├── catalogue/consommables.ts        # liste des consommables par rubrique (nouveau)
├── informatique/                    # textes de la page, questionnaire (validation, enregistrement, notification), suivi
└── liens.ts, pages.ts, recherche/   # adresses mises à jour (Hébergement → Informatique médicale)
app/(public)/
├── informatique-medicale/page.tsx   # nouvelle page ; section #hebergement
├── consommables/page.tsx            # « Tous les consommables », par examen
├── services/hebergement-donnees-sante/  # supprimé (redirection 308)
└── [familles]/page.tsx              # filtre ?categorie= ; ?type= ignoré
app/(back-office)/admin/
├── demandes/informatique/           # liste, fiche, suivi (états, notes)
├── contenus/informatique-medicale/  # textes de la page
├── parametres/                      # lien suivi PCA
├── catalogue/sous-categories/       # supprimé
└── contenus/menus/                  # supprimé (produits phares et liens rapides)
src/ui/en-tete/                      # BarreNavigation (5 entrées + 2 liens), MegaMenu (colonnes à 3 niveaux), MenuMobile (listes dépliables)
src/ui/informatique-medicale/        # En-tête et schéma, Bénéfices, Étapes, Hébergement, Prestataire, Questionnaire, Partenaire
next.config.ts                       # redirection permanente de l'ancienne page Hébergement
tests/contract/odoo/                 # arbre des catégories et filtre par sous-niveau, communs aux deux modes
tests/unit/                          # navigation, consommables, validation du questionnaire, suivi
tests/e2e/f27/                       # menu (ordinateur, téléphone), page, questionnaire, back-office, redirection
```

**Structure Decision**: application unique existante ; on étend le connecteur Odoo (interface
et deux modes), le domaine de navigation et les composants d'en-tête, et l'on ajoute un module
de domaine `informatique` avec sa page publique et son onglet de back-office.

## Phasing

1. **Fondations** : amendement de la constitution ; contrat Catalogue étendu (arbre, sous-niveaux,
   `categorieDetail`) et ses tests communs ; seed de démonstration rangé ; migration de la base du
   site (table `demande_informatique`, retrait de `element_menu` et des sous-catégories F03).
2. **US1 Produits** : domaine de navigation, panneau à colonnes, filtre `?categorie=` des pages
   de famille.
3. **US2 Informatique médicale** : page, textes, questionnaire, enregistrement, notification ;
   redirection de l'ancienne page.
4. **US3 Consommables** : panneau et page `/consommables`.
5. **US4 Barre** : cinq entrées, liens de droite, menu mobile, retrait du motif ; liens internes.
6. **US5 Suivi** : onglet back-office, états, notes, journal.
7. **US6 Lien suivi** : paramètre et liens sortants.
8. **Finition** : accessibilité (axe), Lighthouse, plan du site, recherche, tests e2e existants
   adaptés (F01 navigation, F03 services, F12 hébergement).

## Complexity Tracking

Aucune violation à justifier (l'amendement du principe III est une précision de périmètre, pas
une dérogation).
