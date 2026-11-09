# Implementation Plan: F23 — Accueil modulable

**Branch**: `023-accueil-modulable` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

## Summary

L'accueil devient une suite de cinq blocs (animation, gammes phares, « Pourquoi choisir »,
offre digitale, carrousel) dont l'ordre et l'affichage sont enregistrés dans un paramètre du
site et modifiables dans « Contenus → Organisation de l'accueil ». Les blocs fixes (bandeaux,
menus, contact) ne bougent pas. Les six tuiles deviennent trois gammes phares ; une section
« Pourquoi choisir ExploCardio.fr ? » à six cartes illustrées par des schémas en formes de la
charte est créée ; l'offre digitale revient, masquée ; le bandeau promotionnel gagne le lien
« Nos offres du moment » vers le carrousel. Construit par-dessus F20 (non encore fusionné).

## Technical Context

**Language/Version**: TypeScript, Node 24 · **Framework**: Next.js 16 (App Router), React 19,
Tailwind CSS 4 · **Storage**: base du site (Prisma 7 : tables `contenu` et `parametre`, sans
migration de schéma) · **Testing**: Vitest, Playwright (ordinateur et téléphone, axe) ·
**Target**: navigateurs récents · **Performance**: aucun fichier téléchargé en plus (schémas en
HTML/SVG en ligne) ; animations sur `transform` et `opacity` · **Constraints**: WCAG 2.2 AA,
charte (tokens, pas de cœur ni de tracé ECG, pastels décoratifs).

## Constitution Check

| Principe | Vérification |
|---|---|
| 1. Spécialisation | Gammes phares = les trois explorations cœur de l'offre. |
| 2. Simplicité | Gammes en un clic depuis l'accueil ; offres en un clic depuis le bandeau. |
| 3. Contenus réels au back-office | Organisation, textes des six cartes et cartes des gammes modifiables ; aucune donnée Odoo dupliquée. |
| 5. Sécurité | Écran réservé au droit `contenus/modifier` ; journal et historique du paramètre ; verrou optimiste. |
| 6. Paramétrable | Ordre et affichage des blocs en paramètre, aucun ordre codé en dur hors valeur de départ. |
| 7. Identité visuelle | Schémas en cercles, pilules et traits fins aux couleurs des tokens ; aucun picto médical ; texte en encre. |
| 8. Accessibilité | Un seul `<h1>` ; schémas `aria-hidden` ; mouvement réduit = état final ; boutons « Monter / Descendre » au clavier avec annonce ; cibles de 44 px. |
| 9. Ton | Textes du flyer, version prudente pour les points 3 et 4. |
| 10. Incréments testables | Critères [Phase 1] ; tests unitaires de l'organisation, e2e de l'ordre, du lien, du titre et du back-office. |

Aucune violation.

## Décisions (research)

- **D1 — Organisation dans un paramètre.** Paramètre `accueil.organisation` (table
  `parametre`), valeur JSON : liste ordonnée `[{ bloc, affiche }]` avec `bloc` ∈ `animation`,
  `gammes`, `pourquoi`, `offre-digitale`, `offres`. Historique gratuit (`historique_parametre`),
  verrou optimiste par `modifieLe`, journal `contenus.accueil.organisee`. Le module sans base
  `src/domaine/organisation-accueil.ts` décrit les blocs (nom affiché, ancre), l'ordre de départ
  et `normaliserOrganisation()` : JSON illisible → ordre de départ ; bloc inconnu ignoré ; bloc
  absent ajouté en fin, masqué ; doublon ignoré ; aucun bloc affiché → ordre de départ.
  *Écartés* : nouvelle table ou valeur d'énumération (migration pour cinq lignes), colonne `ordre`
  sur des contenus (les blocs ne sont pas tous des contenus).
- **D2 — Rendu de l'accueil.** `app/(public)/page.tsx` lit l'organisation (cache « contenus »)
  et rend les blocs affichés dans l'ordre via une table `bloc → composant`, puis `BlocContact`.
  Carrousel sans vignette : bloc non rendu (le composant renvoie déjà `null`).
- **D3 — Titre principal (FR-012).** `TroisTemps` reçoit `titrePrincipal` : vrai si l'animation est
  le premier bloc affiché → phrase en `<h1>` (F20) ; sinon la phrase reste visible en `<p>` de
  même style, et la page rend un `<h1 className="sr-only">` avec la phrase d'accroche avant le
  premier bloc.
- **D4 — Animation hors de la tête (FR-019).** Prop `differee` : la scène démarre avec
  `animation-play-state: paused` (mécanisme de pause existant) et un `IntersectionObserver`
  (seuil 50 %) lance la lecture à l'entrée à l'écran. Sans script : lecture immédiate (comme F20).
- **D5 — Cible de « Voir l'offre » (FR-018).** Prop `cible` calculée par la page : ancre du
  premier bloc affiché après l'animation (gammes `#acces-rapide`, pourquoi `#pourquoi-choisir`,
  offre digitale `#offre-digitale`, carrousel `#offres-du-moment`) ; aucun → `#contact`.
- **D6 — Lien du bandeau (FR-003 à FR-005).** `BandeauPromo` (serveur) calcule
  `lienOffres = carrousel affiché && au moins une vignette visible` et le passe à
  `RotationBandeau`, qui affiche après le message, hors rotation, un lien « Nos offres du moment »
  vers `/#offres-du-moment` (cible ≥ 44 px par marge intérieure, souligné). Le carrousel porte
  `id="offres-du-moment"`, `tabIndex={-1}` et `scroll-margin-top` sous l'en-tête fixe ; sur
  l'accueil, le clic défile et place le focus sur la section.
- **D7 — Gammes phares.** `AccesRapide` devient `GammesPhares` (titre « Nos gammes phares »,
  ancre `#acces-rapide` conservée pour les anciens liens) ; `lireTuiles()` limite à 3 ; grille
  1 / 3 colonnes. Au remplissage des contenus de départ (déploiement), les tuiles dont le lien
  n'est pas `/holter-ecg`, `/holter-tensionnel` ou `/epreuve-effort` sont supprimées. Écran
  « Tuiles » renommé « Gammes phares (3 cartes) ».
- **D8 — Textes des six cartes.** Type de contenu `argument` (déjà utilisé par F20), clés
  `raison-1` à `raison-6` (`titre` 1–50, `corps` 1–160) ; défauts dans le module sans base
  `src/domaine/textes-raisons.ts` (partagé par la page, le back-office et les tests) ;
  remplissage `upsert` sans mise à jour. Formulaire ajouté à « Contenus → Animation de l'accueil »,
  renommé « Textes de l'accueil » ; action `enregistrerRaisons` (validation, verrou, journal
  `contenus.raisons.modifiees`).
- **D9 — Schémas.** Six composants serveur dans `src/ui/accueil/pourquoi/schemas.tsx` : formes en
  `<div>`/SVG en ligne, couleurs par classes de tokens (`bg-euca`, `bg-sage`, `bg-blue`, `bg-pale`,
  `border-line`, texte `text-ink`), mots en vrai texte `aria-hidden` (le sens est porté par le titre
  et la phrase). Animation CSS (≤ 2 s, une fois) déclenchée par `data-visible` posé par un petit
  composant client (`IntersectionObserver`, seuil 40 %, puis déconnecté). État final par défaut :
  les animations ne s'appliquent que sous `.js-pourquoi:not([data-visible])` → sans script et en
  mouvement réduit (`@media (prefers-reduced-motion: reduce)` neutralise), rien ne bouge.
- **D10 — Offre digitale.** `OffreDigitale.tsx` rétabli depuis la version d'avant F20, avec ses
  liens WhatsApp ; champ « Badge Logiciel Cloud » rétabli dans « Coordonnées et textes ».
- **D11 — Écran « Organisation de l'accueil ».** Page serveur `/admin/contenus/organisation`
  (droit `contenus/modifier`) + composant client de liste : flèches « Monter » / « Descendre »
  (désactivées aux extrémités, focus conservé sur le bouton du bloc déplacé, annonce
  `aria-live` « Carrousel : position 1 sur 5 »), case « Affiché sur l'accueil », mention « aucune
  offre en ce moment » pour le carrousel vide ; champs cachés envoyés à l'action
  `enregistrerOrganisation` (validation par `normaliserOrganisation` stricte : cinq blocs
  connus, sans doublon, au moins un affiché, sinon refus « Gardez au moins un bloc affiché sur
  l'accueil. »). Invalidation du cache « contenus » (< 1 min, SC-003).

## Data model

Table `parametre` :

| clé | valeur | règle |
|---|---|---|
| `accueil.organisation` | JSON `[{ "bloc": "animation", "affiche": true }, …]` | 5 blocs connus, sans doublon, ≥ 1 affiché ; défaut : animation, gammes, pourquoi, offre-digitale (masqué), offres |

Table `contenu`, `type = "argument"` :

| clé | champ | règle |
|---|---|---|
| `raison-1` à `raison-6` | `titre`, `corps` | titre 1–50, phrase 1–160 caractères ; défauts : tableau FR-008 |

Table `contenu`, `type = "tuile"` : trois lignes conservées (Holter ECG, Holter tensionnel,
Épreuve d'effort) ; les autres supprimées au déploiement.

## Project Structure

```text
app/(public)/page.tsx                              # blocs dans l'ordre enregistré, <h1> de remplacement
app/(public)/layout.tsx                            # inchangé (BandeauPromo calcule le lien)
app/(back-office)/admin/contenus/organisation/     # nouvel écran (page + liste client)
app/(back-office)/admin/contenus/accueil/page.tsx  # + formulaire des six cartes
app/(back-office)/admin/contenus/{actions.ts,page.tsx,tuiles/,coordonnees/}
src/domaine/organisation-accueil.ts                # blocs, défaut, normalisation (sans base)
src/domaine/textes-raisons.ts                      # textes de départ des six cartes (sans base)
src/domaine/contenus.ts                            # lireOrganisation, lireRaisons, lireTuiles (3)
src/ui/BandeauPromo.tsx, src/ui/RotationBandeau.tsx # lien « Nos offres du moment »
src/ui/accueil/GammesPhares.tsx                    # remplace AccesRapide.tsx
src/ui/accueil/pourquoi/{Pourquoi.tsx,schemas.tsx,Apparition.tsx}
src/ui/accueil/OffreDigitale.tsx                   # rétabli
src/ui/accueil/Carrousel.tsx                       # ancre et focus
src/ui/accueil/trois-temps/TroisTemps.tsx          # titrePrincipal, differee, cible
prisma/site/seed/contenus-initiaux.ts              # raisons, tuiles réduites à 3
docs/brand/design-system.md                        # § 8
tests/unit/f23/  tests/e2e/f23/                    # + mises à jour F01, F16, F20
```
