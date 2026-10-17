# Implementation Plan: F04 — Panier, paiement Stripe et demandes de financement

**Branch**: `004-panier-paiement-financement` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-panier-paiement-financement/spec.md`

## Summary

F04 complète le panier de F03 (deux blocs, quantités, code promo, fusion à la connexion),
livre le tunnel de commande en cinq étapes, le paiement par carte (dont American Express) et
par virement, la souscription d'une mise à disposition mensuelle (carte ou SEPA), le suivi
des commandes, factures et avoirs dans « Mon compte », les remboursements et la demande de
financement longue durée avec son traitement au back-office.

Approche : **aucune nouvelle technologie**. Odoo calcule les montants (nouvelle opération
« Calculer un devis ») et enregistre commandes, factures, avoirs, stocks et abonnements ;
Stripe encaisse ; le site orchestre le parcours et garantit **une seule commande par
paiement** grâce à la commande du site (clé d'idempotence) et au traitement unique des
événements de F11. En phase 1, tout passe par les connecteurs de démonstration.

Le détail des choix est dans [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F03, sans ajout (Next.js 16, Prisma, Better Auth,
pg-boss, React Email)

**Storage** : base du site (panier, commande du site, demandes de financement, suivi des
notifications, paramètres) — voir [data-model.md](data-model.md) ; Odoo par son connecteur
(commandes, factures, avoirs, stocks, abonnements, codes promo, frais de port) ; Stripe par
son connecteur (paiements, abonnements, remboursements)

**Testing** : Vitest (fusion des paniers, états de la commande du site, idempotence des effets
de paiement, règles de virement, demande de financement) ; tests de contrat d'Odoo pour les
nouvelles opérations et de Stripe pour les événements ; Playwright avec axe-core (panier,
tunnel au clavier, carte acceptée, refusée, authentification forte, confirmation tardive et
répétée, rupture, virement, panier mixte, financement, suivi, remboursement)

**Target Platform** : navigateurs récents ; serveur Node.js chez o2switch

**Project Type** : application web unique

**Performance Goals** : du panier à la confirmation en moins de 2 minutes (SC-004) ; commande
visible dans « Mon compte » dès la confirmation (SC-013) ; demande de financement en moins de
3 minutes (SC-010)

**Constraints** : une seule commande par paiement, jamais deux débits (SC-002, FR-022,
FR-023) ; aucune donnée de carte sur le site (SC-008) ; seul un compte validé commande
(SC-009) ; aucune facture émise par le site (FR-028) ; aucun nom d'organisme de financement
(SC-011) ; WCAG 2.2 AA et tunnel au clavier (SC-012)

**Scale/Scope** : quelques dizaines de commandes par jour au plus ; une quinzaine d'écrans

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Parcours dédiés au matériel, consommables et mises à disposition du catalogue | ✅ |
| II. Simplicité | Tunnel en 5 étapes, reprise sans ressaisie, montants HT d'abord | ✅ |
| III. Connecteurs | Montants, commandes, factures, avoirs, stocks, abonnements dans Odoo ; paiements dans Stripe ; nouvelles opérations ajoutées aux **contrats** avec tests communs aux deux modes ; le site ne garde que l'état du parcours | ✅ |
| IV. Aucune donnée patient | Aucun champ de patient ; financement limité au cabinet | ✅ |
| V. Sécurité et conformité | Aucune donnée de carte (Stripe) ; secrets hors du code ; factures émises par Odoo, « FICTIVE » en phase 1 ; journal des actions | ✅ |
| VI. Règles paramétrables | Frais de port, franco, codes promo, cumul, délai de virement, durées de financement dans Odoo ; heure limite express et RIB en paramètres du site | ✅ |
| VII. Identité visuelle | Composants et emails de la charte | ✅ |
| VIII. Accessibilité | Tunnel au clavier, repère de progression, erreurs reliées aux champs, axe-core | ✅ |
| IX. Ton éditorial | Vouvoiement, messages de refus clairs et sobres | ✅ |
| X. Petits incréments | 8 user stories testables séparément ; critères [Phase 1] / [Phase 3] | ✅ |
| XI. Langue et périmètre | Français ; livraison en France métropolitaine | ✅ |

Aucune violation. **Re-vérification après conception** : le devis calculé par Odoo évite de
dupliquer les règles de prix ; la commande du site ne contient ni prix de référence ni
donnée bancaire. ✅

## Architecture

```text
Client ─ /panier ─ /commande/… ─┐               ┌─ Odoo (démo) : devis, commandes, virement,
                                │  Site Next.js │  factures, avoirs, abonnements, remboursements
Page de paiement (Stripe/démo) ─┤  src/domaine/ ├─ Stripe (démo) : sessions, événements,
  └─ événements ─→ gestionnaire │  commande/    │  remboursements
     de F11 (une seule fois)    │  financement/ ├─ Base du site : panier, commande du site,
Équipe ─ /admin/financements ───┘               │  demandes de financement, suivi
                                                └─ File d'attente : rattrapage, suivi (5 min),
                                                   virements (quotidien)
```

## Project Structure

### Documentation (this feature)

```text
specs/004-panier-paiement-financement/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── odoo.md       # opérations ajoutées au connecteur Odoo
│   ├── ecrans.md     # panier, tunnel, Mon compte, back-office
│   ├── domaine.md    # fonctions du domaine
│   └── emails.md     # emails et notifications
└── checklists/requirements.md
```

### Source Code (repository root)

```text
app/(public)/panier/, commande/(adresses|livraison|paiement|recapitulatif|retour|confirmation/[ref])/,
  financement/demande/, mon-compte/(commandes|factures|locations|financements)/
app/(back-office)/admin/(financements|commandes)/ ; admin/demonstration/paiements (complété)
src/domaine/commande/ (panier.ts, tunnel.ts, paiement.ts, effets.ts, suivi.ts, virement.ts)
src/domaine/financement/ (demande.ts, administration.ts)
src/emails/modeles-commandes.tsx
src/connecteurs/odoo/ (+ devis, virement, changements, remboursements)
prisma/site/schema.prisma (+ CommandeSite, SuiviCommande ; Panier, DemandeFinancement complétés)
prisma/demo/schema.prisma (+ modes de livraison, frais, remboursements, statuts)
tests/unit/commande/, tests/unit/financement/, tests/contract/odoo/, tests/e2e/f04/
```

**Structure Decision** : application web unique ; le panier de F03 est étendu, pas remplacé.

## Secrets et configuration

Aucune nouvelle variable en phase 1 (Stripe de démonstration). Les clés Stripe réelles
arriveront avec F14, dans l'environnement du serveur uniquement (FR-042).

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-17.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Panier mixte** (achat + mise à disposition) | Une seule validation, puis deux paiements à la suite : l'achat, puis l'autorisation du prélèvement mensuel ; si le second échoue, il se reprend depuis « Mon compte » sans repayer le premier | Avant l'implémentation |
| D2 | **Modes de livraison** | Deux modes : standard et express (livré le lendemain si la commande est passée avant l'heure limite) ; heure limite 14 h, modifiable au back-office | Avant l'implémentation |
| D3 | **Abonnement au logiciel Cloud** (FR-049) | Livré avec F12 (page « Mes logiciels Cloud »), F04 fournissant le mécanisme d'abonnement | Avant l'implémentation |
| D4 | **Coordonnées bancaires du virement** | Saisies au back-office ; fictives en démonstration | Avant la mise en ligne |
| D5 | **Rappel de virement** | 2 jours avant la fin de la réservation de 7 jours, puis annulation automatique | Avant l'implémentation |
| D6 | **Suivi des expéditions et remboursements** | Le site consulte Odoo toutes les 5 minutes et prévient le client une seule fois par changement | Avant l'implémentation |
| D7 | **Bons d'achat au panier** | Affichés quand F06 est livré (déjà prévu dans le calcul) | Avant l'implémentation |
| D8 | **Mentions des factures et facture d'un équipement financé** | À valider par votre expert-comptable (déjà noté dans la spec) | Avant la mise en ligne |

## Complexity Tracking

Aucune violation de la constitution à justifier.
