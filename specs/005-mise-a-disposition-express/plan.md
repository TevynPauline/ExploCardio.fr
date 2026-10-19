# Implementation Plan: F05 — Mise à disposition (MAD) Express sans engagement

**Branch**: `005-mise-a-disposition-express` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-mise-a-disposition-express/spec.md`

## Summary

F05 livre la page « Dépannage express », le choix de la date de livraison (lendemain avant
l'heure limite), le kit d'accessoires payé une seule fois, le parcours sans compte, puis tout
le cycle de vie de la location : expédition et ouverture de l'accès Cloud, suivi et actions
dans « Mon compte » (résilier, prolonger, étiquette de retour, passer à l'achat ou au
financement), échéances, impayés, retards de retour, réception du retour et lecture du parc.

Approche : **aucune nouvelle technologie**. La commande passe par le panier et le tunnel de
F04 (complétés) ; Odoo garde le parc, les locations, les règles et la facturation ; le site
relève les changements d'Odoo toutes les 5 minutes et réagit une seule fois par changement
(emails, accès Cloud par le connecteur PCA, alertes, journal). Le détail des choix est dans
[research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F04, sans ajout

**Storage** : base du site (dates de livraison choisies, acceptation des conditions, suivi
des locations, paramètres de livraison et de rappels) ; Odoo par son connecteur (parc,
locations, kits possédés, règles, échéances, factures, étiquettes) ; Stripe (prélèvements,
éléments d'abonnement, remboursements) ; PCA (accès Cloud) — voir
[data-model.md](data-model.md)

**Testing** : Vitest (calendrier de livraison : heure limite, week-ends, jours fériés, jours non
livrés, zones ; règles du kit ; réactions aux changements de location ; concurrence sur le
dernier appareil) ; tests de contrat pour les opérations ajoutées à Odoo et Stripe ;
Playwright avec axe-core (dépannage express, visiteur sans compte, kit, expédition,
résiliation, prolongation, retour, échéances, impayé, retard, passage à l'achat et au
financement, back-office)

**Target Platform** : navigateurs récents ; serveur Node.js chez o2switch

**Project Type** : application web unique

**Performance Goals** : client validé en moins de 3 minutes, sans compte en moins de 8
minutes (SC-004) ; résiliation en moins de 2 minutes (SC-007) ; disponibilité à jour en
moins d'une minute (SC-006)

**Constraints** : lendemain proposé dans 100 % des cas éligibles (SC-001) ; jamais deux
locations sur un même appareil (SC-005) ; kit jamais facturé deux fois d'office (SC-003) ;
rappel avant toute facturation de retard (SC-010) ; aucune donnée de patient ; WCAG 2.2 AA
(SC-011)

**Scale/Scope** : un parc de quelques dizaines d'appareils ; une dizaine d'écrans

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Mise à disposition des seuls équipements du catalogue où elle est activée | ✅ |
| II. Simplicité | Dépannage en un parcours ; prix HT d'abord ; pack standard ; gestion par le client sans appel | ✅ |
| III. Connecteurs | Parc, locations, kits, règles, factures et étiquettes dans Odoo ; prélèvements dans Stripe ; accès dans PCA ; opérations ajoutées aux **contrats** avec tests communs ; actions planifiées d'Odoo simulées seulement en démonstration | ✅ |
| IV. Aucune donnée patient | Aucun champ de patient ; effacement des enregistreurs rendus hors du site ; seule l'identité professionnelle part vers PCA | ✅ |
| V. Sécurité et conformité | Aucune donnée de carte ; remboursement intégral en cas de refus du compte ; journal de chaque action | ✅ |
| VI. Règles paramétrables | Tarifs, kit, valeur de remplacement, tentatives, délais de retour, de tolérance et de non-retour dans Odoo ; heure limite, jours non livrés, zones et rappels au back-office | ✅ |
| VII. Identité visuelle | Composants et emails de la charte | ✅ |
| VIII. Accessibilité | Choix de date au clavier, axe-core sur chaque écran, cibles 44 px | ✅ |
| IX. Ton éditorial | Vouvoiement ; messages d'impayé et de retard sobres | ✅ |
| X. Petits incréments | 8 user stories testables séparément ; critères [Phase 1] / [Phase 3] | ✅ |
| XI. Langue et périmètre | Français ; livraison en France métropolitaine (Corse avec délai réel) | ✅ |

Aucune violation. **Re-vérification après conception** : le site ne calcule ni échéance ni
pénalité ; il lit les états d'Odoo et n'applique que des règles de calendrier et d'affichage.
✅

## Architecture

```text
Médecin ─ /mise-a-disposition, fiche ─ /panier (kit d'office) ─ /commande (date, conditions) ─┐
                                                                                               │
Odoo (démo) : parc, locations, kits, règles, échéances, factures, étiquettes ◄─────────────────┤ Site Next.js
Stripe (démo) : premier mois, prélèvement, éléments, remboursements ◄──────────────────────────┤ src/domaine/location/
PCA (démo) : ouverture, fermeture, suspension des accès ◄──────────────────────────────────────┤
File d'attente : relève des locations (5 min), rappels (quotidien) ─────────────────────────────┘
Équipe : Odoo (en démonstration : Démonstration → Locations) ; /admin/locations en lecture
```

## Project Structure

### Documentation (this feature)

```text
specs/005-mise-a-disposition-express/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── connecteurs.md   # opérations ajoutées à Odoo, Stripe ; usage de PCA ; emails
│   └── ecrans.md        # écrans publics, Mon compte, back-office
└── checklists/requirements.md
```

### Source Code (repository root)

```text
app/(public)/mise-a-disposition/ (Dépannage express)
app/(public)/mon-compte/locations/ (+ [ref]/resilier, [ref]/etiquette)
app/(public)/commande/livraison, recapitulatif (complétés)
app/(back-office)/admin/locations/ ; admin/demonstration/locations/ ; admin/contenus/coordonnees (complété)
src/domaine/location/ (calendrier.ts, offre.ts, kit.ts, gestion.ts, suivi.ts, rappels.ts)
src/domaine/commande/ (tunnel, paiement, effets : date, kit, compte en attente)
src/emails/modeles-locations.tsx
src/connecteurs/odoo/ (+ parc, location complétée, kits, actions planifiées de démonstration)
src/connecteurs/stripe/ (+ retrait d'un élément d'abonnement)
prisma/site/schema.prisma (+ SuiviLocation ; CommandeSite complétée)
prisma/demo/schema.prisma (+ états et champs de location, kits possédés, règles de location)
tests/unit/location/, tests/contract/odoo/location.test.ts, tests/e2e/f05/
```

**Structure Decision** : application web unique ; le tunnel de F04 est complété, pas dupliqué.

## Secrets et configuration

Aucune nouvelle variable. Les étiquettes réelles du transporteur et les accès réels de la
plateforme arriveront avec F14 (branchement).

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-19.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Parcours** | Pas de tunnel séparé : la mise à disposition passe par le panier et la commande existants, avec le choix de la date à l'étape « Livraison » | Avant l'implémentation |
| D2 | **Heure limite** | La même que la livraison express (14 h), modifiable au back-office | Avant l'implémentation |
| D3 | **Corse et zones éloignées** | Codes postaux commençant par 20 : 2 jours ouvrés de plus, sans promesse de lendemain ; liste et délai modifiables au back-office | Avant l'implémentation |
| D4 | **Kit d'accessoires** | Ajouté d'office au panier quand il manque, marqué « obligatoire, vous le conservez » ; non supprimable tant que la location est au panier | Avant l'implémentation |
| D5 | **Numéro de série** | Affiché au client à l'expédition (l'équipe peut changer d'appareil à la préparation) | Avant l'implémentation |
| D6 | **Rappels par email** | Rappel 3 jours avant chaque échéance ; rappel de retour tous les 2 jours après la date limite | Avant l'implémentation |
| D7 | **Impayés et retards** (règles d'Odoo, fictives) | 3 nouvelles tentatives sur 10 jours, puis suspension ; retour sous 5 jours ouvrés ; tolérance 5 jours avant facturation du mois suivant ; valeur de remplacement facturée à 30 jours sans retour | Avant l'implémentation |
| D8 | **Accès Cloud** | Tant que F12 n'est pas livré : ouverture et fermeture par le connecteur PCA, avec alerte à l'équipe à chaque action | Avant l'implémentation |
| D9 | **Conditions de location** (résiliation, retour, responsabilité, valeur de remplacement) | Texte provisoire en démonstration ; texte définitif rédigé avec votre conseil juridique | Avant la mise en ligne |
| D10 | **Étiquette de retour** | PDF fourni par Odoo et le transporteur ; « FICTIF » en démonstration | Avant la mise en ligne (choix du transporteur) |

## Complexity Tracking

Aucune violation de la constitution à justifier.
