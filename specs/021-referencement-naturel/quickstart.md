# Quickstart — vérifier F21 (lot 1)

Contrat de référence : [contracts/referencement.md](contracts/referencement.md).

## Prérequis

- Node 24 (`/opt/homebrew/opt/node@24/bin`), base du site migrée (`npm run db:migrate`) et
  remplie (`npm run demo:seed` et graines du site, comme pour les autres modules).
- Serveur de démonstration : `npm run dev` (localhost:3000).
- `.env.local` contient `DOMAINES_PAGE_ATTENTE=127.0.0.1` pour simuler l'hôte d'attente
  (comme les tests F17).

## 1. Tests automatiques

```bash
npx vitest run tests/unit/referencement
```

Attendu : politique d'indexation, métadonnées, constructeurs JSON-LD, `robots()` et
`sitemap()` verts.

```bash
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/f21
```

Attendu :
- démonstration (`localhost`) : en-tête `X-Robots-Tag: noindex`, `robots.txt` = `Disallow: /` ;
- hôte d'attente (`127.0.0.1`) : `/` sans `noindex`, canonique `https://…/`, JSON-LD
  Organization, `robots.txt` avec `Allow` et `Sitemap`, `sitemap.xml` d'une adresse,
  `/catalogue` → 308 vers `/` ;
- chaque type de page : un `h1`, titre et description, canonique sans paramètre, JSON-LD
  valide, aucune image sans `alt`, pages privées en `noindex`.

## 2. Mode production simulé

```bash
SITE_MODE=prod SITE_URL=https://www.explocardio.fr npm run build && SITE_MODE=prod SITE_URL=https://www.explocardio.fr npm run start
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/sitemap.xml | head -40
```

Attendu : `robots.txt` autorise et pointe le plan du site ; le plan liste accueil, pages,
fiches publiées et aide, avec `lastmod` ; aucune adresse privée.

## 3. Performance mobile

```bash
npm run test:lighthouse -- http://localhost:3000
```

Attendu (build de production) : accueil, catégorie, fiche → LCP ≤ 2,5 s, CLS ≤ 0,1,
TBT ≤ 200 ms, score ≥ 90. Le script échoue sinon.

## 4. Back-office

1. `/admin/contenus` → page « Holter ECG » → bloc Référencement : saisir un titre de
   70 caractères → avertissement, aperçu mis à jour ; enregistrer.
2. Ouvrir `/holter-ecg` : le `<title>` reprend le texte saisi ; vider le champ → retour au titre
   automatique.
3. `/admin/referencement` : la page apparaît « saisi », la longueur est signalée ; saisir le même
   titre sur une autre page → doublon signalé. Le journal des actions contient les deux
   modifications.

## 5. Sur le site en ligne (Pauline, après déploiement)

```bash
curl -sI https://www.explocardio.fr | grep -i robots
curl -s https://www.explocardio.fr/robots.txt
curl -s https://www.explocardio.fr/sitemap.xml
curl -sI https://explocardio.fr | grep -i location
```

Attendu : pas de `noindex` sur `www` ; `robots.txt` autorise ; plan du site d'une adresse ;
la racine renvoie vers `https://www.explocardio.fr/`. La démonstration (adresse scalingo.io)
répond toujours `noindex`.

Puis : Search Console → ajouter la propriété de domaine `explocardio.fr` (validation DNS) →
soumettre `https://www.explocardio.fr/sitemap.xml` → inspecter l'adresse `/` → demander
l'indexation. Bing Webmaster Tools → importer depuis la Search Console. Test des résultats
enrichis de Google sur `/` (Organization valide).
