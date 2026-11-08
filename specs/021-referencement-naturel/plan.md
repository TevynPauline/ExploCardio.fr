# Implementation Plan: F21 — Référencement naturel

**Branch**: `021-referencement-naturel` (travail sur `main`) | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/021-referencement-naturel/spec.md`

## Summary

Rendre explocardio.fr visible dans les moteurs de recherche sans publicité. Le lot 1, détaillé
ici, pose les fondations avant l'ouverture :

- **Une règle d'indexation unique**, sûre par défaut : la démonstration est fermée, la page
  d'attente est ouverte, la production est ouverte.
- **La page d'attente indexable** tout de suite.
- **Les éléments techniques** : plan du site, adresses canoniques, données structurées
  (entreprise, produit, fil d'Ariane, FAQ), aperçus de partage, textes alternatifs.
- **Des titres et descriptions réglables** dans le back-office, avec une page de contrôle.
- **Des seuils de performance mobile** bloquants.
- **Des tests de non-régression.**

Les lots 2 (mots-clés, textes) et 3 (guides, liens, suivi) sont esquissés en fin de document.

## Technical Context

**Language/Version**: TypeScript 5, Node 24

**Primary Dependencies**: Next.js 16 (Metadata API, `robots.ts`, `sitemap.ts`), React 19, Prisma 7 ; sharp (déjà présent) pour l'image de partage. Aucune nouvelle dépendance.

**Storage**: base du site (PostgreSQL) : nouveau modèle `ReglageReferencement`. Aucune donnée dans Odoo.

**Testing**: Vitest (fonctions pures, `robots()`, `sitemap()`), Playwright (structure des pages, hôte d'attente via `127.0.0.1` comme F17), axe (déjà en place), Lighthouse (script existant, seuils ajoutés)

**Target Platform**: Scalingo (une application sert la démonstration et la page d'attente ; plus tard la production)

**Project Type**: application web Next.js (pages publiques et back-office dans un seul projet)

**Performance Goals**: mobile : LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, score ≥ 90 (accueil, catégorie, fiche)

**Constraints**: la démonstration n'est jamais indexable (constitution V) ; prix publics HT seulement dans les données structurées ; aucun traceur ajouté ; secrets et codes de validation hors du code

**Scale/Scope**: environ 10 types de pages, quelques centaines d'adresses dans le plan du site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Le référencement porte sur la niche ; pas de pages générées en masse | ✅ |
| II. Simplicité et transparence | Prix HT publics exposés aux moteurs ; textes ajoutés aux catégories sans gêner l'accès aux produits en 3 clics (FR-025) | ✅ |
| III. Connecteurs | Prix et stock du JSON-LD lus par le registre (`registre.odoo()`), comme la fiche ; le plan du site lit seulement la base du site ; les titres sont des contenus du site, pas des données Odoo | ✅ |
| IV. Aucune donnée patient | Aucune collecte ; les guides (lot 3) excluent tout cas clinique | ✅ |
| V. Sécurité et conformité | La démonstration reste protégée et `noindex` (en-tête + balise), règle sûre par défaut ; aucun outil de mesure d'audience (FR-032) ; codes de validation en variables d'environnement | ✅ |
| VI. Règles paramétrables | Titres et descriptions modifiables depuis le back-office ; seuils de longueur = règles éditoriales fixes (pas commerciales) | ✅ |
| VII. Identité visuelle | Image de partage = logo officiel non modifié sur fond ivoire ; aucun nouvel élément d'interface publique hors charte | ✅ |
| VIII. Accessibilité | Textes alternatifs, un seul `h1` par page : le SEO renforce l'accessibilité ; bloc back-office conforme | ✅ |
| IX. Ton éditorial | Titres et descriptions automatiques sobres ; textes des lots 2 et 3 validés par Régis | ✅ |
| X. Petits incréments | 3 lots livrables séparément ; critères [Phase 1] / [Phase 3] dans la spec | ✅ |
| XI. Langue et périmètre | `lang="fr"`, `og:locale fr_FR`, France métropolitaine | ✅ |

**Écart à signaler (non bloquant)** : FR-001 modifie F17 (FR-002, page d'attente « non
indexée »). La constitution n'impose le `noindex` qu'à la **démonstration**, pas à la page
d'attente. Il faudra mettre à jour la spec F17 par une note de révision.

Re-check après la phase 1 : inchangé, aucun écart nouveau.

## Project Structure

### Documentation (this feature)

```text
specs/021-referencement-naturel/
├── plan.md              # ce fichier
├── research.md          # décisions R1 à R13
├── data-model.md        # ReglageReferencement, politique, métadonnées calculées
├── quickstart.md        # scénarios de vérification
├── contracts/
│   └── referencement.md # ce que le site expose aux moteurs, par type de page
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/lib/referencement/
├── politique.ts         # politiqueIndexation(hote, env), origineCanonique()      (R1, R2)
├── metadonnees.ts       # metadonneesReferencement(cible, auto), coupure au mot   (R5)
├── schema.ts            # constructeurs JSON-LD Organization/Product/Breadcrumb/FAQ (R6)
└── plan-du-site.ts      # adresses du plan du site depuis la base du site          (R7)

src/domaine/referencement.ts      # lecture/écriture ReglageReferencement, journal, contrôle (R12)
src/ui/DonneesStructurees.tsx     # <script type="application/ld+json"> échappé
src/ui/FilAriane.tsx              # + BreadcrumbList produit à partir des mêmes étapes
src/ui/catalogue/Fiche.tsx        # metadonneesFiche → canonique, OG, Product JSON-LD
src/ui/admin/BlocReferencement.tsx # champs titre/description, compteur, aperçu du résultat

app/layout.tsx                    # metadataBase, OG par défaut, verification, garde « ferme »
app/robots.ts                     # selon politiqueIndexation (hôte lu dans les en-têtes)
app/sitemap.ts                    # nouveau
app/opengraph-image.png           # image de partage par défaut (générée par script)
app/bientot/page.tsx              # indexable, canonique, Organization
app/(public)/page.tsx             # Organization, canonique (sans toucher l'animation F20)
app/(public)/{mon-compte,panier,commande,connexion,inscription,
  mot-de-passe-oublie,reinitialiser-mot-de-passe,preferences,newsletter,recherche}/layout.tsx
                                  # robots noindex, follow
app/(public)/…/page.tsx           # canonique + metadonneesReferencement (pages texte, catégories, aide)
app/(back-office)/admin/referencement/page.tsx   # contrôle + export CSV
app/(back-office)/admin/referencement/export/route.ts
proxy.ts                          # page d'attente : plus de noindex sur « / », 308, sitemap.xml libre
src/lib/page-attente.ts           # sitemap.xml parmi les ressources
prisma/site/schema.prisma         # model ReglageReferencement + migration
scripts/image-partage.ts          # génère app/opengraph-image.png depuis docs/brand/assets
scripts/lighthouse.ts             # seuils bloquants (R10)

tests/unit/referencement/         # politique, metadonnees, schema, robots, sitemap
tests/e2e/f21/                    # indexation (démo / attente), structure par type de page, alt
```

**Structure Decision**: le projet Next.js unique existant. La logique de référencement vit dans
`src/lib/referencement/` (fonctions pures, testables sans serveur). L'accès aux données passe
par `src/domaine/referencement.ts`, sur le modèle des autres modules.

## Ordre de réalisation (lot 1)

1. **Politique et page d'attente** (US1) : `politique.ts`, `proxy.ts`, `robots.ts`,
   `sitemap.ts` (version attente), `app/bientot`. C'est livrable seul : Pauline peut valider
   la Search Console dès ce déploiement.
2. **Fondations des pages** (US2) : `metadataBase`, canoniques, `noindex` des pages privées,
   JSON-LD, OG, image de partage, plan du site complet en mode ouvert.
3. **Back-office** (US3) : modèle et migration, bloc Référencement, page de contrôle.
4. **Non-régression** (US4) : e2e F21, audit des `alt`, seuils Lighthouse.

## Points d'attention

- **Ne pas toucher aux fichiers F20** (animation de l'accueil, non commités). Si
  `app/(public)/page.tsx` doit recevoir le JSON-LD Organization, il faut le poser dans la mise
  en page de l'accueil ou dans un composant à part, pour ne pas mêler les deux chantiers.
- **Fichiers F14 non commités** dans l'arbre de travail : les commits F21 n'intègrent que les
  fichiers F21. Les fichiers partagés (`admin/page.tsx`, `ParametreForm.tsx`…) sont à
  vérifier un par un avant chaque commit.
- **Domaine canonique Scalingo** à n'activer qu'à l'ouverture (R4), sinon la démonstration
  scalingo.io serait redirigée vers `www`.
- **Démonstration** : le contrôle de structure (titres, JSON-LD, alt) tourne en mode
  démonstration. Seule la règle d'indexation diffère, et elle est testée par la fonction pure
  et par l'hôte d'attente.

## Lots 2 et 3 (esquisse)

- **Lot 2 — Mots-clés et contenus** :
  - un document `docs/seo/mots-cles.xlsx` (famille, priorité, page cible) ;
  - l'enrichissement des textes de catégories existants (F13) jusqu'à 300–600 mots ;
  - une validation par Régis, journalisée, avant publication ;
  - des descriptions de fiches rédigées ;
  - des blocs de liens internes (produits, guides, catégorie parente).
  
  À planifier après la mise en ligne du lot 1, avec les premières données de la Search Console.
- **Lot 3 — Guides, liens, suivi** :
  - un type d'aide `guide` (auteur, fonction, dates, produits liés, JSON-LD Article) ;
  - `docs/seo/strategie-liens.md` ;
  - un modèle de bilan mensuel ;
  - aucun outil de mesure d'audience.

## Complexity Tracking

Aucune violation de la constitution à justifier.
