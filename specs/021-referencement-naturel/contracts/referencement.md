# Contrat — ce que le site expose aux moteurs de recherche (F21, lot 1)

Origine canonique notée `O` : `https://www.explocardio.fr` en attente et en production.

## 1. `robots.txt`

| Politique | Contenu |
|---|---|
| `ferme` (démonstration) | `User-agent: *` / `Disallow: /` — pas de ligne `Sitemap` |
| `attente` | `User-agent: *` / `Allow: /` / `Disallow: /admin` `/api` `/demo` / `Sitemap: O/sitemap.xml` |
| `ouvert` | idem `attente` |

Les pages privées ne sont **pas** listées en `Disallow` : elles portent `noindex` (§ 3).

## 2. `sitemap.xml`

| Politique | Adresses |
|---|---|
| `ferme` | aucune |
| `attente` | `O/` |
| `ouvert` | `O/`, chaque page de `PAGES_TEXTE` sauf `cookies`, chaque fiche publiée non orpheline (`O/<famille>/<slug>`), chaque contenu d'aide publié (`O/aide/<slug>`) ; `lastmod` = date de dernière modification |

Jamais : pages privées, recherche, adresses avec paramètres, démonstration, back-office.

## 3. En-têtes et balises par type de page

| Page | Indexation | Canonique | JSON-LD | Plan du site |
|---|---|---|---|---|
| Page d'attente `/` (hôte d'attente) | `index, follow` | `O/` | Organization | oui |
| Toute adresse ≠ `/` (hôte d'attente) | redirection **308** vers `/` | — | — | non |
| Démonstration (toutes pages) | `noindex, nofollow` (en-tête **et** balise) | — | autorisé, sans effet | non |
| Accueil | `index, follow` | `O/` | Organization | oui |
| Catégorie / sous-catégorie | `index, follow` | sans paramètre de filtre | BreadcrumbList | oui |
| Fiche produit | `index, follow` | `O/<famille>/<slug>` sans option | Product + Offer/AggregateOffer, BreadcrumbList | oui |
| Fiche retirée | `noindex` (déjà en place) | — | — | non |
| Ancien slug de fiche | redirection 308 (déjà en place) | — | — | non |
| Services, financement, mise à disposition, qui sommes-nous | `index, follow` | chemin propre | BreadcrumbList si fil d'Ariane | oui |
| Pages légales | `index, follow` | chemin propre | aucun | oui (sauf cookies) |
| Aide (liste et contenus) | `index, follow` | chemin propre | FAQPage (FAQ), BreadcrumbList | oui |
| Compte, panier, commande, connexion, inscription, mot de passe, préférences, newsletter, recherche | `noindex, follow` | — | — | non |
| Page introuvable | code 404, `noindex` | — | — | non |
| `/bientot` hors hôte d'attente (après l'ouverture) | redirection 308 vers `/` | — | — | non |

Sur chaque page indexable : `<title>` et `<meta name="description">` non vides, uniques ; un seul
`<h1>` ; `<html lang="fr">` ; balises Open Graph `og:title`, `og:description`, `og:url`
(= canonique), `og:image`, `og:site_name = ExploCardio.fr`, `og:locale = fr_FR`.

## 4. JSON-LD — champs exigés

- **Organization** : `@type`, `name = "ExploCardio.fr"`, `url = O`, `logo` (adresse absolue
  d'un fichier de `/marque/`), `address` (PostalAddress : rue, code postal, ville, `FR`),
  `email`, `telephone` si renseigné, `vatID`.
- **Product** : `name`, `sku` (référence), `brand.name` si connue, `image` (≥ 1 adresse
  absolue), `description`, `url` = canonique ; `offers` **seulement** si le prix public est
  connu : `Offer` (`price` = prix TTC affiché, en nombre, `priceCurrency = "EUR"`,
  `priceSpecification` = deux `PriceSpecification` : TTC avec `valueAddedTaxIncluded = true`, HT
  avec `valueAddedTaxIncluded = false`, `availability` ∈ `InStock` / `BackOrder`
  / `OutOfStock`, `seller.name = "ExploCardio.fr"`, `url`) ou `AggregateOffer` (`lowPrice`,
  `highPrice` en TTC, `offerCount`, `valueAddedTaxIncluded = true`) pour une fiche à variantes. Jamais un prix client ni un prix nul.
- **BreadcrumbList** : `itemListElement` = étapes du fil d'Ariane affiché, `position` à partir
  de 1, `item` absolu sauf pour la dernière étape.
- **FAQPage** : `mainEntity[]` de `Question` (`name`) / `acceptedAnswer.Answer` (`text` en
  texte brut).

## 5. Validation de propriété (facultatif)

Si `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` sont définies et la politique est
`attente` ou `ouvert` : balises `google-site-verification` / `msvalidate.01` dans `<head>` de
l'accueil. Absentes sinon.
