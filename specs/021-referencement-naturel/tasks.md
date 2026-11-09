---
description: "Tâches F21 — Référencement naturel, lot 1"
---

# Tasks: F21 — Référencement naturel (lot 1)

**Input**: Design documents from `specs/021-referencement-naturel/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/referencement.md, quickstart.md

**Tests**: demandés par la spec (US4, FR-023, SC-009). Les tests sont écrits avant le code
qu'ils couvrent.

**Règles de commit** : n'inclure que les fichiers F21. Les fichiers F14 et F20 non commités
restent hors des commits. Vérifier les fichiers partagés avec `git diff` avant de les ajouter.
Lancer le contrôle des secrets avant chaque commit.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Create the folder `src/lib/referencement/` with an `index.ts` re-exporting the future modules, and the folders `tests/unit/referencement/` and `tests/e2e/f21/`
- [X] T002 [P] Document the optional variables `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION`: no value in the repo, meta tag served only when the policy is « attente » or « ouvert », DNS validation recommended (R3). Add them to `docs/deploiement-scalingo.md` and to `.env.example` if it exists

---

## Phase 2: Foundational (bloquant pour toutes les stories)

- [X] T003 [P] Write `tests/unit/referencement/politique.test.ts`. Cover `politiqueIndexation(hote, env)` for:
  - waiting host → `attente`, including uppercase and a port;
  - `SITE_MODE=prod` → `ouvert`;
  - demo, `SITE_MODE` missing, unknown value, `hote` null → `ferme`.

  Also cover `origineCanonique(politique, env)`:
  - `attente` → `https://<first domain in DOMAINES_PAGE_ATTENTE>`;
  - `ouvert` → `SITE_URL` with no trailing slash.
- [X] T004 Implement `politiqueIndexation` and `origineCanonique` in `src/lib/referencement/politique.ts`. Reuse `estHotePageAttente` / `domainesPageAttente` from `src/lib/page-attente.ts`. Default to `ferme` (R1).
- [X] T005 [P] Write `tests/unit/referencement/schema.test.ts` for the JSON-LD builders, per contracts/referencement.md §4:
  - Organization has the required fields;
  - Product + Offer: price = displayed TTC as a number, `priceCurrency=EUR`, `priceSpecification` TTC (`valueAddedTaxIncluded=true`) and HT (`false`) — revised 2026-11-09 for constitution 2.3.0; availability InStock/BackOrder/OutOfStock;
  - AggregateOffer for variants;
  - no `offers` when the price is missing or zero;
  - BreadcrumbList: positions from 1, `item` absolute except the last step;
  - FAQPage: answer as plain text.
- [X] T006 Implement the builders `organisation()`, `produit()`, `filAriane()` and `faq()` in `src/lib/referencement/schema.ts`. Types are hand-written, with no dependency.
- [X] T007 [P] Create `src/ui/DonneesStructurees.tsx`, a server component that writes `<script type="application/ld+json">` with `<` escaped as `<`. Accepts one object or an array.
- [X] T008 [P] Write `tests/unit/referencement/metadonnees.test.ts` for `metadonneesReferencement(cible, auto)`:
  - an entered title or description wins and is never cut;
  - automatic texts are cut on a word boundary: title ≤ 60 characters including the suffix « — ExploCardio.fr », description ≤ 160 characters with « … »;
  - the origin is reported (`saisi` / `automatique`).
- [X] T009 Implement the pure part of `src/lib/referencement/metadonnees.ts` (cutting, choosing between entered and automatic). The reading of entered settings is injected, so it can be tested without a database.

**Checkpoint** : `npx vitest run tests/unit/referencement` vert.

---

## Phase 3: User Story 1 — La marque apparaît dans les résultats (P1) 🎯 MVP

**Goal** : la page d'attente `www.explocardio.fr` est indexable ; la démonstration reste fermée.

**Independent Test** : quickstart §1 (hôte `127.0.0.1`) et §5 après déploiement.

- [X] T010 [P] [US1] Write `tests/unit/referencement/robots.test.ts`. Call `robots()` with the host and env injected (contracts §1):
  - `ferme` → `Disallow: /` and no sitemap;
  - `attente` / `ouvert` → `Allow: /`, Disallow on `/admin`, `/api` and `/demo`, plus `Sitemap: <origine>/sitemap.xml`.
- [X] T011 [P] [US1] Write `tests/unit/referencement/plan-du-site.test.ts`:
  - `ferme` → empty list;
  - `attente` → only `<origine>/`.
- [X] T012 [US1] Rewrite `app/robots.ts`. Read the host from `headers()`, then use `politiqueIndexation` and `origineCanonique`. Extract the pure function into `src/lib/referencement/robots.ts` for T010.
- [X] T013 [US1] Create `src/lib/referencement/plan-du-site.ts`, the `adressesPlanDuSite(politique, origine, lecture)` function. Implement the « ferme » and « attente » cases. Create `app/sitemap.ts`: host from `headers()`, rendered dynamically.
- [X] T014 [US1] Edit `src/lib/page-attente.ts` to add `/sitemap.xml` to `RESSOURCES`.
- [X] T015 [US1] Edit `proxy.ts`, function `pageAttente`:
  - no `X-Robots-Tag` on `/` (rewritten to `/bientot`) or on `robots.txt` / `sitemap.xml`;
  - redirects to `/` become `NextResponse.redirect(url, 308)` and keep `noindex`;
  - the demo branch is unchanged.
- [X] T016 [US1] Edit `app/bientot/page.tsx`: remove `robots: noindex`, add `alternates.canonical: "/"`, Open Graph (title, description, default image), the `verification` codes when they are defined, and `<DonneesStructurees>` Organization. Get Organization from public parameters (`lireParametresPublics`) plus the legal identity: name ExploCardio.fr, head office 13 chemin de Gontard 13710 Fuveau, VAT FR46132194101.
- [X] T017 [US1] Edit `app/layout.tsx` *(fait : `metadataBase` = `SITE_URL`, métadonnées statiques pour ne pas rendre toutes les pages dynamiques ; `noindex` hors production ; la page d'attente déclare elle-même son indexation et son adresse canonique absolue ; `next.config.ts` n'ajoute plus l'en-tête `noindex` sur les adresses d'attente)*:
  - `metadataBase` = `origineCanonique(...)`, from the host read through `generateMetadata`;
  - when the policy is `ferme`, force `robots: { index: false, follow: false }`.
- [X] T018 [US1] Edit `tests/e2e/f17/page-attente.spec.ts` *(fait ; les attentes 308, robots.txt et plan du site sont dans `tests/e2e/f21/indexation.spec.ts`)*: the `noindex` expectation on `/` becomes « absent ». Add the new F17 expectations:
  - 308 status on `/catalogue`;
  - `robots.txt` allows;
  - `sitemap.xml` contains a single URL.
- [X] T019 [P] [US1] Create `tests/e2e/f21/indexation.spec.ts`:
  - demo (`localhost`): `X-Robots-Tag` noindex on `/`, `/catalogue` and `/demo/acces`; `robots.txt` = `Disallow: /`; `sitemap.xml` empty;
  - waiting host (`127.0.0.1`): canonical on `/`, a valid Organization JSON-LD, no `noindex`.
- [X] T020 [US1] Add a dated revision note to `specs/017-page-attente/spec.md`: FR-002 is amended by F21 FR-001, so the waiting page becomes indexable.

**Checkpoint** : US1 livrable seule. Pauline peut déployer et valider la Search Console (DNS).

---

## Phase 4: User Story 2 — Chaque page est comprise par les moteurs (P1)

**Goal** : canoniques, JSON-LD, OG, `noindex` des pages privées, plan du site complet en mode ouvert.

**Independent Test** : quickstart §1 (structure par type de page) et §2 (mode production simulé).

- [ ] T021 [P] [US2] Extend `tests/unit/referencement/plan-du-site.test.ts` for the « ouvert » case:
  - home, `PAGES_TEXTE` except `cookies`, published non-orphan product pages and published help content, each with `lastModified`;
  - no private page;
  - the list is still produced when the catalogue cannot be read.
- [ ] T022 [US2] Implement the « ouvert » case in `src/lib/referencement/plan-du-site.ts`. Read from the site database only: `ContenuProduit` with `etat=publie`, `orphelin=false` (path by family, the same way as `src/domaine/catalogue`), `ContenuAide` with `etat=publie`, and `Contenu` of type page for `modifieLe`.
- [ ] T023 [P] [US2] Add `robots: { index: false, follow: true }` through a `layout.tsx` file, created if missing, in each of these folders under `app/(public)/`: `mon-compte`, `panier`, `commande`, `connexion`, `inscription`, `mot-de-passe-oublie`, `reinitialiser-mot-de-passe`, `preferences`, `newsletter`, `recherche`.
- [ ] T024 [US2] Edit `src/ui/FilAriane.tsx` to emit `<DonneesStructurees>` BreadcrumbList from the same `etapes`, with absolute addresses taken from `metadataBase`, so the visible breadcrumb and the structured one stay identical.
- [ ] T025 [US2] Edit `src/ui/catalogue/Fiche.tsx`:
  - `metadonneesFiche` adds the canonical `/<famille>/<slug>` with no query parameters, Open Graph with the first product photo, and goes through `metadonneesReferencement("produit:<defaultCode>", auto)`;
  - the page renders `<DonneesStructurees>` Product built from the **public** read (`lireFiche(cle, slug, null)`, never the client prices);
  - prices: `prixTtc` and `prixHt` per variant, with the TTC computed by the F22 helper (VAT rate of the article) so the JSON-LD matches the displayed price. **Depends on F22**; do not edit the catalogue or cart price components in F21;
  - availability comes from the stock and the supplier lead time;
  - no `offers` when Odoo cannot be reached.
- [ ] T026 [P] [US2] Add the canonical (no filter parameter) and `metadonneesReferencement("page:<nom>")` to the category pages: `app/(public)/holter-ecg/page.tsx`, `holter-ecg/ecg-de-repos/page.tsx`, `holter-tensionnel/page.tsx`, `epreuve-effort/page.tsx`, `accessoires-consommables/page.tsx` and `catalogue/page.tsx`.
- [ ] T027 [P] [US2] Add the canonical and `metadonneesReferencement("page:<nom>")` to the text pages:
  - `app/(public)/[legale]/page.tsx`, `qui-sommes-nous/page.tsx`, `services/**/page.tsx`, `financement/page.tsx`, `mise-a-disposition/page.tsx`;
  - the automatic description comes from the first sentences of the text in force.
- [ ] T028 [P] [US2] Add the canonical, `metadonneesReferencement("aide:<slug>")` and `<DonneesStructurees>` FAQPage for FAQ entries to `app/(public)/aide/page.tsx` and `aide/[slug]/page.tsx`.
- [ ] T029 [US2] Home page: canonical `/`, `metadonneesReferencement("accueil")` and Organization JSON-LD. Put them in a separate component, `src/ui/accueil/ReferencementAccueil.tsx`, inserted with the smallest possible change to `app/(public)/page.tsx`. **Do not commit the F20 changes in that file**: check `git diff` and stage only the F21 lines (`git add -p`).
- [ ] T030 [P] [US2] Create `scripts/image-partage.ts`. It generates `app/opengraph-image.png` (1200×630) with sharp: the official logo from `docs/brand/assets/*.svg`, unmodified, centred on the `--ec-bg` background from `docs/brand/tokens.css`. Run it and commit the image.
- [ ] T031 [US2] Default Open Graph in `app/layout.tsx`: `siteName: "ExploCardio.fr"`, `locale: "fr_FR"`, `type: "website"`, plus `twitter.card = "summary_large_image"`.
- [ ] T032 [US2] Add a 308 redirect from `/bientot` to `/` when the policy is `ouvert` (FR-019), in `proxy.ts` or in `app/bientot/page.tsx`.
- [ ] T033 [P] [US2] Create `tests/e2e/f21/structure.spec.ts`. On the home page, a category, an equipment page, a consumable page, a service page, a legal page, help, a FAQ and `/qui-sommes-nous`, check:
  - exactly one `h1`;
  - non-empty `<title>` and `meta description`, unique across the sample;
  - absolute canonical with no `?`;
  - `og:title`, `og:image` and `og:url`;
  - every JSON-LD block parses and has its required fields;
  - `/panier`, `/connexion` and `/recherche?q=holter` are `noindex`.

**Checkpoint** : quickstart §2 (`SITE_MODE=prod`) : `robots.txt` et `sitemap.xml` conformes.

---

## Phase 5: User Story 3 — Titres et descriptions dans le back-office (P2)

**Goal** : l'équipe règle titre et description de chaque page, voit l'aperçu et les doublons.

**Independent Test** : quickstart §4.

- [ ] T034 [US3] Add the `ReglageReferencement` model to `prisma/site/schema.prisma`, with a migration (`npm run db:migrate`):
  - `id` cuid;
  - `cible` unique: `accueil`, `page:<nom>`, `produit:<defaultCode>` or `aide:<slug>`;
  - `titre` optional, 1 to 120 characters after trimming spaces;
  - `description` optional, 1 to 300 characters;
  - `modifieLe` `@updatedAt`;
  - `modifiePar`;
  - `@@map("reglage_referencement")`.
- [ ] T035 [P] [US3] Write `tests/unit/referencement/domaine.test.ts`:
  - saving creates or updates the setting and writes a `JournalAction` with `action="referencement.modifier"` and `objet=cible`;
  - both fields empty → the setting is deleted;
  - lengths beyond the limits are refused (120 / 300);
  - warnings are returned beyond 60 / 160;
  - an unknown `cible` is refused.
- [ ] T036 [US3] Implement `src/domaine/referencement.ts`:
  - `lireReglage(cible)`, cached;
  - `enregistrerReglage(cible, {titre, description}, auteur)`, with journal and `revalidatePath`;
  - `controleReferencement()`: the in-force title and description for every indexable page, origin, lengths, duplicates (same title or same description), photos whose alt text is empty or equal to the file name, product pages without a photo.

  Plug `lireReglage` into `metadonneesReferencement` (T009).
- [ ] T037 [US3] Create `src/ui/admin/BlocReferencement.tsx`:
  - title and description fields;
  - live character counter with a non-blocking warning beyond 60 / 160;
  - preview of the search result (title, address, description), styled with the brand tokens;
  - labelled fields and an accessible message (`aria-live`).
- [ ] T038 [US3] Create a server action `src/actions/referencement.ts`. It checks the right to edit content, then calls `enregistrerReglage`.
- [ ] T039 [US3] Insert `BlocReferencement` into the existing forms:
  - page texts: `app/(back-office)/admin/contenus/` (page editor);
  - product pages: `app/(back-office)/admin/catalogue/[reference]/FormulaireContenu.tsx`;
  - help content: the help editor in the back-office;
  - home: `admin/contenus/accueil/page.tsx`. Check the F20 diff and stage only the F21 lines.
- [ ] T040 [US3] Create `app/(back-office)/admin/referencement/page.tsx`. It shows a table from `controleReferencement()` with filters for duplicates, length and missing alt, and links to the matching editor. Reading needs the right to see content.
- [ ] T041 [P] [US3] Create `app/(back-office)/admin/referencement/export/route.ts`, a CSV export in UTF-8 with a `;` separator.
- [ ] T042 [US3] Add the « Référencement » entry to the back-office menu (`app/(back-office)/admin/layout.tsx` or the existing menu component).
- [ ] T043 [P] [US3] Create `tests/e2e/f21/back-office.spec.ts` following quickstart §4:
  - enter a 70-character title → warning shown;
  - public `<title>` updated;
  - clearing the field → automatic title back;
  - duplicate flagged in `/admin/referencement`;
  - journal entry present;
  - axe check on the new screens.

**Checkpoint** : quickstart §4 complet.

---

## Phase 6: User Story 4 — Le référencement ne régresse jamais (P2)

**Goal** : contrôles automatiques bloquants (indexation, structure, `alt`, performance).

**Independent Test** : introduire un défaut volontaire → la suite échoue (SC-009).

- [ ] T044 [P] [US4] Create `tests/e2e/f21/images.spec.ts`. On the T033 sample plus the home carousel and partner brands, every `img` has an `alt` attribute. A non-empty alt is required unless the image is inside an element marked `aria-hidden`.
- [ ] T045 [US4] Fix the missing or poor alt texts found by T044:
  - `src/ui/Logo.tsx`: `alt="ExploCardio.fr"`;
  - partner brand logos: alt = brand name;
  - `src/ui/accueil/Carrousel.tsx`, `AccesRapide.tsx`, `catalogue/Galerie.tsx`, `catalogue/PhotoProduit.tsx`.

  Leave `src/ui/accueil/trois-temps/` (F20) alone unless F21 strictly needs it; if so, report it.
- [ ] T046 [US4] Add to `tests/unit/referencement/garde.test.ts` the SC-009 guard tests:
  - `politiqueIndexation` with demo env never returns anything but `ferme`, including with a stray `DOMAINES_PAGE_ATTENTE` for a demo host;
  - `robots()` in `ferme` always contains `Disallow: /`;
  - `metadonneesReferencement` never returns an empty title.
- [ ] T047 [US4] Edit `scripts/lighthouse.ts`:
  - blocking thresholds: LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, performance score ≥ 90;
  - pages: home, `/holter-ecg`, `/holter-ecg/dms-300-4l`;
  - non-zero exit code if any threshold is missed;
  - print a summary table.
- [ ] T048 [US4] Run `npm run build && npm run start`, then `npm run test:lighthouse`. Fix whatever blocks the thresholds (main image `priority`, image sizes, layout shift). Record the measurements in `specs/021-referencement-naturel/quickstart.md`, section « Mesures ».

**Checkpoint** : suite F21 verte ; défaut volontaire détecté.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T049 [P] Update `src/connecteurs/README.md` or `docs/deploiement-scalingo.md` with the indexation rule, the verification variables, and the Scalingo canonical domain to enable **at go-live only** (R4).
- [ ] T050 Run lint, typecheck, `npm run test:unit`, then `E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/f21 tests/e2e/f17`. Fix any regression.
- [ ] T051 Run the full e2e suite (`npx playwright test`). Rerun failures with `--last-failed --workers=1`.
- [ ] T052 Run the secret check, then commit only the F21 files (no F14, no F20) and push. Follow CI, then hand Pauline the post-deployment checks (quickstart §5) and the Search Console steps.

---

## Phases réservées (non détaillées)

- **Lot 2 — Mots-clés et contenus (US5)** : `docs/seo/mots-cles.xlsx`, textes de catégories
  300–600 mots, validation Régis journalisée, fiches rédigées, liens internes. À détailler
  après la mise en ligne du lot 1.
- **Lot 3 — Guides, liens, suivi (US6, US7)** : type d'aide `guide` + JSON-LD Article,
  `docs/seo/strategie-liens.md`, modèle de bilan mensuel. À détailler plus tard.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (bloquante) → US1 → US2 → US3 → US4 → Polish.
- **US1** dépend seulement de T003–T004, T005–T007 (Organization). Livrable seule (MVP).
- **US2** dépend de la phase 2 ; T025 et T028 dépendent de T024 si la fiche et l'aide affichent
  un fil d'Ariane.
- **US3** : T036 branche les réglages dans `metadonneesReferencement` ; sans US3, les titres
  automatiques suffisent (US1 et US2 fonctionnent).
- **US4** : T044–T045 indépendants de US3 ; T047–T048 après US2 (pages finales).

## Parallel Opportunities

- Phase 2 : T003, T005, T007, T008 en parallèle (fichiers distincts).
- US1 : T010, T011, T019 en parallèle.
- US2 : T023, T026, T027, T028, T030 en parallèle après T024.
- US3 : T035, T041, T043 en parallèle de l'interface.
- US4 : T044 et T046 en parallèle.

## Implementation Strategy

1. **MVP = Phases 1, 2 et US1** : déployer, puis Pauline valide la Search Console et demande
   l'indexation de `www.explocardio.fr`. Gain immédiat : la marque devient trouvable.
2. **US2** avant l'ouverture : tout le site est prêt à être compris par les moteurs le jour J.
3. **US3** : autonomie de l'équipe sur les titres.
4. **US4** : verrouillage contre les régressions, mesures de performance.
