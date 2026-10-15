# Implementation Plan: F01 — Socle, navigation et page d'accueil

**Branch**: `001-socle-navigation-accueil` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-socle-navigation-accueil/spec.md`

## Summary

F01 construit le cadre visible de toutes les pages publiques — bandeau promotionnel, barre de
navigation fixe avec sept méga-menus, recherche instantanée, pied de page, bandeau cookies —
ainsi que la page d'accueil en 8 sections, la page Qui sommes-nous / Contact, une page de
présentation par famille et par service, et un mini back-office des contenus de l'accueil et
de l'en-tête.

Approche : **réutiliser intégralement le socle de F11** (Next.js 16, TypeScript strict,
Tailwind 4 sur les tokens `--ec-*`, Prisma et base du site, Better Auth avec double
authentification, registre des connecteurs, garde réseau, tests de contrat, Playwright avec
axe-core, contrôles de charte, Lighthouse). Les produits, catégories et prix sont lus par le
connecteur Odoo (base fictive en phase 1) ; les contenus éditoriaux sont stockés dans la base
du site et réels dès la phase 1. Aucun service externe n'est ajouté : recherche, consentement
aux cookies et protection anti-robots sont réalisés par le site lui-même.

Le détail des choix est dans [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé (F11)

**Primary Dependencies** : celles de F11, sans ajout. Bibliothèque supplémentaire seulement
pour la lecture des textes Markdown des pages (`marked` ou équivalent, côté serveur) et le
nettoyage des SVG téléversés (`DOMPurify` côté serveur) — à confirmer lors des tâches.

**Storage** : base du site PostgreSQL (F11), complétée par F01 ([data-model.md](data-model.md)) ;
fichiers téléversés (images d'actualités, logos de marques) dans un dossier de stockage du
serveur (`STORAGE_DIR`) ; aucune donnée ajoutée à la base de démonstration.

**Testing** : Vitest (unitaires, contrat de la nouvelle opération du catalogue), Playwright
avec axe-core (parcours de F01, liens, largeurs de 320 à 1 920 px, clavier seul), contrôle de
charte et de contrastes, Lighthouse (accueil, vue catalogue, une page de famille).

**Target Platform** : navigateurs récents sur ordinateur, tablette et mobile ; serveur Node.js
chez o2switch (D1 de F11, vérifications en cours).

**Project Type** : application web unique (site public, espace client, back-office).

**Performance Goals** : élément principal affiché en moins de 2 s en profil mobile 4G sur
l'accueil et les pages de famille ; suggestions de recherche en moins d'une seconde (SC-008).

**Constraints** : aucune requête vers un service tiers (polices, cookies, captcha, recherche) ;
aucun traceur non essentiel avant consentement ; WCAG 2.2 AA ; aucune valeur de couleur ou de
police hors des tokens ; textes en français au vouvoiement.

**Scale/Scope** : une quarantaine de modèles et une centaine de références dans le catalogue ;
une vingtaine de pages publiques ; six écrans de mini back-office.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Navigation limitée aux familles du périmètre ; ECG de repos sous Holter ECG (FR-009) | ✅ |
| II. Simplicité et transparence | Produit à 3 clics (accueil → famille → fiche F03) ; prix HT dans les pages de famille et la recherche | ✅ (SC-002 complet avec F03) |
| III. Trois phases et connecteurs | Catalogue lu par le registre ; nouvelle opération ajoutée au **contrat** d'Odoo avec son test dans les deux modes ; contenus éditoriaux seuls dans la base du site ; index de recherche = cache en mémoire, pas une copie durable | ✅ |
| IV. Aucune donnée patient | Avertissement sur le formulaire de contact ; aucun champ médical | ✅ |
| V. Sécurité et conformité | Consentement aux cookies conforme CNIL, sans tiers ; double consentement newsletter ; anti-robots sans traceur ; mini back-office réservé aux administrateurs avec double authentification, actions journalisées ; site de démonstration protégé (F11) | ✅ |
| VI. Règles paramétrables | Textes, badges, motifs, coordonnées, liens : paramètres ou contenus du back-office ; aucune règle commerciale (promotions et prix restent dans Odoo) | ✅ |
| VII. Identité visuelle | Tokens uniquement ; logos de `docs/brand/assets` (horizontal dans l'en-tête, empilé dans le héros, blanc sur fond sombre) ; motif des trois points ; aucun visuel interdit ; ergonomie sobre inspirée d'apple.com/fr | ✅ |
| VIII. Accessibilité | Méga-menus au clavier, recherche en « combobox », bandeau en pause, focus visible, 44 px, animations réduites, zoom 200 % ; contrôlés par les tests de F11 étendus à F01 | ✅ |
| IX. Ton éditorial | Textes sobres au vouvoiement, validés par la porteuse du projet (D2) | ✅ |
| X. Petits incréments testables | 6 user stories testables séparément ; critères marqués [Phase 1] ; contrat d'Odoo étendu avec test commun aux deux modes | ✅ |
| XI. Langue et périmètre | Français uniquement | ✅ |

Aucune violation : la section « Complexity Tracking » reste vide.

**Re-vérification après la conception** : la nouvelle opération « Lister les références »
respecte le principe III (contrat commun, implémentation de démonstration et emplacement
réel, test de contrat) ; le stockage des images et les nouvelles entités ne concernent que des
contenus du site. ✅

## Architecture

```text
Navigateur
  │  pages publiques (rendu serveur) + 4 composants interactifs :
  │  barre de navigation, recherche, bandeau promotionnel, panneau cookies
  ▼
Site Next.js ─────────────────────────────────────────────────────────────────
  app/(public)/            pages de F01, mise en page commune (en-tête, pied de page)
  app/api/recherche        route de recherche → index en mémoire (R4)
  app/(back-office)/admin/contenus   mini back-office (administrateurs)
  src/domaine/             contenus, navigation, recherche, contact, newsletter
        │                              │
        │ base du site (Prisma)        │ registre des connecteurs (F11)
        ▼                              ▼
  PostgreSQL : contenus, marques,   Odoo (démo : base fictive) : catégories, articles,
  menus, paramètres, messages,      références, prix HT, disponibilité
  inscriptions, consentements       Emailing (démo : boîte de démonstration) :
                                    notifications d'équipe, confirmation newsletter
```

Mise en cache : contenus du site (étiquette `contenus`, invalidée à chaque enregistrement) ;
catalogue (étiquettes `catalogue`, `prix`, `stock` de F11) ; index de recherche reconstruit au
plus toutes les 5 minutes et après chaque modification de l'écran de démonstration.

## Project Structure

### Documentation (this feature)

```text
specs/001-socle-navigation-accueil/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # décisions techniques R1 à R12
├── data-model.md        # entités de la base du site, opération ajoutée au contrat d'Odoo
├── quickstart.md        # guide de validation
├── contracts/
│   ├── pages-et-liens.md        # pages livrées, destinations, contrôle des liens
│   ├── recherche.md             # route et composant de recherche
│   └── back-office-contenus.md  # écrans du mini back-office
└── checklists/requirements.md
```

### Source Code (repository root)

Ajouts à la structure de F11 :

```text
app/
├── (public)/
│   ├── layout.tsx                    # bandeau promo, en-tête, pied de page, panneau cookies
│   ├── page.tsx                      # accueil (remplace la page provisoire de F11)
│   ├── catalogue/page.tsx
│   ├── holter-ecg/page.tsx, holter-ecg/ecg-de-repos/page.tsx
│   ├── holter-tensionnel/, epreuve-effort/, accessoires-consommables/
│   ├── services/ (page.tsx, hebergement-donnees-sante/, assistance/)
│   ├── financement/, mise-a-disposition/, qui-sommes-nous/, panier/, recherche/
│   ├── newsletter/ (confirmation/, desinscription/)
│   ├── [legale]/page.tsx             # mentions légales, CGV, CGU, confidentialité, cookies
│   ├── not-found.tsx, error.tsx
├── api/recherche/route.ts
├── stockage/[...chemin]/route.ts     # images téléversées
└── (back-office)/admin/contenus/     # bandeau, tuiles, actualites, coordonnees, menus, marques

src/
├── domaine/
│   ├── contenus.ts                   # lecture des contenus publiés (cache « contenus »)
│   ├── navigation.ts                 # méga-menus : catégories (Odoo) + choix de l'administrateur
│   ├── recherche/ (normaliser.ts, index.ts, classer.ts)
│   ├── contact.ts, newsletter.ts, limites.ts
│   └── consentement.ts               # lecture/écriture du cookie de choix
├── ui/
│   ├── en-tete/ (BarreNavigation.tsx, MegaMenu.tsx, MenuMobile.tsx, Recherche.tsx)
│   ├── BandeauPromo.tsx, PiedDePage.tsx, PanneauCookies.tsx, SiConsentement.tsx
│   ├── accueil/ (Heros.tsx, AccesRapide.tsx, Tuile.tsx, Equipements.tsx, Marques.tsx,
│   │             OffreDigitale.tsx, OffreBienvenue.tsx, ServiceFidelite.tsx,
│   │             Actualites.tsx, BlocContact.tsx)
│   └── CarteArticle.tsx, PagePresentation.tsx
├── lib/stockage.ts                   # dépôt et lecture des fichiers téléversés
└── connecteurs/odoo/                 # + opération catalogue.listerReferences (interface,
                                      #   démo, emplacement réel, test de contrat)

contenus/                             # textes Markdown des familles, services, pages légales
prisma/site/schema.prisma             # + Marque, ElementMenu, InscriptionNewsletter, LimiteEnvoi,
                                      #   champs ajoutés à Contenu
prisma/site/seed/contenus-initiaux.ts # 6 tuiles, marques, motifs, paramètres initiaux
tests/
├── unit/ (recherche-normalisation, recherche-classement, limites, newsletter, liens)
├── contract/odoo/catalogue.test.ts   # + listerReferences
└── e2e/f01/ (accueil, navigation, megamenus-clavier, recherche, cookies, contact,
              newsletter, back-office-contenus, liens-et-largeurs, accessibilite)
```

**Structure Decision** : application web unique de F11, pages publiques regroupées sous
`app/(public)` pour partager l'en-tête et le pied de page ; la page `/connexion` et les pages
de démonstration de F11 gardent leur mise en page sobre.

## Secrets et configuration

Une seule variable ajoutée : `STORAGE_DIR` (dossier des fichiers téléversés, hors du code ;
`./stockage` en local, ignoré par Git). Aucune clé de service n'est nécessaire.

## Tests automatisés

| Niveau | Contenu |
|---|---|
| Contrat | `catalogue.listerReferences` dans les deux modes (démonstration en phase 1, rejoué en phase 3) |
| Unitaires | Normalisation et classement de la recherche (SC-009), règles de visibilité du bandeau (dates, ordre), validation des liens, limites d'envoi, transitions de la newsletter |
| Parcours | Accueil (ordre des 8 sections, 6 tuiles), méga-menus à la souris, au clavier et au toucher, menu mobile, recherche, cookies (aucun traceur avant choix), contact, newsletter, mini back-office (visible en moins d'une minute, accès refusé au support) |
| Transverses | Tous les liens sans erreur (SC-012) ; 320 à 1 920 px sans défilement horizontal (SC-006) ; axe-core sur chaque page ; cibles, focus et animations (test T096 de F11 étendu) ; non-sortie réseau étendue aux pages de F01 ; Lighthouse |

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-15.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Couleurs de remplacement** relevées par F11 : bordure des champs de formulaire en gris secondaire (`--ec-muted`) et texte des emplacements photo en couleur de texte principale (`--ec-ink`), car les couleurs prévues par la charte ne sont pas assez contrastées | Valider ces deux remplacements | Avant les formulaires de F01 |
| D2 | **Textes des pages** familles, services, Qui sommes-nous (présentation de Régis Andrieu, de l'équipe et de son expertise) et des tuiles | Je rédige des brouillons sobres ; vous les relisez et les corrigez | Pendant l'implémentation |
| D3 | **Mesure d'audience** : faut-il mesurer la fréquentation du site ? | Aucune pour l'instant (le bandeau cookies ne propose alors que des choix sans effet réel, prêt pour plus tard) ; à défaut, un outil exempté de consentement hébergé en France | Avant la mise en ligne |
| D4 | **Logos des marques** : disposez-vous des fichiers et de l'accord des fabricants ? | Noms des marques en texte en attendant | Quand vous les avez |
| D5 | **Textes légaux** (mentions légales, CGV, CGU, politique de confidentialité) | Pages créées avec « Texte en cours de validation » en attendant les textes de votre conseil | Avant la mise en ligne |
| D6 | **Adresse qui reçoit les messages** du formulaire de contact | À saisir dans le back-office ; en démonstration, les messages vont dans la boîte de démonstration | Avant la phase 2 |

## Points d'action

- Reporter l'opération `catalogue.listerReferences` dans le contrat d'Odoo de F11
  (`specs/011-connecteurs-base-demonstration/contracts/odoo.md`).
- Ajouter les inscriptions à la newsletter au périmètre de la réinitialisation de F11.
- Ajouter l'accueil, la vue catalogue et une page de famille à Lighthouse dans
  l'intégration continue.

## Complexity Tracking

Aucune violation de la constitution à justifier.
