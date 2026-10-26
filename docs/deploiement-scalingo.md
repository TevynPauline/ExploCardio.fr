# Mise en ligne sur Scalingo — site de démonstration

Application Scalingo : **explocardio**, région **osc-fr1**, reliée au dépôt GitHub (branche
`main`). Adresse : `https://explocardio.osc-fr1.scalingo.io`.

## Ce que le dépôt fournit

| Fichier | Rôle |
|---|---|
| `Procfile` | `web` : démarre Next.js sur le port donné par Scalingo ; `postdeploy` : `scripts/postdeploy.ts` |
| `scripts/postdeploy.ts` | Exécuté **avant `next build`** (script `build`) puis à l'étape `postdeploy`, sans effet la seconde fois : migrations des deux bases ; au premier déploiement seulement, remplissage de la base de démonstration. Des pages sont pré-rendues pendant la construction et lisent les bases : elles doivent exister dès ce moment. N'écrit jamais de secret dans les journaux ; refuse de continuer si une variable secrète manque |
| `package.json` | Node 24 (`engines`) ; `prisma` et `tsx` en dépendances d'exécution (nécessaires au postdeploy) |
| `.slugignore` | Tests, specs et docs exclus de l'image |

Les tâches planifiées (pg-boss : suivis toutes les 5 minutes, rappels quotidiens, accès Cloud
toutes les heures) tournent dans le conteneur web : **un seul conteneur web** suffit, aucun
conteneur « worker » n'est nécessaire.

## Deux bases PostgreSQL

Le site utilise deux bases distinctes : **site** (`DATABASE_URL`) et **démonstration**
(`DEMO_DATABASE_URL`, équivalent fictif d'Odoo). Elles ne doivent pas partager une même base :
la réinitialisation de la démonstration vide toutes les tables de sa base.

Scalingo n'accepte qu'un addon PostgreSQL par application, d'où **deux applications** :

| Application | Rôle |
|---|---|
| `explocardio` | Le site (code, conteneur web M) et son addon PostgreSQL : `DATABASE_URL` = `$SCALINGO_POSTGRESQL_URL` (créée par Scalingo) |
| `explocardio-demo-db` | Uniquement l'addon PostgreSQL de la démonstration ; aucun code, jamais déployée |

`DEMO_DATABASE_URL` de l'application `explocardio` contient l'adresse **complète, en clair**,
copiée depuis l'onglet Environment de `explocardio-demo-db` (`SCALINGO_POSTGRESQL_URL`). Ne
jamais y écrire `$SCALINGO_POSTGRESQL_URL` : ce serait la base du site, que la réinitialisation
de la démonstration viderait. Quand le vrai Odoo sera branché (F14), `explocardio-demo-db` sera
supprimée.

## Variables d'environnement

À saisir vous-même (onglet **Environment**) :

| Variable | Valeur |
|---|---|
| `SITE_MODE` | `demo` |
| `CONNECTOR_ODOO`, `CONNECTOR_STRIPE`, `CONNECTOR_PCA`, `CONNECTOR_EMAILING` | `demo` |
| `PCA_DEMO_SUBMODE` | `auto` |
| `DATABASE_URL` | `$SCALINGO_POSTGRESQL_URL` (déjà créée par Scalingo avec l'addon) |
| `DEMO_DATABASE_URL` | l'adresse copiée depuis `explocardio-demo-db` (voir ci-dessus) |
| `AUTH_SECRET` | chaîne aléatoire de 48 caractères ou plus, **nouvelle** (pas celle de votre poste) |
| `DEMO_SITE_PASSWORD` | mot de passe d'accès au site de démonstration, à communiquer aux testeurs |
| `DEMO_ACCOUNTS_PASSWORD` | mot de passe commun des comptes de démonstration (reprenez celui de votre `.env.local` pour garder les mêmes) |
| `DEMO_TOTP_SECRET` | clé de double authentification des comptes équipe (reprenez celle de votre `.env.local` : votre application d'authentification continuera de fonctionner) |
| `SITE_URL` | `https://explocardio.osc-fr1.scalingo.io` (votre domaine plus tard) |
| `TRUSTED_PROXY` | `1` (le site est derrière le routeur de Scalingo) |
| `STORAGE_DIR` | `/app/stockage` |

Ne collez jamais ces valeurs ailleurs que dans Scalingo et votre `.env.local`.

## Fichiers téléversés

Le disque d'un conteneur Scalingo est **effacé à chaque déploiement et redémarrage**. Les
fichiers téléversés au back-office (photos, logos, PDF, vidéos de l'aide) sont donc gardés
**dans la base du site** (table `fichier_stocke`) et survivent aux déploiements. Les fichiers
déposés avant ce changement sont perdus : déposez-les à nouveau. `STORAGE_DIR` ne sert plus
qu'à relire d'anciens fichiers en local. Avant la mise en ligne réelle, un stockage objet (S3
compatible, hébergé en France) prendra le relais — à prévoir dans F14.
