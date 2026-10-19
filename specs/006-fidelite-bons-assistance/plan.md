# Implementation Plan: F06 — Fidélité, bons d'achat et droits d'assistance

**Branch**: `006-fidelite-bons-assistance` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-fidelite-bons-assistance/spec.md`

## Summary

F06 rend le programme « gagnant-gagnant » complet : bons d'achat crédités par paliers et
utilisables au panier, droits d'assistance ouverts et prolongés par les commandes de
consommables, retraits et restitutions sans avantage indu, assistance à l'acte pour les
clients sans droits, promotions annoncées automatiquement, et leur suivi dans « Mon compte »
et par l'équipe d'assistance.

Approche : **aucune nouvelle technologie**. Odoo calcule et enregistre tout (règles figées à
la date de la commande, lots de bons consommés dans l'ordre de leur expiration) ; en phase 1,
le connecteur de démonstration de F11, complété, applique les mêmes règles, vérifiées par un
jeu de commandes de référence commun aux deux modes. Le site affiche, propose et transmet ;
il relève les changements toutes les 5 minutes pour prévenir le client. Détails :
[research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F05, sans ajout

**Storage** : Odoo par son connecteur (programme, lots, mouvements, droits, interventions,
promotions) ; base du site (montant de bons choisi au panier, suivi des notifications,
délais des rappels) — voir [data-model.md](data-model.md)

**Testing** : Vitest (paliers et bornes, montant éligible, lots et ordre de consommation,
expiration, restitution, retrait partiel, droits cumul / remise à zéro / plafond, règles
figées, idempotence) ; **tests de contrat** avec le jeu de commandes de référence ;
Playwright avec axe-core (panier, Mon compte, assistance à l'acte, back-office, promotions)

**Target Platform** : navigateurs récents ; serveur Node.js chez o2switch

**Project Type** : application web unique

**Performance Goals** : bons et droits visibles en moins de 5 minutes (SC-006) ; statut des
droits trouvé par l'équipe en moins de 15 secondes (SC-007) ; solde trouvé par le client en
moins de 30 secondes (SC-008)

**Constraints** : 1 200 € HT → 120 € (SC-001) ; solde = somme des mouvements (SC-004) ;
jamais compté deux fois (SC-005) ; règles modifiables sans toucher l'acquis (SC-002) ;
WCAG 2.2 AA (SC-012)

**Scale/Scope** : quelques centaines de clients ; une dizaine d'écrans complétés

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Programme lié aux consommables du catalogue | ✅ |
| II. Simplicité | Euros de bons (pas de points), gains annoncés au panier, montants HT | ✅ |
| III. Connecteurs | Règles et données dans Odoo ; mêmes règles en démonstration, prouvées par un jeu de référence commun ; opérations ajoutées aux contrats | ✅ |
| IV. Aucune donnée patient | Aucun champ de patient | ✅ |
| V. Sécurité et conformité | Factures d'Odoo (« FICTIVE » en phase 1) ; journal des ajustements ; perte de la cagnotte annoncée avant suppression du compte | ✅ |
| VI. Règles paramétrables | Paliers, validité, seuil, durée, prolongation, plafond, prix de l'acte, promotions dans Odoo ; délais des rappels au back-office | ✅ |
| VII. Identité visuelle | Charte, motif des trois points pour le parcours consommables → bons → assistance | ✅ |
| VIII. Accessibilité | axe-core, cibles 44 px | ✅ |
| IX. Ton éditorial | Vouvoiement, explications simples | ✅ |
| X. Petits incréments | 9 user stories testables séparément | ✅ |
| XI. Langue et périmètre | Français ; France métropolitaine | ✅ |

Aucune violation. ✅

## Project Structure

```text
specs/006-fidelite-bons-assistance/ : spec, plan, research, data-model, quickstart, contracts/connecteurs.md
src/connecteurs/odoo/ (fidelite complétée, lots, interventions, promotions annonçables, jeu de référence)
src/domaine/fidelite/ (cagnotte.ts, droits.ts, suivi.ts, rappels.ts, promotions.ts)
src/emails/modeles-fidelite.tsx
app/(public)/mon-compte/(bons-achat|assistance)/ ; panier et fiches complétés ; bandeau complété
app/(back-office)/admin/assistance/ ; admin/demonstration/parametres-commerciaux complété
prisma/demo/schema.prisma (lots, interventions, règles figées, limites des promotions)
prisma/site/schema.prisma (Panier.bonsDemandesHt, SuiviFidelite)
tests/unit/fidelite/, tests/contract/odoo/fidelite.test.ts, tests/e2e/f06/
```

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-19.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Bons au panier** | Activés ; le client choisit le montant, le maximum utilisable étant proposé par défaut | Avant l'implémentation |
| D2 | **Rappels par email** | 7 jours avant la fin des droits ; 30 jours avant l'expiration de bons ; délais modifiables au back-office | Avant l'implémentation |
| D3 | **Valeurs de démonstration** (fictives, réglables dans Odoo) | Paliers 0 / 5 / 10 % à 500 et 1 000 € HT ; bons valables 12 mois ; droits ouverts dès 300 € HT de consommables par commande, pour 90 jours, cumul plafonné à 365 jours ; assistance à l'acte 150 € HT | Avant la mise en ligne (vraies valeurs) |
| D4 | **Bons déjà dépensés lors d'un remboursement** | Montant manquant déduit automatiquement du remboursement, équipe prévenue (déjà confirmé ; à valider par l'expert-comptable) | Avant la mise en ligne |
| D5 | **Assistance à l'acte** | Article « Assistance à l'acte — une intervention » dans Services, payé par carte uniquement, proposé seulement sans droits actifs ; l'équipe clôt l'intervention dans Odoo | Avant l'implémentation |
| D6 | **Annonce des promotions** | Ventes flash et remises automatiques annoncées automatiquement dans le bandeau et sur les fiches ; codes promo annoncés seulement si l'équipe les marque « à annoncer » dans Odoo | Avant l'implémentation |
| D7 | **Recherche « Assistance » au back-office** | Page dédiée, ouverte à toute l'équipe (support compris), en lecture seule | Avant l'implémentation |

## Complexity Tracking

Aucune violation de la constitution à justifier.
