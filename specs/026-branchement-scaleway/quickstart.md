# Quickstart — vérifier F26

## 1. Démonstration inchangée [Phase 1]

```bash
npm run test:unit && npm run test:contract
SITE_URL=http://localhost:3100 npm run test:e2e   # une seule suite à la fois
```

Attendu : tout passe, `CONNECTOR_STOCKAGE` absent (= `demo`), fichiers toujours en base.

## 2. Garde de l'environnement [Phase 1]

Avec `CONNECTOR_STOCKAGE=real`, `STOCKAGE_ENVIRONNEMENT=recette` et
`STOCKAGE_COMPARTIMENT=explocardio-production` : tout dépôt donne « configuration
incomplète » et « À traiter » affiche l'alerte (tests unitaires de `config.ts`).

## 3. Site de recette branché [Phase 3]

Prérequis (Pauline ou Régis, voir [plan.md](plan.md) « Actions hors code ») : projet,
compartiment `explocardio-recette` privé à Paris, application et clé ; variables saisies
dans Scalingo (`explocardio-recette`), puis redémarrage.

1. Back-office › Catalogue : déposer une photo PNG, un logo SVG, une notice PDF.
   Attendu : affichés sur la fiche ; dans la console Scaleway, objets présents sous
   `stockage/…` ; aucune nouvelle ligne `fichier_stocke`.
2. Back-office › Aide : déposer une vidéo MP4 proche de 50 Mo et ses sous-titres. Attendu :
   lecture et avance rapide dans Safari, Chrome et Firefox.
3. Ouvrir directement l'adresse du SVG : téléchargé en pièce jointe ; en-têtes
   `Content-Security-Policy` et `X-Content-Type-Options` présents.
4. Contrats en réel :
   `scalingo --app explocardio-recette run npm run test:contract -- stockage`.

## 4. Reprise [Phase 3]

```bash
scalingo --app explocardio-recette run npm run stockage:reprise
```

Attendu : bilan « copiés N, déjà présents 0, en erreur 0 ». Relancer : « copiés 0, déjà
présents N ». Parcourir l'accueil, le catalogue et l'aide : aucune image manquante.
Seulement ensuite, si souhaité : `npm run stockage:reprise -- --effacer-la-base`.

## 5. Panne [Phase 3]

Remplacer temporairement `STOCKAGE_CLE_SECRETE` par une valeur fausse : dépôt refusé
(« configuration incomplète », journalisé) ; pages publiques affichées. Rétablir la clé.
Panne réseau : simulée en démonstration (pannes F11) — message « momentanément
indisponible ».
