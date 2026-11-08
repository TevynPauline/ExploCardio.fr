# Quickstart: F14 — lot 1 (lecture du catalogue)

Guide de vérification. Les secrets ne sont jamais écrits ici ni dans le dépôt : Pauline les
saisit elle-même dans `.env.local` (poste local) ou dans la configuration de l'application de
recette.

## Prérequis

- Node 24 (`/opt/homebrew/opt/node@24/bin`), dépendances installées.
- Une clé API (scope RPC) sur la **copie neutralisée** d'Odoo.
- Dans `.env.local` : `ODOO_URL`, `ODOO_DATABASE`, `ODOO_USER`, `ODOO_API_KEY`,
  `ODOO_ENVIRONNEMENT=recette`. `CONNECTOR_ODOO` reste à `demo` pour le travail courant.

## 1. Non-régression de la démonstration [Phase 1]

```bash
npm run lint && npm run typecheck && npm run test:unit && npm run test:contract
```

Attendu : tout passe en mode démonstration, y compris le nouveau test de
`catalogue.controlerDonnees`.

## 2. Configuration incomplète [Phase 1]

Avec `CONNECTOR_ODOO=real` et `ODOO_ENVIRONNEMENT` absent : toute page du catalogue affiche
le message d'indisponibilité ; le journal des connecteurs indique `CONFIGURATION_INCOMPLETE`
avec la variable manquante. Le site ne repasse pas en démonstration.

## 3. Tests de contrat en lecture sur la copie [Phase 3]

```bash
CONNECTOR_ODOO=real npm run test:contract -- tests/contract/odoo/catalogue.test.ts tests/contract/odoo/stock.test.ts
```

Attendu : les tests de lecture passent avec le jeu de références `copie` ; les tests
d'écriture sont ignorés (lots suivants). Aucune écriture n'apparaît dans l'historique d'Odoo.

## 4. Site local branché en lecture [Phase 3]

Démarrer le site avec `CONNECTOR_ODOO=real` (base du site locale), puis :

- `/admin/catalogue/controle` : le rapport liste les anomalies de la copie (aujourd'hui :
  catégories non reliées, propriétés Marque et Type absentes, stock à 0) ; l'export CSV
  s'ouvre dans un tableur.
- `/admin/catalogue` : les articles d'Odoo apparaissent avec leurs références réelles
  (`DMS 300-4L4B`…) ; publier le contenu d'un article affichable ;
- `/holter-ecg` puis la fiche publiée : nom, variantes, prix HT identiques à Odoo ;
- changer un prix dans la copie, attendre 5 minutes, recharger : nouveau prix affiché.

## 5. Garde de neutralisation [Phase 3]

Test unitaire du client : avec un `database.is_neutralized` simulé à `False` en
`recette`, toute écriture lève `OperationRefused` ; en `production` avec `True`, idem.

## 6. Sécurité

```bash
git diff --cached | grep -F -q -f "$TMPDIR/vals.txt" && echo "SECRET DÉTECTÉ"
```

(contrôle des secrets habituel avant commit). Rechercher la clé dans le journal des
connecteurs : aucune occurrence.
