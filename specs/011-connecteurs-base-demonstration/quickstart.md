# Guide de validation — F11 Connecteurs et base de démonstration

Ce guide décrit **comment vérifier que F11 fonctionne**, une fois le module implémenté. Les
noms de commandes ci-dessous sont ceux prévus par le plan ; ils seront créés par les tâches
de F11.

## Prérequis

- Node.js (version LTS) et PostgreSQL disponibles en local, ou l'environnement de
  démonstration de l'hébergeur.
- Fichier `.env.local` créé à partir de `.env.example`, avec **tous les connecteurs en mode
  démonstration** :
  `SITE_MODE=demo`, `CONNECTOR_ODOO=demo`, `CONNECTOR_STRIPE=demo`, `CONNECTOR_PCA=demo`,
  `CONNECTOR_EMAILING=demo`. Aucune clé de service réel n'est nécessaire.

## 1. Remplir la base de démonstration

```bash
npm run demo:seed
```

Attendu : la base de démonstration est créée avec le catalogue de la brochure, une quinzaine
de médecins fictifs, les cas utiles et les cinq comptes de démonstration. La commande
affiche les identifiants des comptes de démonstration (adresses en `@demo.explocardio.test`,
qui ne peuvent appartenir à personne).

| Compte | Cas illustré |
|---|---|
| client avec droits | Client aux droits d'assistance actifs, avec commandes, location et bons d'achat |
| client sans droits | Client sans droits d'assistance |
| compte en attente | Compte en attente de validation |
| administrateur | Toutes les fonctions du back-office, outils de démonstration |
| support | Consultation des clients et de leurs droits, accès Cloud |

## 2. Ouvrir le site de démonstration

```bash
npm run dev
```

Attendu (FR-034 à FR-037) :
- sans le mot de passe de démonstration, aucune page n'est accessible ;
- avec le mot de passe, le site s'ouvre ; le bandeau « Version de démonstration — données
  fictives » est visible sur toutes les pages et ne peut pas être masqué ;
- `robots.txt` interdit l'indexation et chaque réponse porte l'en-tête de non-indexation.

## 3. Dérouler les parcours en démonstration (SC-001)

Avec les comptes de démonstration, vérifier de bout en bout : inscription, achat avec
paiement American Express (issues « accepté », « refusé », « authentification forte »),
mise à disposition, fidélité, demande de financement ou de devis. Automatiquement :

```bash
npm run test:e2e
```

Attendu : tous les parcours passent ; les contrôles d'accessibilité (axe-core) ne relèvent
aucune non-conformité WCAG 2.2 AA.

## 4. Vérifier qu'aucune requête ne sort (SC-003, SC-014)

```bash
npm run test:no-egress
```

Attendu : aucune requête vers Odoo, Stripe, la plateforme PCA, l'outil d'emailing ni Google
Fonts pendant l'ensemble des parcours.

## 5. Tests de contrat des connecteurs (SC-004)

```bash
npm run test:contract
```

Attendu : les tests de contrat de chaque connecteur passent en mode démonstration. En
phase 3 (F15), la même commande, avec un connecteur en mode `real` et ses identifiants de
test, rejoue les mêmes tests sans modification (SC-011).

## 6. Changer le mode d'un connecteur (SC-005)

Passer `CONNECTOR_STRIPE=real` sans fournir d'identifiants, relancer le site.
Attendu : aucun fichier de page ni de composant n'a été modifié ; le connecteur Stripe
refuse de fonctionner et le signale (`ConfigurationIncomplete`) ; il ne bascule pas seul en
démonstration ; l'écran de paiement de démonstration a disparu.

## 7. Boîte de démonstration (SC-007)

Après une inscription et une commande, ouvrir le back-office en administrateur → boîte de
démonstration. Attendu : les emails aux clients et les notifications d'équipe y figurent,
séparés et filtrables ; aucun n'a été réellement envoyé.

## 8. Factures fictives (SC-008)

Ouvrir une facture dans « Mon compte ». Attendu : PDF portant la mention « FICTIVE ».

## 9. Écran de démonstration (SC-009)

En administrateur : modifier le prix d'un article et un taux de bons d'achat, puis ouvrir la
fiche et un panier. Attendu : nouvelles valeurs visibles en moins de 5 secondes ; une valeur
incohérente est refusée ; un compte support ou commercial n'a pas accès à l'écran.

## 10. Réinitialiser (SC-002, SC-013)

Depuis le back-office (administrateur), ou :

```bash
npm run demo:reset
```

Attendu : en moins d'une minute, la base de démonstration, les comptes créés pendant la
séance, les demandes et la boîte de démonstration sont remis à l'état de départ ; contenus
et paramètres du site sont intacts ; les cinq comptes de démonstration permettent de se
connecter immédiatement.

## 11. Contrôles de la charte et performance

```bash
npm run lint
npm run check:contrast
npm run test:lighthouse
```

Attendu : aucune couleur ni police codée en dur hors des tokens ; contrastes conformes ;
pages catalogue utilisables en moins de 2 secondes en profil mobile 4G.
