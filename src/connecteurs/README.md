# Connecteurs

Les pages, composants, actions serveur et tâches de fond n'accèdent aux services externes
(Odoo, Stripe, plateforme Cloud PCA, emailing) **que par le registre** :

```ts
import { registre } from "@/connecteurs/registre";

const article = await registre.odoo().catalogue.lireArticle("EC-DMS-3004L");
```

Ils ne connaissent que les interfaces (`*/interfaces`). Importer une implémentation
(`*/demo`, `*/real`) ou un SDK externe hors de ce dossier est refusé par le lint
(principe III de la constitution).

## Choisir le mode d'un connecteur

Une variable d'environnement par connecteur, valeur `demo` (par défaut) ou `real` :

| Variable | Connecteur | Variables exigées en mode `real` |
|---|---|---|
| `CONNECTOR_ODOO` | Odoo (8 domaines) | `ODOO_URL`, `ODOO_DATABASE`, `ODOO_USER`, `ODOO_API_KEY`, `ODOO_ENVIRONNEMENT` (`recette` ou `production`) |
| `CONNECTOR_STRIPE` | Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `CONNECTOR_PCA` | Plateforme Cloud PCA | `PCA_API_URL`, `PCA_API_KEY` |
| `CONNECTOR_EMAILING` | Emailing | `EMAILING_API_KEY` |
| `CONNECTOR_STOCKAGE` | Stockage des fichiers téléversés (F26) | `STOCKAGE_ENVIRONNEMENT` (`recette` ou `production`), `STOCKAGE_COMPARTIMENT`, `STOCKAGE_CLE_ACCES`, `STOCKAGE_CLE_SECRETE` ; facultative : `STOCKAGE_REGION` (`fr-par` par défaut) |

Changer de mode ne demande **aucune modification** de page ni de composant ; il suffit de
redémarrer le site. Une configuration mixte est possible (par exemple Stripe réel, le reste
en démonstration).

## Configuration incomplète

Un connecteur en mode `real` dont une variable manque — ou dont l'implémentation réelle n'est
pas encore livrée — lève `ConfigurationIncomplete` à **chaque** appel. Il ne bascule
**jamais** seul en démonstration (FR-007). Les implémentations réelles sont livrées par
**F14** (phase 2) ; elles rejouent les mêmes tests de contrat (`npm run test:contract`) en
phase 3 (F15).

## Contrôles automatiques autour de chaque appel

- **Journal** : chaque appel est inscrit dans le journal des connecteurs (`journal.ts`).
- **Pannes simulées** (mode démonstration) : `ServiceUnavailable` si la panne est activée
  dans le back-office (`panne-simulee.ts`).
- **Données fictives** (mode réel) : toute donnée de démonstration est refusée
  (`DemoDataRejected`, `garde-donnees-fictives.ts`).
- **Garde réseau** (mode démonstration) : aucune requête sortante vers le service
  (`garde-reseau.ts`, activée au démarrage par `instrumentation.ts`).

## Mode réel d'Odoo (F14)

Livré par lots. **Lot 1** : catalogue et lecture du stock (lecture seule). **Lot 2** : clients et
opportunités. **Lot 3** (en cours) : panier, commandes carte et virement, devis enregistrés
(`specs/014-branchement-odoo/plan-lots-2-3.md`). Les autres domaines lèvent
`ConfigurationIncomplete` jusqu'à leur lot.

- **Accès** : API externe JSON-RPC d'Odoo (`odoo/real/client.ts`), clé API au scope RPC. La clé
  n'apparaît jamais dans un message, un détail d'erreur ni le journal.
- **`ODOO_ENVIRONNEMENT`** : `recette` (copie neutralisée) ou `production`. Avant toute écriture,
  le site lit `database.is_neutralized` : en recette, il refuse d'écrire dans une base non
  neutralisée ; en production, dans une base neutralisée (`OperationRefused`).
- **Champs de la fiche produit** (créés avec Studio, décision du 2026-11-20), repérés par leur
  libellé : **Marque** ; **Type d'article** (Équipement, Consommable, Accessoire, Logiciel,
  Service ; pluriel accepté) ; **A publier** (case). Quand la case existe, seuls les produits
  cochés sont lus ; les autres (pièces de kit, frais d'importation…) sont ignorés sans anomalie.
  Base sans ces champs : Marque et Type d'article sont lus dans les propriétés.
- **Propriétés produit** (définies sur chaque catégorie qui contient le produit ; une propriété
  ne descend pas aux sous-catégories) : Quantité par lot ; Mise à disposition – premier mois HT ;
  Mise à disposition – mois suivants HT ; Valeur de remplacement HT ; Kit requis ; Logiciel
  Cloud ; Éligible aux bons d'achat ; Frais de livraison HT (ou « Livraison spéciale ») ; Frais
  d'installation HT (ou « Frais d'installation ») ; Seuil de franco HT (produit `LIVRAISON`).
  Montants en nombre, ou en texte tel que « 125 € ».
- **Catégorie racine** : un premier niveau « All » est facultatif dans la correspondance des
  rubriques (`MAPA` et `All / MAPA` désignent la même catégorie).
- **Rubriques du site** : paramètre « Rubrique de chaque catégorie Odoo » (back-office,
  Paramètres › Catalogue Odoo).
- **Prix client** : le site applique les règles simples des listes de prix (prix fixe, remise
  en %, quantité minimale) pour l'affichage ; les autres sont signalées. Le montant d'une
  commande est toujours calculé par Odoo.
- **Écritures** (lot 2 et suivants) : une seule fois par clé et par base Odoo (table
  `ecriture_odoo` de la base du site, `odoo/real/ecritures.ts`). Fiche client : référence
  `P` + identifiant Odoo ; recherche par SIRET puis email avant toute création ; SIRET en
  double → `OperationRefused` (`siret_en_double`). Opportunités : CRM, étiquette « Site ».
  Après un changement de base Odoo (copie → base réelle), les références `P…` des comptes de
  recette ne sont plus valables.
- **Commandes** (lot 3) : produit de port de référence `LIVRAISON` (prix = forfait HT,
  propriété « Seuil de franco HT ») ; produits volumineux : « Frais de livraison HT » et
  « Frais d'installation HT ». Référence d'une commande = son numéro Odoo ; clé dans
  « Référence client » ; paiement Stripe dans « Réf. de paiement » ; PDF des devis par le lien
  de portail. Ni promotions ni codes promo à l'ouverture. Toute commande expédiée porte une
  ligne `LIVRAISON`, à 0 € quand le franco est atteint. Client « Mauvais débiteur »
  (Comptabilité › degré de confiance, fiche principale) : plus de commande en ligne.
- **Rapport de contrôle** : back-office › Catalogue › Contrôle des données Odoo (export CSV).
- **Tests** : `tests/unit/odoo-reel/` (sans réseau) ; tests de contrat en mode réel sur la copie :
  `CONNECTOR_ODOO=real npm run test:contract -- tests/contract/odoo/catalogue.test.ts tests/contract/odoo/stock.test.ts`.

## Mode réel du stockage (F26)

Fichiers déposés au back-office (photos, logos, PDF, vidéos et sous-titres de l'aide).
Démonstration : table `fichier_stocke` de la base du site. Réel : compartiment **privé**
Scaleway Object Storage à Paris, un par site (`explocardio-recette`, `explocardio-production`).

- **Accès** : `@aws-sdk/client-s3` (compatible S3), seulement dans `stockage/real/client.ts` ;
  point d'accès `https://s3.<région>.scw.cloud`. Délais : 10 s sans réponse, 60 s pour un dépôt ;
  2 tentatives. La clé n'apparaît dans aucun message, détail d'erreur ni journal.
- **Garde** : le nom du compartiment doit contenir le mot de `STOCKAGE_ENVIRONNEMENT` et pas
  l'autre ; sinon `ConfigurationIncomplete` à chaque appel et alerte dans « À traiter ».
- **Lecture** : les adresses `/stockage/…` et leurs en-têtes de sécurité ne changent pas ; le
  site relit l'objet en flux, par plages pour les vidéos (`Range`). Fichier absent du
  compartiment → secours dans la base du site, puis dans `STORAGE_DIR`.
- **Erreurs** : objet absent → `NotFound` ; clé refusée → `ConfigurationIncomplete`
  (`STOCKAGE_CLE_*`) ; compartiment inconnu → `ConfigurationIncomplete`
  (`STOCKAGE_COMPARTIMENT`) ; plage impossible → `OperationRefusee` (416) ; réseau, délai,
  5xx → `ServiceUnavailable` (dépôt refusé avec « momentanément indisponible », lecture 503).
- **Journal** : dépôts et erreurs seulement (les lectures réussies ne sont pas journalisées).
- **Reprise** des fichiers déjà en base : `npm run stockage:reprise` (rejouable, contrôle de
  taille et MD5), puis `npm run stockage:reprise -- --effacer-la-base` pour vider la table une
  fois chaque objet vérifié (`stockage/real/reprise.ts`, `scripts/reprise-stockage.ts`).
- **Tests** : `tests/unit/stockage-reel/` (client S3 simulé) ; contrat en mode réel sur le
  compartiment de recette (laisse des fichiers sous `stockage/tests-contrat/`).
