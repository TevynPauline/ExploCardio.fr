# Research — F21 Référencement naturel

Date : 2026-11-06. Constat fait sur le code de `main` et sur `https://www.explocardio.fr`.

## Constat de départ

- Une seule application Scalingo sert deux adresses : la démonstration (`SITE_URL`, adresse
  scalingo.io, `SITE_MODE=demo`) et la page d'attente (`DOMAINES_PAGE_ATTENTE=www.explocardio.fr`).
- `proxy.ts` pose `X-Robots-Tag: noindex, nofollow` sur **toutes** les réponses de la page
  d'attente et de la démonstration ; `app/bientot/page.tsx` déclare aussi `robots: noindex`.
- `app/robots.ts` ne regarde que `SITE_MODE` : sur `www.explocardio.fr`, il répond donc
  « tout interdit ».
- Pas de `sitemap.ts`, pas de `metadataBase`, pas de canonique, pas d'Open Graph, pas de JSON-LD.
- Déjà en place : un titre et une description par fiche (`metadonneesFiche`), un
  `generateMetadata` sur l'aide et les pages de texte, des textes de remplacement obligatoires
  pour les photos produit (`PhotoProduit.texteRemplacement`), les images des contenus
  (`Contenu.images`) et les étapes des modes d'emploi ; un fil d'Ariane commun (`FilAriane`) ;
  un script Lighthouse (`npm run test:lighthouse`) qui relève déjà LCP et CLS.
- Les pages catégories ont déjà un texte éditable (F13, `PAGES_TEXTE` : `holter-ecg`,
  `holter-tensionnel`…) : le lot 2 enrichit ces textes, sans nouveau mécanisme.

## R1 — Où se décide l'indexation

- **Decision** : une fonction pure `politiqueIndexation(hote, env)` dans
  `src/lib/referencement/politique.ts` renvoie `"attente"`, `"ouvert"` ou `"ferme"`.
  `"attente"` si l'hôte est une adresse de page d'attente ; `"ouvert"` si `SITE_MODE=prod` ;
  `"ferme"` dans tous les autres cas (démonstration, variable absente ou inconnue). `proxy.ts`,
  `robots.ts`, `sitemap.ts` et les métadonnées l'appellent tous.
- **Rationale** : une seule règle, testable sans serveur, sûre par défaut (FR-005, cas limite
  « configuration incohérente → non indexable »). Aujourd'hui la règle est dupliquée entre le
  proxy, `robots.ts` et la page d'attente.
- **Alternatives** : une variable `INDEXATION=on/off` (rejetée : une variable de plus à oublier
  et un risque d'indexer la démonstration par erreur) ; une application Scalingo séparée pour
  la page d'attente (rejetée : déploiement en double pour une seule page).

## R2 — Page d'attente indexable

- **Decision** : sur l'hôte de la page d'attente, le proxy ne pose plus `noindex` sur `/` ni sur
  `robots.txt` / `sitemap.xml` ; les redirections vers `/` gardent leur code 307 → **308**
  (définitif) pour que les moteurs n'indexent que `/`. `/bientot` appelé directement renvoie
  vers `/`. `robots.txt` (hôte d'attente) : `Allow: /`, `Disallow` sur `/admin`, `/api`,
  `/demo`, et la ligne `Sitemap:`. `sitemap.xml` (hôte d'attente) : la seule adresse
  `https://www.explocardio.fr/`. `sitemap.xml` est ajouté aux ressources de la page d'attente.
- **Adresse de référence** : sur l'hôte d'attente, l'origine canonique est
  `https://<premier domaine de DOMAINES_PAGE_ATTENTE>` ; en production, `SITE_URL`. Aucune
  nouvelle variable.
- **Alternatives** : laisser `noindex` jusqu'à l'ouverture (rejetée : la marque reste
  introuvable, demande de Pauline du 2026-11-06).

## R3 — Validation Search Console et Bing

- **Decision** : validation recommandée **par enregistrement DNS** (propriété de domaine
  Google, qui couvre `explocardio.fr` et `www`) ; Bing importe ensuite le site depuis la Search
  Console. En secours, deux variables facultatives `GOOGLE_SITE_VERIFICATION` et
  `BING_SITE_VERIFICATION` alimentent `metadata.verification` (balises `google-site-verification`
  et `msvalidate.01`), servies sur la page d'attente et en production uniquement.
- **Rationale** : la validation DNS ne touche pas au code, survit à l'ouverture et couvre toutes
  les variantes du domaine. Les codes ne sont pas des secrets mais restent hors du code (saisis
  par Pauline dans Scalingo).

## R4 — `www`, HTTPS et redirections de domaine

- **Decision** : Scalingo, réglages du domaine : `www.explocardio.fr` déclaré **domaine
  canonique** (les autres domaines de l'application y sont redirigés en 301) et **Force HTTPS**
  activé. Le DNS de `explocardio.fr` (racine) pointe vers Scalingo ou vers une redirection du
  bureau d'enregistrement. Vérifié par `curl` dans le quickstart, pas dans le code.
- **Attention** : le domaine canonique Scalingo redirigerait aussi l'adresse scalingo.io de la
  démonstration : à n'activer **qu'à l'ouverture**, quand la démonstration aura sa propre
  adresse (application de recette). Avant l'ouverture, seule la redirection racine → `www` est
  faite au niveau DNS.
- **Alternatives** : redirection dans `proxy.ts` (gardée en secours si Scalingo ne convient pas,
  limitée aux hôtes `explocardio.fr`).

## R5 — Titres, descriptions et canoniques

- **Decision** :
  - `metadataBase` = origine canonique (R2) dans `app/layout.tsx` ; `alternates.canonical` posé
    par chaque page indexable avec son chemin propre, **sans paramètres** (les options de fiche
    et les filtres de catégorie passent en paramètres et ne doivent pas créer de doublons).
  - Fonction `metadonneesReferencement(cible, auto)` : prend le réglage saisi dans le
    back-office s'il existe, sinon le titre et la description automatiques ; coupe les textes
    automatiques au mot près (titre ≤ 60 caractères **suffixe « — ExploCardio.fr » compris**,
    description ≤ 160). Les textes saisis ne sont jamais coupés (avertissement seulement).
  - Pages privées : `robots: { index: false, follow: true }` dans les mises en page de
    `mon-compte`, `panier`, `commande`, `connexion`, `inscription`, `mot-de-passe-oublie`,
    `reinitialiser-mot-de-passe`, `preferences`, `newsletter`, `recherche`. Elles **ne sont pas**
    bloquées dans `robots.txt`, sinon les moteurs ne verraient pas la consigne `noindex`.
  - En mode `"ferme"`, la mise en page racine force `robots: noindex, nofollow` en plus de
    l'en-tête du proxy (double sûreté).
- **Alternatives** : stocker les titres dans Odoo (rejeté : ce sont des contenus du site, pas
  des données de gestion — constitution III).

## R6 — Données structurées (JSON-LD)

- **Decision** : composant serveur `<DonneesStructurees donnees={…} />` qui écrit un
  `<script type="application/ld+json">` (caractère `<` échappé en `<`). Constructeurs purs
  dans `src/lib/referencement/schema.ts`, typés à la main (pas de dépendance) :
  - `Organization` : accueil et page d'attente. Nom « ExploCardio.fr », logo officiel servi par
    `/marque/…`, adresse du siège, email, téléphone, `vatID` et identifiant RCS repris des
    mentions légales et des paramètres publics.
  - `Product` + `Offer` : fiches. `brand`, `sku` (= référence Odoo `default_code`), `image`,
    `description`, `offers` avec `price` HT, `priceCurrency: EUR`,
    `priceSpecification.valueAddedTaxIncluded: false`, `availability` (`InStock`, `BackOrder`
    si délai fournisseur, `OutOfStock`), `seller` ExploCardio.fr. Fiche à variantes : une
    `AggregateOffer` (prix bas / haut). **Construit à partir des prix publics** (lecture de la
    fiche sans client), jamais des prix client F14. Odoo injoignable ou prix absent : pas
    d'`offers` du tout.
  - `BreadcrumbList` : produit par `FilAriane` lui-même à partir des mêmes `etapes`, pour que
    le visible et le structuré ne divergent jamais.
  - `FAQPage` : pages d'aide de type FAQ. Remarque : depuis 2023, Google n'affiche plus de
    résultat enrichi FAQ pour les sites commerciaux ; le balisage reste valide et utile aux
    autres moteurs et assistants, coût faible.
  - `Article` (lot 3) : guides.
- **Validation** : tests unitaires des constructeurs + test e2e qui parse chaque bloc JSON-LD
  et vérifie les champs obligatoires ; contrôle manuel avec le test des résultats enrichis de
  Google sur la recette (SC-003).
- **Alternatives** : `schema-dts` (types seulement, rejeté pour éviter une dépendance pour
  5 types) ; microdonnées dans le HTML (rejeté : mêle balisage et composants).

## R7 — Plan du site

- **Decision** : `app/sitemap.ts`, dynamique, selon `politiqueIndexation` :
  - `"ferme"` : liste vide (et `robots.txt` interdit tout) ;
  - `"attente"` : la seule page d'accueil ;
  - `"ouvert"` : accueil, `PAGES_TEXTE` (sauf `cookies`), fiches publiées non orphelines
    (`ContenuProduit`, chemin par famille), contenus d'aide publiés, avec `lastModified` =
    `modifieLe`.
  - Sources : **base du site uniquement** (slugs et dates), pas Odoo : le plan du site reste
    servi si Odoo est injoignable (cas limite de la spec).
- Un seul fichier tant que le site compte moins de 50 000 adresses (limite des moteurs).

## R8 — Aperçus de partage (Open Graph)

- **Decision** : valeurs par défaut dans `app/layout.tsx` (`siteName`, `locale: fr_FR`,
  `type: website`, image par défaut) ; fiches : première photo du produit ; `twitter.card =
  summary_large_image`. Image par défaut `app/opengraph-image.png` (1200 × 630) : logo
  officiel **non modifié** centré sur le fond ivoire `--ec-bg`, produite une fois par un script
  (`scripts/image-partage.ts`, sharp déjà présent) à partir de `docs/brand/assets/*.svg`.
- **Alternatives** : image générée à chaque requête (`ImageResponse`), rejetée : inutile pour
  une image fixe.

## R9 — Textes alternatifs

- **Decision** : les modèles exigent déjà un texte de remplacement (photos produit, images de
  contenu, étapes d'aide). À vérifier/compléter : logos des marques partenaires (alt = nom de
  la marque), vignettes du carrousel, logo du site (`alt="ExploCardio.fr"`). Les images
  décoratives gardent `alt=""` (et `aria-hidden`). Un test e2e parcourt les types de pages et
  échoue sur toute balise `img` sans attribut `alt`. Le contrôle du back-office liste les
  photos dont le texte est vide ou égal au nom du fichier.

## R10 — Performance mobile

- **Decision** : étendre `scripts/lighthouse.ts` avec des seuils bloquants : LCP ≤ 2,5 s,
  CLS ≤ 0,1, TBT ≤ 200 ms (substitut de laboratoire de l'INP), score performance ≥ 90, sur
  accueil, catégorie, fiche ; mesure sur un build de production local. Les signaux réels
  (rapport Core Web Vitals de la Search Console) sont suivis en phase 3 (SC-004).
- Points d'attention connus : animation de l'accueil (F20, hors de ce commit) et carrousel ;
  priorité de chargement de l'image principale de fiche (`priority`) ; polices déjà
  préchargées et hébergées.

## R11 — Tests de non-régression

- **Unitaires (Vitest)** : `politiqueIndexation` (toutes combinaisons hôte/mode),
  `metadonneesReferencement` (saisi / automatique / coupure), constructeurs JSON-LD, contenu
  de `robots()` et `sitemap()` avec environnement injecté.
- **E2E (Playwright, serveur de démonstration)** : démonstration → `noindex` partout et
  `robots.txt` « Disallow: / » ; hôte d'attente (`127.0.0.1`, comme F17) → `/` indexable,
  `robots.txt` autorise, `sitemap.xml` d'une adresse ; sur chaque type de page : un seul `h1`,
  titre et description présents et uniques, canonique sans paramètre, JSON-LD valide, `alt`
  partout. Ces contrôles de structure ne dépendent pas du mode et tournent en démonstration.
- **Garde** (SC-009) : un test vérifie que retirer le titre ou inverser la politique fait
  échouer les assertions (tests construits sur la fonction pure).

## R12 — Back-office

- **Decision** : nouveau modèle `ReglageReferencement` (voir data-model). Bloc « Référencement »
  ajouté aux formulaires existants : textes des pages (F13), fiches produit (F03), contenus
  d'aide (F09), accueil. Aperçu du résultat de recherche (titre, adresse, description) et
  compteur de caractères avec avertissement non bloquant. Page `/admin/referencement` :
  tableau de toutes les pages indexables avec titre et description en vigueur, origine
  (saisi / automatique), longueurs, doublons, images sans texte, fiches sans photo ; export CSV.
  Droits : lecture pour qui voit les contenus, modification pour qui modifie les contenus ;
  modifications journalisées (`JournalAction`).

## R13 — Lots 2 et 3 (esquisse, non détaillés)

- **Lot 2** : document de travail `docs/seo/mots-cles.xlsx` (expression, famille, priorité,
  page cible, volume estimé, source) ; enrichissement des textes de catégorie existants
  (`contenus/*.md` → back-office) ; état « validé par Régis » sur les textes de page et de fiche
  (réutiliser brouillon/publication F13 + une case de validation journalisée) ; blocs de liens
  internes (produits et guides liés) sur les catégories.
- **Lot 3** : nouveau type d'aide `guide` (auteur, fonction, dates, produits liés, JSON-LD
  `Article`) ; document `docs/seo/strategie-liens.md` ; modèle de bilan mensuel
  `docs/seo/bilan-mensuel.md`. Aucun outil de mesure d'audience (FR-032).
