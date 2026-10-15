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
| `CONNECTOR_ODOO` | Odoo (8 domaines) | `ODOO_URL`, `ODOO_DATABASE`, `ODOO_USER`, `ODOO_API_KEY` |
| `CONNECTOR_STRIPE` | Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `CONNECTOR_PCA` | Plateforme Cloud PCA | `PCA_API_URL`, `PCA_API_KEY` |
| `CONNECTOR_EMAILING` | Emailing | `EMAILING_API_KEY` |

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
