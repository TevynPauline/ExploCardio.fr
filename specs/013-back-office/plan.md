# Implementation Plan: F13 — Back-office du site (contenus et paramètres)

**Branch**: `013-back-office` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-back-office/spec.md`

## Summary

F13 réunit en un seul outil les écrans d'administration livrés module par module (F01 à F12),
avec une navigation commune, des **droits par rôle appliqués partout** (pages, actions,
interface), un **écran de paramètres** unique avec historique et retour à une ancienne valeur,
la **gestion de l'équipe** (invitation, rôle, désactivation), la **fermeture des sessions
inactives**, une **fiche client** complète pour le support, les **messages de contact** et le
suivi des devis, le **journal** des connecteurs et des actions, et l'**aperçu** des contenus
avant publication.

Approche : **aucune nouvelle dépendance**. L'inventaire (research R1) montre que 45 écrans
existent déjà ; 32 n'ont pas de garde de rôle propre (seul le menu filtre). Le cœur de F13 est
une **matrice des droits** unique (`src/lib/droits.ts`) appliquée par des mises en page de
section, par chaque action serveur et par l'interface, vérifiée par un test qui parcourt toutes
les pages avec chaque rôle. Détails : [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F10 (Next.js 16, Better Auth, Prisma 7, pg-boss),
sans ajout

**Storage** : base du site — `Utilisateur` (+ `desactiveLe`, `desactivePar`),
`MessageContact` (+ notes, traité par), `Contenu` (pages), `Parametre` et
`HistoriqueParametre` (existants), `JournalAction` et `JournalConnecteur` (existants) — voir
[data-model.md](data-model.md)

**Testing** : Vitest (matrice des droits, validation des paramètres, retour à une ancienne
valeur, dernier administrateur, désactivation, inactivité, verrou optimiste des contenus,
seuil d'alerte) ; Playwright avec axe-core (parcours par rôle sur **toutes** les pages et
actions, aperçu, équipe, fiche client, journal)

**Target Platform** : navigateurs récents, ordinateur d'abord, tablette ; serveur Node.js
(Scalingo)

**Project Type** : application web unique

**Performance Goals** : contenu publié visible en moins d'une minute (SC-001) ; client retrouvé
en moins de 15 secondes (SC-005) ; validation d'un compte en moins d'une minute (SC-004)

**Constraints** : support en lecture seule partout (SC-003) ; aucun écran ne modifie prix,
stock, client, commande ou facture (SC-007) ; outils de démonstration à l'administrateur seul,
absents en mode réel (SC-008) ; WCAG 2.2 AA (SC-011)

**Scale/Scope** : une équipe de 2 à 10 personnes ; ~50 écrans (dont ~12 nouveaux ou
regroupés) ; 3 rôles

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Écrans limités aux besoins de l'équipe ExploCardio.fr | ✅ |
| II. Simplicité | Tableau de bord « À traiter » ; recherche client unique | ✅ |
| III. Connecteurs | Données d'Odoo en lecture seule, par son connecteur ; aucune modification de produit, prix, stock, client, commande, facture (FR-014, SC-007) | ✅ |
| IV. Aucune donnée patient | Rappel au-dessus des zones de texte libre et d'ajout d'images (FR-035) | ✅ |
| V. Sécurité et conformité | Droits par rôle partout ; double authentification ; session fermée après 30 min d'inactivité ; journal des actions sensibles ; dernier administrateur protégé | ✅ |
| VI. Paramètres au bon endroit | Écran Paramètres limité au fonctionnement du site ; rappel que prix, remises, promotions, fidélité se règlent dans Odoo (FR-017) | ✅ |
| VII. Identité visuelle | Composants de la charte, version dense | ✅ |
| VIII. Accessibilité | axe-core sur toutes les pages, cibles 44 px | ✅ |
| IX. Ton éditorial | Libellés sobres, vouvoiement | ✅ |
| X. Petits incréments | 9 user stories testables séparément | ✅ |
| XI. Langue et périmètre | Français | ✅ |

Aucune violation. ✅

## Project Structure

```text
specs/013-back-office/ : spec, plan, research, data-model, quickstart, contracts/(droits.md, ecrans.md)
src/lib/droits.ts (matrice des droits, exigerDroit, peut) ; src/lib/roles.ts (inchangé, s'appuie dessus)
src/lib/inactivite.ts + proxy.ts (fermeture des sessions d'équipe inactives)
src/domaine/equipe/ (inviter, changer de rôle, désactiver, dernier administrateur)
src/domaine/parametres/ (catalogue des paramètres, validation, historique, remise d'une valeur)
src/domaine/clients/ (recherche et fiche client : compte, droits, locations, accès Cloud, commandes, factures)
src/domaine/contact.ts (messages : états, notes) ; src/domaine/catalogue/devis.ts (états, notes)
src/domaine/journal/ (lecture filtrée, seuil d'alerte des connecteurs)
app/(back-office)/admin/ : layout (navigation regroupée), page (À traiter),
  clients/, demandes/(financements|devis|messages), parametres/, equipe/, journal/,
  + layout.tsx de garde dans chaque section existante
app/(public)/apercu/ (aperçu des brouillons pour l'équipe, ordinateur et mobile)
tests/unit/back-office/, tests/e2e/f13/
```

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-21.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Navigation** | Menu regroupé : **À traiter** (tableau de bord) · **Clients** (comptes, validation, fiche client) · **Demandes** (financements, devis, messages de contact) · **Catalogue** · **Contenus** · **Emails** · **Logiciels Cloud** · **Commandes et locations** (lecture) · **Paramètres** · **Équipe** · **Journal** · **Démonstration** (mode démonstration). Chaque rôle ne voit que ses rubriques | Avant l'implémentation |
| D2 | **Droits par rôle** | Administrateur : tout. Commercial : clients et validation des comptes, demandes, catalogue, contenus, offre de bienvenue ; lecture des commandes et locations. Support : **lecture seule** des clients (fiche complète, droits d'assistance), commandes, locations, et ouverture / fermeture des accès Cloud (seule action permise). Tout le reste (paramètres, emails, équipe, journal, démonstration, suspension d'un compte, RGPD) : administrateur seul. Une page interdite renvoie au tableau de bord avec « réservée à un autre rôle » | Avant l'implémentation |
| D3 | **Écran Paramètres** | Un écran unique (administrateur), par thèmes : livraison (heure limite, jours non livrés, zones), contact WhatsApp et horaires, fermetures exceptionnelles, comptes (validation, spécialités), virement, rappels et accès Cloud, emails (lien vers F10), sécurité (inactivité, seuil d'alerte). **Offre de bienvenue** : rubrique à part, modifiable aussi par le commercial. Coordonnées affichées et textes restent dans **Contenus** (commercial). Pour chaque paramètre : historique (auteur, date, avant, après) et bouton « Remettre cette valeur » | Avant l'implémentation |
| D4 | **Équipe** | L'administrateur invite une personne (nom, email, rôle) : elle reçoit un email pour choisir son mot de passe, puis doit activer la double authentification à sa première connexion. Changer de rôle, désactiver (connexion refusée, sessions fermées, actions passées conservées), réactiver. Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé | Avant l'implémentation |
| D5 | **Inactivité** | Session de l'équipe fermée après **30 minutes** sans action (réglable) ; message « Votre session a été fermée après 30 minutes d'inactivité » à la reconnexion. Les clients gardent leur session actuelle (7 jours) | Avant l'implémentation |
| D6 | **Fiche client** | Une fiche unique `/admin/clients/[id]` : identité, coordonnées, statut du compte (et actions selon le rôle), droits d'assistance, locations en cours, accès Cloud, 10 dernières commandes avec suivi, factures (lien PDF) ; lecture seule pour le support ; recherche par nom, cabinet, téléphone, email, RPPS ou SIRET. Remplace la page « Assistance » de F06, qui y renvoie | Avant l'implémentation |
| D7 | **Aperçu des contenus** | Bouton « Aperçu » sur chaque contenu en préparation : la page du site s'affiche avec le brouillon, côte à côte en largeur ordinateur et mobile, visible de l'équipe seulement, jamais indexée | Avant l'implémentation |
| D8 | **Textes des pages** | Les pages de texte (Assistance, Financement, Installation et formation, Qui sommes-nous, mentions légales, CGV, CGU, confidentialité, cookies…) deviennent modifiables au back-office : le texte actuel des fichiers sert de version d'origine ; brouillon, aperçu, publication, retour à l'origine | Avant l'implémentation |
| D9 | **Modifications simultanées** | Si deux personnes modifient le même contenu ou le même paramètre, la seconde est prévenue (« modifié par X à 10 h 12 ») et sa saisie conservée, sans rien écraser | Avant l'implémentation |
| D10 | **Journal** | Rubrique Journal (administrateur) : onglet **Connecteurs** (date, connecteur, opération, objet, résultat, motif ; filtres connecteur, résultat, période) et onglet **Actions de l'équipe** (auteur, action, objet, date). Alerte email à l'équipe dès **5 erreurs successives** d'un même connecteur (réglable), une fois par heure au plus | Avant l'implémentation |
| D11 | **Messages de contact et devis** | Messages du formulaire de contact consultables (administrateur, commercial), états **nouveau → en cours → traité**, note interne ; demandes de devis : mêmes états et note interne (aujourd'hui en lecture seule) | Avant l'implémentation |

## Complexity Tracking

Aucune violation de la constitution à justifier.
