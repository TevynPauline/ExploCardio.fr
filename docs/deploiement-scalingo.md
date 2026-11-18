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
| `DOMAINES_PAGE_ATTENTE` | `www.explocardio.fr` (adresses qui n'affichent que la page d'attente, F17) |

Ne collez jamais ces valeurs ailleurs que dans Scalingo et votre `.env.local`.

### Paiements réels par Stripe (F24)

Sur le site de recette (Stripe en **mode test**), puis sur le site public (Stripe en **mode
production**) :

| Variable | Valeur |
|---|---|
| `CONNECTOR_STRIPE` | `real` |
| `STRIPE_ENVIRONNEMENT` | `recette` sur le site de recette, `production` sur le site public |
| `STRIPE_SECRET_KEY` | clé **restreinte** créée dans Stripe (Développeurs › Clés API › Créer une clé restreinte) : commence par `rk_test_` en recette, `rk_live_` en production. Une clé incohérente avec l'environnement bloque les paiements et s'affiche en alerte dans « À traiter ». |
| `STRIPE_WEBHOOK_SECRET` | secret de signature (`whsec_…`) du webhook déclaré pour ce site (Développeurs › Webhooks), adresse `https://<site>/api/evenements/paiement` |

Permissions de la clé restreinte (écriture sauf mention) : Customers, Checkout Sessions,
Coupons, Payment Intents, Payment Methods, Products, Prices, Refunds, Subscriptions,
Subscription Schedules, Customer portal ; lecture : Invoices, Invoice Payments, Disputes,
Events.

Événements à cocher sur le webhook : `checkout.session.completed`,
`checkout.session.async_payment_failed`, `invoice.paid`, `invoice.payment_failed`,
`invoice.payment_action_required`, `refund.created`, `charge.dispute.created`.

#### Réglages du tableau de bord Stripe (une fois, en mode test puis en mode production)

À faire par Régis (propriétaire du compte) avant la recette :

1. **Dossier** : informations « matériel médical » demandées par Stripe — **fournies le
   15 novembre 2026** à l'ouverture du compte.
2. **Moyens de paiement** (Paramètres › Paiements › Moyens de paiement) : Cartes, Apple Pay,
   Google Pay et **Prélèvement SEPA** activés ; le reste désactivé.
3. **Emails clients** (Paramètres › Emails clients) : **désactiver** les reçus de paiements
   réussis, de remboursements et les emails de factures — Odoo émet les factures et le site
   envoie ses propres emails.
4. **Factures d'abonnement** (Paramètres › Billing › Abonnements et emails) : nouvelles
   tentatives automatiques **désactivées** ; en cas d'échec de toutes les tentatives :
   **laisser l'abonnement impayé** (pas d'annulation par Stripe). Les relances et la suspension
   suivent les règles du site, réglées dans Odoo.
5. **Portail client** (Paramètres › Billing › Portail client) : autoriser **uniquement** la mise à
   jour des moyens de paiement (pas de résiliation, pas de changement d'offre, pas
   d'historique de factures) ; lien de retour : la page Mon compte › Locations du site.
6. **Clé restreinte** et **webhook** : voir le tableau ci-dessus ; saisir la clé et le secret de
   signature directement dans Scalingo, jamais dans un email ni une conversation.

### Emails réels par Brevo (F25)

Sur le site de recette, puis sur le site public, quand les emails doivent vraiment partir :

| Variable | Valeur |
|---|---|
| `CONNECTOR_EMAILING` | `real` |
| `EMAILING_API_KEY` | clé API créée dans Brevo (SMTP et API › Clés API), **une par site**, saisie directement ici |
| `EMAILING_ENVIRONNEMENT` | `recette` sur le site de recette, `production` sur le site public |
| `EMAILING_ADRESSES_AUTORISEES` | **recette uniquement** : adresses ou domaines autorisés, séparés par des virgules (par exemple `contact@explocardio.fr, @explocardio.fr`). Les autres emails ne partent pas et restent consultables au back-office. À laisser vide sur le site public. |
| `EMAILING_TEST_DESTINATAIRE` | recette uniquement : boîte qui reçoit les tests de contrat (une adresse autorisée) |

#### Fiche : brancher Brevo sur le site de recette

Aucune clé n'est jamais écrite dans un email, une conversation ou un fichier du dépôt : elle va
directement de Brevo à Scalingo.

1. **Créer la clé dans Brevo** (compte de Régis) : **Paramètres** (roue dentée, en bas à
   gauche) → **SMTP et API** (ou « Clés API ») → onglet **Clés API** → **Générer une nouvelle
   clé API**. Nom : `explocardio-recette` ; expiration 1 an (à renouveler ensuite) ; accès
   **Restreint** : **Emails transactionnels = Tous** (envoi et suivi), **contact = Tous**
   (consentements), toutes les autres ressources sur **Aucune**. Copier la clé tout de suite
   (Brevo ne la montre qu'une fois) et la coller dans Scalingo à l'étape 3, sans l'enregistrer
   ailleurs.
2. **Adresses IP** : si Brevo restreint les appels aux adresses IP connues (**Sécurité** →
   **Adresses IP autorisées**), désactiver ce blocage : Scalingo n'a pas d'adresse fixe, et
   tous les envois seraient refusés (« unrecognised IP address »).
3. **Scalingo**, application `explocardio-recette` → onglet **Environment** → ajouter :

   | Variable | Valeur |
   |---|---|
   | `CONNECTOR_EMAILING` | `real` (remplace `demo`) |
   | `EMAILING_API_KEY` | la clé copiée à l'étape 1 |
   | `EMAILING_ENVIRONNEMENT` | `recette` |
   | `EMAILING_ADRESSES_AUTORISEES` | `@explocardio.fr` puis, séparées par des virgules, les adresses personnelles de l'équipe (celles de `RECETTE_EQUIPE`) et les boîtes de test (Gmail, Outlook) |
   | `EMAILING_TEST_DESTINATAIRE` | `contact@explocardio.fr` (ou une autre adresse de la liste) |

4. **Déployer** `main` (onglet **Deploy** → **Manual deployment**). Si une variable manque, le
   site le dit au back-office (« configuration incomplète ») et aucun email ne part.
5. **Vérifier** :
   - **Mot de passe oublié** depuis la page de connexion, avec votre adresse d'équipe → email
     reçu en moins de 2 minutes, expéditeur « ExploCardio.fr » ; choisir un nouveau mot de
     passe (il remplace le mot de passe provisoire).
   - Back-office › **Emails** › **Modèles** → ouvrir un modèle (commande payée, facture…) →
     **M'envoyer un email de test** : rendu identique à l'aperçu, ni logo ni pied de page Brevo.
   - **Formulaire de contact** et **demande Informatique médicale** depuis le site → email
     reçu sur contact@explocardio.fr.
   - Répondre à un email reçu → la réponse arrive sur contact@explocardio.fr.
   - Back-office › **Emails** → état « remis » en moins de 5 minutes.
   - Dans Gmail, « Afficher l'original » : `dkim=pass` et `dmarc=pass`.
   - Envoi vers une adresse hors liste (par exemple un client de test inscrit avec une adresse
     non autorisée) → rien ne part, ligne « Bloqué en recette » au back-office.

Les emails de commande, de facture et d'échéance réels attendront la recette Stripe (F24) :
ils supposent des commandes enregistrées dans Odoo (F14, lots 2 et 3), sur la copie neutralisée.

## Site de recette (F14) : les produits réels d'Odoo, avant l'ouverture

Deuxième site, **distinct de la démonstration** : il lit les produits de la **vraie base Odoo**
et sert à préparer le catalogue (textes, photos, documents, publication) avant l'ouverture.
Il est fermé par un mot de passe, invisible des moteurs de recherche, et **n'écrit jamais dans
Odoo** : réglé en « recette », le site refuse toute écriture dans une base qui n'est pas une
copie neutralisée. Création de compte client, devis et commandes s'y arrêtent donc sur une
erreur : c'est voulu. Paiements et emails restent en démonstration (aucun n'est réel).

Ce qui est saisi au back-office est gardé dans la base du site, photos comprises, rattaché à la
**référence** de chaque produit dans Odoo : ne pas changer les références (« Référence interne »)
dans Odoo, sinon les contenus correspondants ne sont plus reliés.

### 1. Créer l'application et sa base (Scalingo)

1. Tableau de bord Scalingo → **Create an app** : nom `explocardio-recette`, région
   **osc-fr1** (Paris).
2. Onglet **Deploy** → **Configure integration** → **GitHub** : dépôt `ExploCardio.fr`,
   branche `main`. Laisser le déploiement automatique **désactivé** (déploiement manuel, comme la
   démonstration).
3. Onglet **Resources** → **Add-on** → **PostgreSQL**, offre Starter 512M (sauvegardes
   quotidiennes). Scalingo crée alors `SCALINGO_POSTGRESQL_URL`.
4. Onglet **Resources** → conteneur **web** : taille **M**, **1** conteneur.

Aucune base de démonstration : ne créez pas d'équivalent de `explocardio-demo-db`.

### 2. Créer la clé d'accès à Odoo

Dans la vraie base Odoo, connecté avec le compte qui servira au site (celui de Régis, par
exemple : un utilisateur dédié occuperait une licence payante) :

1. Avatar en haut à droite → **Mon profil** (ou **Préférences**) → onglet **Sécurité du compte**.
2. **Nouvelle clé API** → mot de passe Odoo → nom « Site de recette », durée la plus longue
   proposée, type (« scope ») **rpc** si demandé → **Générer la clé**.
3. Copier la clé **directement** dans Scalingo (étape 3) : Odoo ne la montre qu'une fois. Ne
   jamais l'envoyer par email ni la coller dans une conversation.

Noter aussi : l'adresse de la base (`https://<nom>.odoo.com`), le **nom de la base** (souvent le
même que `<nom>`, visible dans Paramètres → Activer le mode développeur → en bas de la page
Paramètres, ou dans le gestionnaire de bases) et l'**adresse email de connexion** de ce compte.

### 3. Saisir les variables (onglet Environment)

| Variable | Valeur |
|---|---|
| `SITE_MODE` | `recette` |
| `CONNECTOR_ODOO` | `real` |
| `CONNECTOR_STRIPE`, `CONNECTOR_PCA`, `CONNECTOR_EMAILING` | `demo` |
| `ODOO_URL` | adresse de la vraie base, par exemple `https://explocardio.odoo.com` |
| `ODOO_DATABASE` | nom de la base Odoo |
| `ODOO_USER` | adresse email de connexion du compte qui a créé la clé |
| `ODOO_API_KEY` | la clé créée à l'étape 2 |
| `ODOO_ENVIRONNEMENT` | `recette` (**jamais** `production` sur ce site : c'est ce qui interdit toute écriture dans la vraie base) |
| `DATABASE_URL` | `$SCALINGO_POSTGRESQL_URL` |
| `AUTH_SECRET` | chaîne aléatoire de 48 caractères ou plus, **nouvelle** (ni celle de la démonstration, ni celle de votre poste) |
| `RECETTE_SITE_PASSWORD` | mot de passe d'accès au site (12 caractères au moins), à donner à Régis |
| `RECETTE_EQUIPE` | premiers comptes du back-office, au format `Nom <adresse>` séparés par des points-virgules, par exemple `Pauline Kurkdjian <adresse-de-pauline>; Régis <adresse-de-régis>` |
| `RECETTE_EQUIPE_PASSWORD` | mot de passe **provisoire** de ces comptes (12 caractères au moins) |
| `SITE_URL` | `https://explocardio-recette.osc-fr1.scalingo.io` |
| `TRUSTED_PROXY` | `1` |
| `STORAGE_DIR` | `/app/stockage` |

Ne pas renseigner `DEMO_DATABASE_URL`, `DOMAINES_PAGE_ATTENTE` ni les variables `DEMO_*`.

### 4. Déployer

Onglet **Deploy** → **Manual deployment** → branche `main` → **Trigger deployment**. Dans le
journal du déploiement, la ligne attendue est :
`✓ Site de recette prêt : mot de passe d'accès créé, 2 compte(s) d'équipe créé(s).`
Si une variable manque, le déploiement s'arrête en la nommant (l'ancienne version continue de
tourner) : la corriger, puis relancer.

À chaque déploiement suivant, les comptes existants ne sont jamais modifiés ; une personne
ajoutée à `RECETTE_EQUIPE` est créée. Changer `RECETTE_SITE_PASSWORD` puis redéployer remplace
le mot de passe d'accès (les accès déjà ouverts sont refermés).

### 5. Première connexion de chaque personne

1. Ouvrir `https://explocardio-recette.osc-fr1.scalingo.io` → mot de passe du site.
2. **Mon compte** → adresse email et mot de passe provisoire.
3. Le site demande d'**activer la double authentification** : application d'authentification
   sur le téléphone (Google Authenticator, Microsoft Authenticator…), scanner le code, saisir le
   code à 6 chiffres, **garder les codes de secours**.
4. Le mot de passe provisoire reste valable : chaque compte est protégé par sa propre double
   authentification. Pour le changer, il faudra que les emails partent vraiment sur ce site
   (Brevo en recette, voir « Emails réels par Brevo », avec vos adresses dans
   `EMAILING_ADRESSES_AUTORISEES`) puis passer par **Mot de passe oublié**.

Les autres membres de l'équipe s'ajoutent par `RECETTE_EQUIPE` (puis redéploiement) : sur ce
site, l'invitation par email du back-office n'envoie rien.

### 6. Vérifier que les produits remontent

1. Back-office → **Catalogue** : la liste montre les produits d'Odoo (référence, prix HT,
   catégorie). Rien n'apparaît encore côté public : un produit n'y figure qu'une fois **publié**.
2. Back-office → **Paramètres** → Catalogue → **Rubrique de chaque catégorie Odoo** : une ligne
   par catégorie de premier niveau d'Odoo, avec sa rubrique du site (`holter-ecg`, `mapa`,
   `effort`, `ecg-repos`, `accessoires`). Exemple : `Holter ECG = holter-ecg`. Une catégorie
   absente de cette liste n'est pas affichée.
3. Back-office → Catalogue → **Contrôle des données Odoo** : liste ce qui bloque ou manque
   (référence absente ou en double, prix, catégorie, type d'article…), à corriger dans Odoo.
4. Ouvrir un produit → rédiger, ajouter une photo → **Enregistrer le contenu** → **Publier** :
   il apparaît dans sa famille sur le site, avec le prix d'Odoo.

Les changements faits dans Odoo (prix, stock, catégories) apparaissent sur le site en quelques
minutes.

## Fichiers téléversés

Le disque d'un conteneur Scalingo est **effacé à chaque déploiement et redémarrage**. Les
fichiers téléversés au back-office (photos, logos, PDF, vidéos de l'aide) sont donc gardés
**dans la base du site** (table `fichier_stocke`) et survivent aux déploiements. Les fichiers
déposés avant ce changement sont perdus : déposez-les à nouveau. `STORAGE_DIR` ne sert plus
qu'à relire d'anciens fichiers en local. Avant la mise en ligne réelle, un stockage objet (S3
compatible, hébergé en France) prendra le relais — à prévoir dans F14.

## Page d'attente sur www.explocardio.fr (F17)

Tant que le site n'est pas ouvert, `www.explocardio.fr` (adresse des brochures et de leur QR
code) n'affiche que la page d'attente : annonce de l'ouverture et formulaire « Être prévenu de
l'ouverture ». Toute autre adresse de ce domaine y renvoie ; la démonstration, le back-office et
l'API n'y sont pas accessibles. La démonstration reste sur `explocardio.osc-fr1.scalingo.io`,
protégée par son mot de passe. Les inscriptions sont dans le back-office : Demandes →
« Inscriptions à l'ouverture » (liste, export CSV, suppression).

Réglages (faits le 2026-10-27) :

1. **o2switch** (domaine et DNS) : le domaine `explocardio.fr` est ajouté à l'hébergement
   (cPanel → Domaines). Dans l'éditeur de zone, `www.explocardio.fr` est un **CNAME** vers
   `explocardio.osc-fr1.scalingo.io.` ; une redirection permanente (cPanel → Redirections)
   envoie `explocardio.fr` vers `https://www.explocardio.fr`.
2. **Scalingo** : Settings → Domains / SSL → `www.explocardio.fr` ajouté, **sans** le marquer
   comme domaine principal (sinon l'adresse de la démonstration serait redirigée). Le certificat
   HTTPS est créé automatiquement.
3. **Variable** `DOMAINES_PAGE_ATTENTE=www.explocardio.fr` (Environment).

À l'ouverture du site : retirer la variable, puis faire de `www.explocardio.fr` l'adresse du
site (`SITE_URL`).

## Référencement de la page d'attente (F21)

Depuis F21, la page d'attente de `www.explocardio.fr` est **indexable** par les moteurs de
recherche, avec son `robots.txt` et un plan du site d'une seule adresse
(`https://www.explocardio.fr/sitemap.xml`). La démonstration (adresse scalingo.io) reste
fermée aux moteurs : en-tête `X-Robots-Tag: noindex`, balise `noindex`, `robots.txt`
« Disallow: / ». La règle est dans `src/lib/referencement/politique.ts` ; en cas de
configuration absente ou inconnue, rien n'est indexable.

Vérification après déploiement :

```bash
curl -sI https://www.explocardio.fr | grep -i robots        # rien
curl -s https://www.explocardio.fr/robots.txt               # Allow: / et Sitemap:
curl -s https://www.explocardio.fr/sitemap.xml              # une seule <loc>
curl -sI https://explocardio.osc-fr1.scalingo.io/demo/acces | grep -i robots   # noindex
```

**Search Console et Bing Webmaster Tools** : validation recommandée **par le DNS** (o2switch,
enregistrement TXT donné par Google, propriété de domaine `explocardio.fr`), puis soumettre
`https://www.explocardio.fr/sitemap.xml` et demander l'indexation de `/`. Bing importe le site
depuis la Search Console. En secours, validation par balise : variables facultatives
(onglet Environment), à saisir vous-même :

| Variable | Valeur |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | code de la balise `google-site-verification` donné par la Search Console |
| `BING_SITE_VERIFICATION` | code de la balise `msvalidate.01` donné par Bing |

Ces balises ne sont servies que sur la page d'attente et, plus tard, en production.
