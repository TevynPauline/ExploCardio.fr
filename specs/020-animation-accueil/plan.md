# Implementation Plan: F20 — Animation « Les trois temps » et nouvel ordre de l'accueil

**Branch**: `020-animation-accueil` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

## Summary

L'accueil s'ouvre par une animation dessinée (formes HTML et texte réel, sans image ni vidéo) :
les trois points du logo rebondissent, s'écartent jusqu'à un même diamètre, portent les mots
« Liberté », « Expertise », « Fidélité », puis se referment sur le logo officiel et la phrase
d'accroche, titre principal de la page. Les sections « Pourquoi préférer », « Offre digitale »
et « Service et fidélité » sont retirées ; l'ordre devient animation, six cartes, carrousel,
contact. Les textes se modifient dans « Contenus → Accueil », qui remplace l'écran des arguments.

## Technical Context

**Language/Version**: TypeScript, Node 24 · **Framework**: Next.js 16 (App Router), React 19,
Tailwind CSS 4 · **Storage**: base du site (Prisma 7, table `contenu`) · **Testing**: Vitest
(unitaires), Playwright (e2e ordinateur et téléphone, axe) · **Target**: navigateurs récents ·
**Performance**: aucun fichier téléchargé en plus ; animations sur `transform`, `opacity` et
`background-color` uniquement · **Constraints**: WCAG 2.2 AA, charte (tokens, logo SVG officiel).

## Constitution Check

| Principe | Vérification |
|---|---|
| 2. Simplicité | Accueil raccourci (4 sections), accès aux produits en un clic depuis les cartes. |
| 3. Contenus réels au back-office | Phrase et mots dans `contenu`, modifiables dans « Contenus → Accueil ». |
| 6. Paramétrable | Textes modifiables ; aucune règle commerciale en jeu. |
| 7. Identité visuelle | Couleurs et police par les tokens ; logo intégré depuis `docs/brand/assets`, jamais recomposé ; pas de texte pastel ; exception d'animation inscrite dans la charte (FR-020). |
| 8. Accessibilité | Pause, une seule lecture puis bandeau compact, mouvement réduit = bandeau fixe, texte lu une fois, focus et cibles de 44 px. |
| 10. Incréments testables | Critères [Phase 1] ; tests unitaires de la chronologie, e2e de l'ordre, de la pause, du mouvement réduit et du back-office. |

Aucune violation.

## Décisions (research)

- **D1 — Animation en CSS, pilotée par React.** Toutes les formes partagent une même chronologie
  de 13,8 s (0,4 s de fondu de l'image finale, 10,4 s de séquence, 3 s de maintien), jouée une fois
  (deux fois avant le 2026-11-09)
  (`animation-iteration-count: 2`, `fill-mode: forwards`) avec un départ décalé de −0,4 s : la
  première boucle commence directement par l'arrivée des points, la seconde par un fondu de
  l'image finale, et l'animation s'arrête sur l'image finale. La pause utilise
  `animation-play-state` ; après la fin, « Revoir » remonte les formes et rejoue la séquence. Le passage de l'onglet en
  arrière-plan met en pause. *Écartés* : bibliothèque d'animation (dépendance de plus pour une
  seule séquence), vidéo ou Lottie (poids, texte figé, accessibilité).
- **D2 — Chronologie décrite en TypeScript.** `src/ui/accueil/trois-temps/chronologie.ts` décrit
  les étapes en secondes et produit les `@keyframes` (rendus dans une balise `<style>` par le
  composant). Les durées, l'égalité des diamètres et les positions du logo se testent en
  unitaires.
- **D3 — Géométrie calée sur le logo.** Les positions et diamètres des points en fin de séquence
  sont calculés depuis le SVG officiel (cercles `cx`, `cy`, `r`, `viewBox`) à la largeur
  d'affichage du logo (160 px sur ordinateur, 128 px sur téléphone). Le logo apparaît en fondu
  enchaîné sur des points superposés aux siens : le passage ne se voit pas.
- **D4 — Disques pâles pendant les mots.** En s'ouvrant, chaque point devient un disque de même
  diamètre dont la couleur est mélangée à l'ivoire (`color-mix`, 40 %) : les mots en encre y
  gardent un contraste supérieur à 4,5:1 quelle que soit la couleur du point.
- **D5 — Mouvement réduit et sans script.** La règle globale existante (durées ramenées à
  0,01 ms) mène directement à l'image finale ; une règle propre à l'animation masque les formes
  et affiche la ligne fixe des trois mots. Sans script, l'animation CSS se joue et s'arrête seule ;
  tous les textes sont dans la page dès le rendu serveur.
- **D6 — Lecteurs d'écran.** La phrase d'accroche est le `<h1>` ; les trois mots sont lus une fois
  dans un texte réservé aux lecteurs d'écran ; les formes et les mots animés sont `aria-hidden`.
- **D7 — Contenus.** On réutilise le type de contenu `argument` avec de nouvelles clés
  (`accroche`, `mot-1`, `mot-2`, `mot-3`) : pas de migration de schéma. Les anciennes clés
  (`intro`, `1` à `4`) sont supprimées au remplissage des contenus de départ (appelé au déploiement) puisqu'elles ne sont plus
  affichées ni modifiables.
- **D9 — Bandeau compact après l'animation (FR-021, demande de Pauline du 2026-11-09).** Pour ne
  pas occuper l'accueil inutilement, la fin de la lecture (horloge invisible) fait s'effacer
  l'image finale (0,25 s), puis la scène passe en bandeau : mêmes éléments, mise en page par
  CSS (`data-compact`), hauteur réduite par une animation de hauteur du navigateur (0,5 s)
  mesurée avant et après. Si le visiteur a déjà défilé, pas d'animation : le défilement est
  corrigé de l'écart pour que les cartes restent en place. Le mouvement réduit affiche le
  bandeau par CSS, sans script. *Écartés* : disparition complète (perte du titre de la page,
  saut de contenu, plus de « Revoir ») ; réduction dès le premier défilement (plus complexe,
  gardée pour plus tard si besoin).
- **D10 — Six arguments commerciaux (FR-022, décision du 2026-11-09).** L'animation ne change
  pas ; l'image finale s'enrichit d'une liste d'arguments (clés `argument-2` à `argument-6` du
  type `argument`, 40 caractères au plus, chacun rattaché à un mot dans
  `src/domaine/textes-animation.ts`, module sans accès à la base partagé avec le composant
  client ; `argument-1` retiré le même jour et supprimé au déploiement), en ligne centrée qui
  passe à la ligne si besoin, apparus en cascade (0,1 s d'écart), puis du bouton d'action
  « Voir l'offre » (couleur d'action de la charte). Pour faire de la place : scène de 640 px sur
  téléphone et de 460 à 540 px sur ordinateur, phrase sur une ligne dès 1 280 px, bouton
  « Pause » en haut à droite. La flèche rebondissante du lien est supprimée (le bouton suffit).
- **D11 — Catalogue visible dès l'arrivée (FR-010, FR-023, décision du 2026-11-09).** Une seule
  lecture (`BOUCLES = 1`). Scène réduite : disques de 160 px (128 px sur téléphone), logo final de
  128 px (112 px), mots en 1,625 rem (1,375 rem) ; hauteur 360 px dès 1 200 px (phrase sur une
  ligne), 430 px sur tablette, 470 px sur téléphone ; arguments en ligne centrée. Section des cartes : surtitre facultatif dans `Section` ; sans
  lui, les trois points du logo (tokens `euca`, `sage`, `blue`) précèdent le titre, et l'espace
  au-dessus est réduit.
- **D12 — Liberté, Expertise, Fidélité et titres sous les bulles (FR-022, FR-023, décisions du
  2026-11-09).** Arguments rangés sous leur mot (clés `argument-a` à `argument-e`, qui
  remplacent `argument-1` à `argument-6` des versions intermédiaires, supprimées au
  déploiement ; 30 caractères au plus pour tenir sous un disque). Pendant les mots, chaque titre
  apparaît sous son disque (ordinateur : centré, disques remontés de 50 px) ou à sa droite
  (téléphone : disques décalés de 80 px vers la gauche) ; positions calculées par format dans
  `feuilleDeStyle()`. La phase des mots dure 1,4 s de plus (séquence de 10,4 s). Image finale :
  titres seuls, en ligne. Pour un ordinateur portable de 13 pouces : disques de 140 px, logo
  final de 112 px, scène de 300 px dès 1 200 px et de 350 px sur tablette.
- **D8 — Champs devenus inutiles.** « Engagements de réactivité » et « Badge Logiciel Cloud »
  (Contenus → Coordonnées et textes) ne servaient qu'aux sections retirées : ils sont retirés de
  l'écran ; les paramètres restent en base, sans effet.

## Data model

Table `contenu` (existante), `type = "argument"` :

| clé | champ | règle |
|---|---|---|
| `accroche` | `titre` | 1 à 80 caractères ; défaut « Une offre pensée pour la cardiologie libérale » (l'ancienne phrase de départ est remplacée au déploiement si elle n'a pas été modifiée) |
| `mot-1`, `mot-2`, `mot-3` | `titre` | 1 à 16 caractères ; défauts « Liberté », « Expertise », « Fidélité » (d'abord « Spécialiste », « Rapide », « Complet », remplacés au déploiement s'ils n'ont pas été modifiés) |
| `argument-a` à `argument-e` | `titre` | 1 à 30 caractères ; défauts et mot de rattachement : voir FR-022 et `src/domaine/textes-animation.ts` |

Création si absent (`upsert` sans mise à jour) ; journalisation `contenus.animation.modifiee`.

## Project Structure

```text
app/(public)/page.tsx                         # nouvel ordre, sans h1 masqué
app/(back-office)/admin/contenus/accueil/     # écran « Animation de l'accueil »
app/(back-office)/admin/contenus/actions.ts   # enregistrerAnimation (remplace enregistrerArguments)
app/(back-office)/admin/contenus/page.tsx     # libellé du menu
src/domaine/vignettes.ts                      # lireAnimation (remplace lireArguments)
src/ui/accueil/trois-temps/                   # TroisTemps.tsx (composant client, rendu au serveur), chronologie.ts
src/ui/accueil/{Pourquoi,OffreDigitale,ServiceFidelite}.tsx   # supprimés
prisma/site/seed/contenus-initiaux.ts         # textes de départ, suppression des anciens arguments
docs/brand/design-system.md                   # exception d'animation, structure de l'accueil
tests/unit/f20/  tests/e2e/f20/               # nouveaux tests ; tests F01/F16 de l'accueil mis à jour
```
