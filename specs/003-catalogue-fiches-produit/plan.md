# Implementation Plan: F03 — Catalogue et fiches produit à onglets

**Branch**: `003-catalogue-fiches-produit` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-catalogue-fiches-produit/spec.md`

## Summary

F03 transforme les pages de famille de F01 en pages catégorie avec cartes et filtres, et
livre les fiches produit : fiche équipement avec sélecteur de formule (acheter, mise à
disposition mensuelle, financement longue durée) et onglets d'information, fiche consommable
avec conditionnements et dégressifs, pages services, demande de devis ECG de repos, ajout au
panier, et l'écran du back-office qui rédige et publie les contenus du catalogue.

Approche : **aucune nouvelle technologie**. Les données de gestion (articles, variantes,
prix, TVA, formules, offres de mise à disposition, barème et mensualités forcées, paliers,
stocks) sont lues par le connecteur Odoo de F11 (base fictive en phase 1), mises en cache par
étiquettes ; les contenus de présentation sont dans la base du site (`ContenuProduit`),
rattachés par la référence d'Odoo. Le contrat d'Odoo gagne quelques champs, sans nouvelle
opération. Le choix de formule se fait dans le navigateur, sans requête.

Le détail des choix est dans [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11, F01 et F02, sans ajout (Next.js 16, React 19,
Tailwind 4 sur les tokens, Prisma, Better Auth, pg-boss) ; `next/image` pour les photos

**Storage** : base du site (contenus produit, sous-catégories, panier minimal, demandes de
devis, paramètres) — voir [data-model.md](data-model.md) ; Odoo par son connecteur pour tout
le reste ; photos et documents dans le stockage de fichiers de F01

**Testing** : Vitest (prix TTC, mensualités et priorité des montants forcés, paliers et
quantités, publication et contenus manquants, ajout au panier, filtres) ; tests de contrat
d'Odoo pour les champs ajoutés ; Playwright avec axe-core (catégories et filtres, sélecteur de
formule, onglets, consommables, disponibilité et panne, publication, devis, services, 3 clics,
320 à 1 920 px) ; Lighthouse sur une fiche équipement et une fiche consommable

**Target Platform** : navigateurs récents (ordinateur, tablette, mobile) ; serveur Node.js
chez o2switch

**Project Type** : application web unique

**Performance Goals** : changement de formule < 1 s (SC-002, immédiat en pratique) ; fiche
affichée en moins de 2 s en 4G mobile ; rupture visible en moins d'une minute en
démonstration (SC-013) et 5 minutes en réel (SC-003)

**Constraints** : prix HT en premier et TTC en complément (SC-001) ; jamais « prix sur
demande » (SC-005) ; aucune page n'appelle Odoo hors connecteur (SC-009) ; aucun prix ou stock
modifiable dans le back-office du site (US6-4) ; WCAG 2.2 AA, clavier et lecteur d'écran
(FR-042) ; aucune donnée de patient

**Scale/Scope** : quelques dizaines d'équipements, quelques centaines de consommables et
accessoires ; 5 pages catégorie, une centaine de fiches, 4 pages services, 4 écrans
d'administration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Cinq catégories du périmètre, marques de la brochure ; ECG de repos limité à quelques modèles et un devis | ✅ |
| II. Simplicité | 3 clics au plus jusqu'à toute fiche (testé) ; prix HT visibles sans compte ; configurations standard ; jamais « prix sur demande » | ✅ |
| III. Connecteurs | Articles, prix, stocks, formules et barèmes lus par le connecteur Odoo ; champs ajoutés au **contrat** avec tests dans les deux modes ; contenus marketing seuls dans la base du site, rattachés par la référence | ✅ |
| IV. Aucune donnée patient | Aucun champ de patient ; devis limité au besoin et aux coordonnées du professionnel | ✅ |
| V. Sécurité et conformité | Fichiers contrôlés par leur type réel et leur taille ; formulaires protégés (F01) ; journal des contenus et publications | ✅ |
| VI. Règles paramétrables | Prix, dégressifs, offres de mise à disposition, barème et mensualités forcées dans Odoo ; badge, tarifs de services et mention du financement en paramètres | ✅ |
| VII. Identité visuelle | Cartes et fiches de la charte (photo sur ivoire, marque en surtitre, prix Semibold, formules en pilules), tokens uniquement | ✅ |
| VIII. Accessibilité | Pilules et onglets au clavier, annonces `aria-live`, galerie, filtres, 44 px ; axe-core et 320 à 1 920 px | ✅ |
| IX. Ton éditorial | Vouvoiement, textes sobres, mention de financement sans promesse | ✅ |
| X. Petits incréments | 8 user stories testables séparément ; critères [Phase 1] / [Phase 3] | ✅ |
| XI. Langue et périmètre | Français ; France métropolitaine | ✅ |

Aucune violation. **Re-vérification après conception** : les ajouts au contrat d'Odoo
(conditionnement, paliers, mensualités forcées) gardent les règles de prix dans Odoo ; le
panier minimal ne stocke que la référence, la quantité et le prix constaté pour avertir d'un
changement, jamais un prix de référence. ✅

## Architecture

```text
Visiteur ─ /<catégorie> ──────┐                  ┌─ Registre → Odoo (démo) : articles,
Visiteur ─ /<catégorie>/<slug>┤  Site Next.js    │  variantes, prix, TVA, formules, barème,
Visiteur ─ /services/…        │  src/domaine/    │  mensualités forcées, paliers, stocks
Visiteur ─ /panier            ┤  catalogue/      ├─ Base du site : contenus produit,
Équipe   ─ /admin/catalogue ──┘                  │  sous-catégories, panier, devis, journal
                                                 ├─ Stockage de fichiers (F01) : photos, PDF
                                                 └─ Cache par étiquettes (catalogue, prix,
                                                    stock) invalidé par l'écran de démo
```

## Project Structure

### Documentation (this feature)

```text
specs/003-catalogue-fiches-produit/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── ecrans.md     # pages publiques, actions, back-office
│   ├── domaine.md    # fonctions utilisées par F04, F05, F06, F09, F13
│   └── odoo.md       # champs ajoutés au contrat du connecteur Odoo
└── checklists/requirements.md
```

### Source Code (repository root)

Ajouts à la structure existante :

```text
app/(public)/
├── holter-ecg/, holter-tensionnel/, epreuve-effort/, accessoires-consommables/
│   ├── page.tsx              # page catégorie (remplace la présentation de F01)
│   └── [slug]/page.tsx       # fiche équipement ou consommable
├── holter-ecg/ecg-de-repos/  # + formulaire de devis
├── services/installation-formation/
└── panier/page.tsx           # lignes en lecture seule (F04 complétera)
app/(back-office)/admin/catalogue/ (page.tsx, [reference]/, sous-categories/, services/)

src/domaine/catalogue/
├── categories.ts      # listerCategorie, filtres, tri
├── fiches.ts          # lireFiche, slugs, redirections, articles retirés
├── prix.ts            # prixTtc, mensualites, prixPourQuantite
├── panier.ts          # panierCourant, ajouterAuPanier, lignesPanier
├── publication.ts     # peutPublier, publier, retirer, enregistrerContenu
└── devis.ts           # envoyerDemandeDevis
src/ui/catalogue/      # CarteProduit, Filtres, SelecteurFormule, Onglets, Galerie,
                       # ChoixConditionnement, AjoutPanier, FormulaireDevis
src/connecteurs/odoo/  # + quantiteParLot, paliers, mensualitesForcees
prisma/site/schema.prisma   # + SousCategorie, Panier, LignePanier ; ContenuProduit complété
prisma/demo/schema.prisma   # + Variante.quantiteParLot ; règles de liste de prix
tests/unit/catalogue/ ; tests/contract/odoo/catalogue.test.ts ; tests/e2e/f03/
```

**Structure Decision** : application web unique ; les fiches sont rangées sous l'adresse de
leur catégorie ; le domaine `src/domaine/catalogue.ts` de F01 devient un dossier.

## Secrets et configuration

Aucune nouvelle variable. Les réglages de F03 sont des paramètres du back-office.

## Tests automatisés

| Niveau | Contenu |
|---|---|
| Contrat | Champs ajoutés (conditionnement, paliers, mensualités forcées) dans les deux modes |
| Unitaires | TTC, mensualités (client > général > calcul), paliers et quantité, filtres combinés et tri, publication refusée avec la liste des manques, ajout au panier (indisponible refusé, délai accepté, prix changé signalé, quantités cumulées) |
| Parcours | Catégories et filtres, sélecteur de formule et adresse partagée, configurations, onglets au clavier, consommables et ajout rapide, rupture et panne d'Odoo, publication et recherche, devis ECG de repos, pages services, 3 clics pour chaque article publié, 320 à 1 920 px, axe-core, aucune requête sortante |

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-17.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Panier avant F04** : que fait « Ajouter au panier » en attendant F04 ? | Un panier simple : l'article est enregistré (sur le compte s'il est connecté) et la page Panier le liste, sans modification ni paiement ; F04 le complète | Avant l'implémentation |
| D2 | **Contenus de départ** de la démonstration | Chaque article de la base fictive est publié avec des textes provisoires et l'emplacement photo de la charte ; vous les remplacez ensuite au back-office | Avant l'implémentation |
| D3 | **Adresse des fiches** | Lisible, sous la catégorie : `/holter-tensionnel/suntech-oscar-2` | Avant l'implémentation |
| D4 | **Documents** (notices, fiches techniques) | PDF uniquement, 10 Mo au plus | Avant l'implémentation |
| D5 | **Mensualité forcée** : la spec la prévoit pour le **financement**, par durée | Montant forcé par produit et par durée, pour tous ou pour un client ; un éventuel tarif négocié de mise à disposition sera traité avec F05 | Avant l'implémentation |
| D6 | **Mention sous la mensualité** | « Montant indicatif, sous réserve d'acceptation par notre partenaire financier. » — à faire valider par votre conseil juridique (déjà noté dans la spec) | Avant la mise en ligne |
| D7 | **Photos et documents des fabricants** | Fournis par vous, avec l'accord des fabricants ; emplacement provisoire en attendant | Avant la mise en ligne |

## Points d'action

- Reporter les champs ajoutés dans le contrat d'Odoo de F11 (`contracts/odoo.md`).
- Remplacer `cheminArticle` (ancre dans la page de famille, F01) par `cheminFiche` dans les
  menus, la recherche et l'accueil.
- Limiter l'index de recherche de F01 aux articles publiés.
- Ajouter les fiches aux contrôles transverses (aucune requête sortante, accessibilité,
  largeurs) et à Lighthouse.

## Complexity Tracking

Aucune violation de la constitution à justifier.
