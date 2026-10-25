# Implementation Plan: F16 — Évolutions de fin de phase 1

**Branch**: `016-evolutions-fin-phase-1` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-evolutions-fin-phase-1/spec.md`

## Summary

F16 applique les retours de Régis sur le site de démonstration. Deux lots :

- **Lot A — ergonomie et accueil** : en-tête mobile (menu à gauche, logo au centre), menu
  horizontal dès 1 024 px, fil d'Ariane commun, carrousel de vignettes géré au back-office à la
  place du grand bandeau, section « Pourquoi préférer
  ExploCardio.fr », nouvel ordre de l'accueil, prix du panier en direct, mention « hors métropole », slogan et bloc contact.
- **Lot B — commande** : devis depuis le panier (document d'Odoo, transformable en commande),
  inscription sans RPPS avec SIRET ou SIREN demandé à la première commande et vérifié après
  coup, blocage des adresses hors métropole.

Approche : **aucune nouvelle dépendance**. Les vignettes et les arguments sont de nouveaux
types de `Contenu` (F13 : états, aperçu, verrou, journal déjà en place). Le devis s'appuie sur
la notion native d'Odoo (une commande à l'état « devis » que l'on confirme) ; le connecteur
gagne quatre opérations, en démonstration d'abord. Détails : [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F13 (Next.js 16, Better Auth, Prisma 7, pg-boss),
sans ajout ; génération PDF existante des factures de démonstration (F04)

**Storage** : base du site — `Contenu` (types `vignette` et `argument`, champ `libelleLien`),
`CompteClient` (vérification du numéro), `Parametre` (moment d'exigence du numéro) ; base de
démonstration — `CommandeVente` (statut `devis`, `validiteLe`), règle de validité des devis —
voir [data-model.md](data-model.md)

**Testing** : Vitest (validité SIRET/SIREN, règles d'exigence du numéro, blocage hors
métropole, devis : création, expiration, confirmation aux prix du devis, contrat du connecteur
en démonstration) ; Playwright avec axe-core (en-tête à 320/390/1 024/1 280/1 920 px, fil
d'Ariane, carrousel au clavier et en mouvement réduit, prix du panier en direct, devis de bout
en bout, inscription sans numéro, adresse en 974)

**Target Platform** : navigateurs récents, mobile d'abord ; serveur Node.js (Scalingo)

**Project Type** : application web unique

**Performance Goals** : prix d'une ligne mis à jour en moins de 0,25 s (SC-005) ; devis en
moins de 10 s (SC-006) ; affichage principal de l'accueil sous 2 s, carrousel compris (SC-010)

**Constraints** : prix HT, aucune donnée patient, charte, WCAG 2.2 AA (pause et mouvement
réduit du carrousel), 320 à 1 920 px sans défilement horizontal ; aucune règle commerciale
dans le site (la validité des devis est lue dans Odoo)

**Scale/Scope** : ~15 écrans touchés (en-tête, accueil, panier, tunnel, Mon compte, inscription,
back-office Contenus et Clients), 2 types de contenus, 4 opérations de connecteur, 1 modèle
d'email

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Arguments et carrousel au service du médecin pressé ; aucun ajout généraliste | ✅ |
| II. Simplicité et transparence | Menu visible sur PC Windows ; fil d'Ariane ; prix en direct ; devis avant de payer | ✅ |
| III. Trois phases et connecteurs | Devis créé par le connecteur Odoo (démonstration en phase 1, F14 pour le réel) ; aucune page n'appelle Odoo directement | ✅ |
| IV. Aucune donnée patient | Contact hors métropole prérempli avec le panier seulement ; rappel F13 sur les écrans de vignettes | ✅ |
| V. Sécurité et conformité | Devis FICTIF en phase 1 ; vérification du numéro journalisée ; aperçu réservé à l'équipe | ✅ |
| VI. Règles paramétrables | Validité des devis dans Odoo ; moment d'exigence du numéro au back-office | ✅ |
| VII. Identité visuelle | Schémas dans le langage des trois points ; carrousel sans recomposition du logo | ✅ |
| VIII. Accessibilité | Carrousel avec pause, clavier, mouvement réduit ; fil d'Ariane annoncé ; cibles 44 px | ✅ |
| IX. Ton | Textes de départ courts, vouvoiement, à valider par Régis | ✅ |
| X. Petits incréments | Lots A et B livrables séparément, critères [Phase 1] | ✅ |
| XI. Langue et périmètre | Commande en ligne limitée à la métropole, contact pour le reste | ✅ |

Aucun écart. La constitution n'est pas modifiée : « hors imagerie » y décrit le périmètre du
métier, pas la signature affichée.

## Project Structure

### Documentation (this feature)

```text
specs/016-evolutions-fin-phase-1/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── connecteur-odoo-devis.md   (opérations de devis du connecteur)
│   └── ecrans.md                  (écrans touchés, comportements attendus)
└── tasks.md                       (/speckit-tasks)
```

### Source Code (repository root)

```text
src/ui/en-tete/            BarreNavigation, MenuMobile, MegaMenu (dispositions et seuils)
src/ui/FilAriane.tsx       fil d'Ariane commun (remplace ceux de Fiche et de l'aide)
src/ui/accueil/            Carrousel (nouveau), Pourquoi (nouveau) ; Heros, Equipements,
                           OffreBienvenue, Actualites retirés de l'accueil
src/ui/commande/           LignePanier (prix en direct), BoutonDevis, MentionMetropole
src/domaine/contenus.ts    lireVignettes, lireArguments (cache « contenus », aperçu F13)
src/domaine/commande/      devis-client.ts (demander, lister, commander un devis)
src/domaine/comptes/       numeros.ts (SIRET/SIREN), inscription, verification-numero.ts
src/connecteurs/odoo/      interfaces + demo : creerDevis, listerDevis, lireDevisPdf,
                           confirmerDevis ; real : refus explicite (F14)
src/emails/                modèle « devis_envoye » (textes modifiables, F10)
app/(public)/              accueil, panier, mon-compte/devis, inscription, tunnel
app/(back-office)/admin/   contenus/carrousel, contenus/accueil (arguments), clients (numéro)
prisma/site, prisma/demo   migrations (types de contenu, vérification, statut devis)
tests/unit/f16, tests/e2e/f16
```

**Structure Decision** : application web unique existante ; chaque évolution se place dans le
module qui possède déjà l'écran (F01 accueil, F02 inscription, F04 panier, F13 back-office).

## Décisions (validées par Pauline le 2026-10-25)

| # | Sujet | Proposition |
|---|---|---|
| D1 | **Vignettes du carrousel** (modifiée et validée le 2026-10-25) | Le carrousel remplace **seulement** le grand bandeau vert (logo, signature). Nouveau type de contenu « vignette » dans un nouvel écran **Contenus → Carrousel** : offres, informations temporaires, produits phares, consommables du moment, à définir par l'équipe au back-office. La section **Actualités** est retirée de l'accueil et son écran du back-office aussi (décision finale du 2026-10-25) ; les actualités déjà saisies restent en base, non affichées. Au départ : la vignette « Offre de bienvenue » (masquée automatiquement si l'offre est désactivée ; le paramètre texte « offre de bienvenue » disparaît) et deux vignettes d'exemple. |
| D2 | **Comportement du carrousel** | Une vignette visible à la fois, pleine largeur, hauteur fixe (environ 420 px sur ordinateur, 480 px sur téléphone) ; image recommandée 1 600 × 640 px ; défilement toutes les 6 s, pause au survol, au focus et par bouton ; flèches et points ; aucun défilement automatique si le visiteur réduit les animations ; la première image est chargée en priorité, les autres ensuite. |
| D3 | **« Pourquoi préférer ExploCardio.fr »** | Introduction et quatre arguments modifiables dans **Contenus → Accueil** ; les quatre schémas sont des dessins fixes de la charte (trois points, pastels), non modifiables au back-office. |
| D4 | **En-tête** | Téléphone et tablette : menu à gauche, logo au centre, loupe, panier et compte à droite. Le menu horizontal (deuxième ligne) apparaît dès 1 024 px au lieu de 1 280 px, avec des espacements réduits entre 1 024 et 1 279 px. |
| D5 | **Fil d'Ariane** | Un seul composant, alimenté par chaque page avec son chemin dans le site (pas l'historique du navigateur). Sur téléphone : « ‹ Rubrique parente ». Absent de l'accueil et des étapes de paiement. |
| D6 | **Prix du panier en direct** | Le prix de la ligne est recalculé tout de suite dans la page (prix dégressifs compris) ; les totaux (promotions, bons, frais de port, calculés par Odoo) suivent en moins d'une seconde, avec la mention « mise à jour… » le temps du calcul. |
| D7 | **Devis** | Un devis est une commande d'Odoo à l'état « devis » (notion native). Validité lue dans Odoo (30 jours en démonstration). PDF produit par Odoo (en démonstration, le générateur des factures, mention FICTIF). « Commander » depuis Mon compte confirme ce même devis : les prix sont ceux du devis. Devis expiré : panier recomposé aux prix du jour. Email « Votre devis » (modèle modifiable, F10) et notification de l'équipe. |
| D8 | **Numéro d'entreprise** | Le compte est utilisable dès la confirmation de l'email (le statut « en attente de validation » n'est plus utilisé, et la fiche Odoo est créée à ce moment). Le RPPS disparaît des formulaires. Nouveau suivi du numéro (à vérifier, vérifié, refusé) dans **À traiter** et sur la fiche client. Paramètre « Numéro exigé » : à la première commande (défaut) ou à l'inscription ; il remplace « Validation automatique ». Mises à disposition : expédition bloquée tant que le numéro n'est pas vérifié (règle A). |
| D9 | **Hors métropole** | Les adresses gagnent un champ **Pays** (France par défaut, ou « Autre pays »). Code postal en 97/98 ou autre pays : commande refusée, bouton « Nous contacter » vers le formulaire de contact avec le motif « Commande hors métropole » et le contenu du panier prérempli (lu côté serveur, rien dans l'adresse de la page). Mention commune sur les fiches, le panier et les conditions de livraison. |
| D10 | **Signature et bloc contact** | « (hors imagerie) » retiré du site, des emails, des PDF, des textes de `contenus/` et de la charte (`docs/brand`) ; le titre de l'accueil devient « ExploCardio.fr — Le spécialiste des explorations fonctionnelles cardiaques ». Bloc contact sans le nom du fondateur. |
| D11 | **Ordre de livraison** | Lot A d'abord (montrable à Régis sans attendre), puis lot B ; un commit par lot après votre accord. |

## Complexity Tracking

Aucun écart à la constitution à justifier.
