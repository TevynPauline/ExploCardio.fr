# Implementation Plan: F22 — Affichage des prix TTC

**Branch**: `022-affichage-ttc` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/022-affichage-ttc/spec.md`

## Summary

F22 inverse la hiérarchie des prix montrés au client : **TTC en caractères principaux, HT
juste en dessous** (constitution 2.3.0, principe II). Aucun montant stocké ni aucune règle de
calcul ne change : tout reste en centimes HT, le TTC est dérivé avec le taux de l'article ou
lu dans les totaux déjà calculés par le connecteur.

Approche (voir [research.md](research.md)) :

- un seul composant `Prix`, étendu pour accepter des montants déjà calculés, devient la seule
  façon d'afficher un prix au client (R1) ;
- le TTC des lignes du panier est calculé avec la même méthode d'arrondi que la TVA du
  connecteur, ligne par ligne, sans écart avec le total (R2) ;
- « Total TTC à payer » mis en avant dans le bloc des totaux (R3) ;
- un formateur texte commun pour les emails (R5) ;
- données structurées laissées à F21, déjà alignée (R6) ; back-office inchangé, avec une aide
  TTC sous les saisies de prix (R7).

## Technical Context

**Language/Version**: TypeScript strict, Node.js 24

**Primary Dependencies**: Next.js 16, React 19, Prisma 7 ; aucune nouvelle dépendance

**Storage**: aucun changement (montants en centimes HT)

**Testing**: Vitest (composant, formateur, invariant des totaux sur 20 paniers), Playwright
(parcours transverse TTC puis HT, desktop et mobile, axe), mise à jour des tests existants qui
lisent « … € HT » en premier

**Target Platform**: site web (Scalingo), navigateurs desktop et mobile

**Project Type**: application web Next.js (site et back-office)

**Performance Goals**: aucun impact (calcul d'affichage)

**Constraints**: aucun écart d'un centime entre lignes, total et montant payé ; contraste
≥ 4,5:1 ; pas de défilement horizontal de 390 à 1 920 px ; ne pas modifier les fichiers de F21
(`src/lib/referencement/*`) ni de F20 en cours

**Scale/Scope**: ≈ 30 écrans et 3 modèles d'emails ; ≈ 25 fichiers de tests à mettre à jour

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| II. Simplicité et transparence (2.3.0) | TTC en caractères principaux, HT juste en dessous, partout côté client | ✅ |
| III. Odoo source de vérité, pas de règle dupliquée | aucun prix ni total recalculé autrement : TTC de ligne avec la même méthode que la TVA du connecteur ; totaux lus | ✅ |
| V. Factures émises par Odoo | factures et devis Odoo (et fictifs) inchangés | ✅ |
| VI. Règles paramétrables | aucune règle commerciale ajoutée ; seuils et prix restent dans Odoo | ✅ |
| VII. Identité visuelle | tokens de la charte (Semibold, `text-h2`, `text-small`, `text-muted`) ; charte mise à jour (FR-020) | ✅ |
| VIII. Accessibilité | nom accessible unique par prix ; contraste ; 44 px non concerné ; zoom 200 % | ✅ |
| IX. Ton éditorial | « soit … € HT », « Total TTC à payer » | ✅ |
| X. Petits incréments | F22 livrable seul, tout vérifiable en phase 1 sauf SC-006 [Phase 3] | ✅ |

Re-vérification après conception : inchangée. Aucun écart à justifier.

## Project Structure

### Documentation (this feature)

```text
specs/022-affichage-ttc/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # constats et décisions R1–R8
├── data-model.md        # prix affiché, invariant des totaux
├── quickstart.md        # vérifications
├── contracts/
│   └── affichage-prix.md   # composant Prix, formateur texte, bloc des totaux
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/domaine/catalogue/prix.ts        # + montantsAffiches(ht, taux | ttc), prixTexte (formateur)
src/ui/catalogue/Prix.tsx            # TTC d'abord, HT dessous ; forme « ht + ttc » ; barre ; nom accessible
src/ui/catalogue/*                   # CarteProduit, OngletsFiche, SelecteurFormule, ChoixConditionnement,
                                     #   TarifService, AjoutPanier : passage par Prix
src/ui/commande/LignePanier.tsx      # TTC de ligne (R2)
src/ui/commande/Totaux.tsx           # « Total TTC à payer » ; abonnement via Prix
src/ui/en-tete/{MegaMenu,Recherche}.tsx, src/ui/financement/FormulaireFinancement.tsx,
src/ui/fidelite/PromotionsFiche.tsx  # prix montrés au client
app/(public)/commande/{livraison,recapitulatif,confirmation}/…, app/(public)/mise-a-disposition,
app/(public)/recherche, app/(public)/mon-compte/{commandes,devis,locations,factures,
  financements,logiciels,donnees}/…  # montants client
src/emails/modeles-{commandes,locations,emailing}.tsx   # prixTexte
app/(back-office)/admin/catalogue/…, admin/demonstration/…  # aide « soit … € TTC » sous les saisies
docs/brand/design-system.md          # présentation des prix (FR-020)
specs/{001,003,004,005,006,010,016,018,021}/spec.md   # notes de renvoi vers F22 (FR-019)

tests/unit/f22/                      # Prix, prixTexte, invariant des totaux (20 paniers)
tests/e2e/f22/                       # parcours transverse TTC puis HT, accessibilité, 390 px
tests/e2e/f03, f04, f05, …           # textes « … € HT » mis à jour
```

**Structure Decision**: pas de nouveau module ; la règle tient dans le domaine
(`prix.ts`) et un composant commun. Les fichiers de fidélité (bons d'achat, gains, droits
d'assistance) ne changent pas : masqués à l'ouverture, leur présentation viendra avec le lot B
de F18. Les fichiers de F20 et F21 non commités ne sont pas touchés.

## Coordination

- **F21 (fork SEO)** : `src/lib/referencement/schema.ts` déclare déjà le TTC (non commité au
  2026-11-09). F22 ajoute seulement un test de concordance après le commit de F21.
- **F20 (animation de l'accueil)** : non commité ; F22 ne touche pas l'accueil (aucun prix n'y
  est affiché depuis F20).
- **Tests e2e** : une seule suite à la fois sur le serveur local et la base partagés.

## Complexity Tracking

Aucun écart à la constitution.
