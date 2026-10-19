# Implementation Plan: F12 — Accès à la plateforme Cloud HDS (Nelson / PCA)

**Branch**: `012-acces-cloud-hds` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-acces-cloud-hds/spec.md`

## Summary

F12 ouvre au médecin l'accès à ses logiciels Cloud dès l'achat, la location ou l'abonnement,
le referme proprement à la fin (délai de grâce), le présente dans « Mes logiciels Cloud », le
laisse gérer à la main par l'équipe et fonctionne que la plateforme soit automatisée ou non.

Approche : **aucune nouvelle technologie**. Un registre des accès dans la base du site et un
seul module de domaine, par lequel passent F04 (achats, abonnements), F05 (locations) et F02
(compte suspendu, supprimé, modifié) ; le connecteur PCA de F11, complété (compte unique,
prolongation, mise à jour du médecin), agit sur la plateforme ; une tâche horaire gère les
fins de droits, les rappels et les alertes. L'abonnement logiciel se souscrit par le panier
et le tunnel de F04. Détails : [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F06, sans ajout

**Storage** : base du site (`AccesLogiciel`, `TacheAcces`, paramètres) ; plateforme PCA par
son connecteur (compte et droits ; simulés en démonstration) ; Odoo par son connecteur
(période incluse par produit, abonnements logiciels) — voir [data-model.md](data-model.md)

**Testing** : Vitest (transitions d'état, compte unique, sous-modes, rappels, délai de grâce,
alertes, reprise après échec) ; **tests de contrat** PCA complétés ; Playwright avec axe-core
(Mon compte, souscription, back-office, page hébergement)

**Target Platform** : navigateurs récents ; serveur Node.js (hébergeur en cours de choix : VPS
IONOS envisagé)

**Project Type** : application web unique

**Performance Goals** : accès actif au plus tard à la livraison (SC-001) ; en mode
automatique réel, ouverture en moins de 5 minutes (SC-008, phase 3)

**Constraints** : un seul compte par médecin (SC-003) ; 100 % des ouvertures et fermetures
notifiées et journalisées (SC-004) ; aucun mot de passe ni donnée de patient (SC-005) ; même
parcours dans les deux sous-modes (SC-006) ; WCAG 2.2 AA (SC-010)

**Scale/Scope** : quelques centaines de médecins ; 4 écrans (Mon compte, souscription,
back-office, page hébergement) et les déclencheurs de F02, F04 et F05

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Logiciels d'analyse des examens du catalogue | ✅ |
| II. Simplicité | Accès en un clic depuis Mon compte ; prix de l'abonnement HT affiché | ✅ |
| III. Connecteurs | Plateforme uniquement par le connecteur PCA ; deux sous-modes sans effet sur les pages ; tests de contrat communs | ✅ |
| IV. Aucune donnée patient | Seules l'identité professionnelle et les dates d'accès transitent ; aucun mot de passe ; registre des accès sur le site, comme le prévoit le principe | ✅ |
| V. Sécurité et conformité | Journal des actions avec auteur et motif ; accès fermés à la suppression du compte ; aucune donnée de carte | ✅ |
| VI. Règles paramétrables | Période incluse et prix dans Odoo ; délai de grâce, rappels et adresse de la plateforme au back-office | ✅ |
| VII. Identité visuelle | Charte, badge « En préparation » existant | ✅ |
| VIII. Accessibilité | axe-core ; lien « nouvel onglet » annoncé | ✅ |
| IX. Ton éditorial | Vouvoiement, explications sur le délai de grâce et la récupération des données | ✅ |
| X. Petits incréments | 6 user stories testables séparément | ✅ |
| XI. Langue et périmètre | Français ; France métropolitaine | ✅ |

Aucune violation. ✅

## Project Structure

```text
specs/012-acces-cloud-hds/ : spec, plan, research, data-model, quickstart, contracts/connecteurs.md
src/connecteurs/pca/ (compte unique, prolonger, lireCompte, mettreAJourMedecin)
src/connecteurs/odoo/ (logicielInclus, offre d'abonnement logiciel, prise d'effet différée)
src/domaine/cloud/ (acces.ts, echeances.ts, taches.ts, abonnement.ts)
src/emails/modeles-cloud.tsx
src/domaine/location/ (suivi.ts, rappels.ts : passent par src/domaine/cloud)
src/domaine/commande/ (effets : achats et abonnements ; tunnel : logiciel sans appareil)
app/(public)/mon-compte/logiciels/ ; app/(public)/services/hebergement-donnees-sante/ ; app/demo/plateforme-cloud/
app/(back-office)/admin/logiciels-cloud/
prisma/site/schema.prisma (AccesLogiciel, TacheAcces ; SuiviLocation allégé) ; prisma/demo/schema.prisma (CompteCloud, logicielInclus)
src/file-attente/travailleurs.ts (tâche horaire acces-cloud)
tests/unit/cloud/, tests/contract/pca/, tests/e2e/f12/
```

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-19.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Délais** (réglables au back-office) | Délai de grâce 30 jours (confirmé) ; rappel 30 jours avant la fin d'une période incluse, avec la proposition d'abonnement ; rappel 7 jours avant toute fin de droits | Avant l'implémentation |
| D2 | **Période incluse à l'achat** | Ouverte dès le paiement confirmé, pour la durée fixée dans Odoo par produit (12 mois par démonstration) ; achat remboursé intégralement **avant la livraison** → accès fermé sans délai de grâce ; après la livraison → délai de grâce normal | Avant l'implémentation |
| D3 | **Souscrire l'abonnement logiciel** | Par le panier et le tunnel de F04, comme une mise à disposition sans appareil (carte ou SEPA) ; pour poursuivre après la période incluse, prise d'effet à sa fin et **aucun prélèvement avant** ; proposé dans « Mes logiciels Cloud » et sur la fiche du logiciel | Avant l'implémentation |
| D4 | **Gestion par l'équipe** | Page « Logiciels Cloud » au back-office pour l'administrateur et le support (tâches à faire en tête, recherche par client, actions avec motif) ; les commerciaux n'y ont pas accès ; F13 l'intégrera à sa navigation | Avant l'implémentation |
| D5 | **Badge « En préparation »** | Il ne concerne que l'offre « Hébergement des données de santé » (formulaire d'intérêt enregistré comme une demande de devis, copiée en opportunité) ; les logiciels Cloud restent souscriptibles | Avant l'implémentation |
| D6 | **Lien vers la plateforme et aide** | Adresse réglée au back-office ; en démonstration, page simulée du site ; aide à la première connexion = texte éditable en attendant le centre d'aide de F09 | Avant l'implémentation |
| D7 | **Ce que Nelson doit fournir** | API de création de compte et de droits, invitation par la plateforme (le site ne voit jamais le mot de passe), connexion unique si possible ; sinon sous-mode manuel | Avant le branchement (F14) |

## Complexity Tracking

Aucune violation de la constitution à justifier.
