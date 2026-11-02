# Implementation Plan: F18 — Ajustements du site (lot A)

**Branch**: `018-ajustements-site` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-ajustements-site/spec.md`

## Summary

F18 lot A applique six retours de Pauline sur le site de démonstration :

- **livraison en France métropolitaine continentale** : la Corse rejoint l'outre-mer et
  l'étranger (refus en ligne, contact prérempli). La règle tient dans une seule fonction déjà
  partagée par l'inscription, « Mon compte », le tunnel et le devis ; les textes qui disaient
  « Corse comprise » sont remplacés par un message unique ;
- **panier** : boutons « − » / « + » toujours visibles (composant de quantité commun au panier
  et aux fiches produit) et fenêtre de confirmation avant de retirer un article ;
- **en-tête** : barre de recherche visible à partir de 1 024 px, libellés « Panier » et
  « Mon compte », plus de « Connexion ».

Approche : **aucune nouvelle dépendance, aucune migration**. Les fenêtres modales réutilisent
l'élément natif déjà employé par le menu mobile (F16). Le lot B (cagnotte, parrainage) fera
l'objet d'un plan séparé. Détails : [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F17 (Next.js 16, Better Auth, Prisma 7), sans ajout

**Storage** : aucun changement de schéma. Les adresses déjà enregistrées en Corse restent en
base ; la règle s'applique à l'usage — voir [data-model.md](data-model.md)

**Testing** : Vitest (règle de livraison : 75, 20000, 20090, 20200, 97411, autre pays ;
messages ; devis vers la Corse) ; Playwright avec axe-core (adresse corse refusée dans les
quatre parcours, boutons de quantité à 320/390/768/1 024/1 280 px, fenêtre de retrait au
clavier et à la souris, barre de recherche, libellés de l'en-tête à 1 024/1 280/1 920 px et
Windows 125 %/150 %) ; test de recherche de « Corse comprise » dans tout le site

**Target Platform** : navigateurs récents, mobile d'abord ; serveur Node.js (Scalingo)

**Project Type** : application web unique

**Performance Goals** : inchangés (prix d'une ligne en moins de 0,25 s après « + », F16 SC-005)

**Constraints** : charte, WCAG 2.2 AA (modale accessible, cibles de 44 px, focus visible),
320 à 1 920 px sans défilement horizontal, en-tête de F16 complet de 1 024 à 1 920 px

**Scale/Scope** : ~10 écrans touchés (en-tête, panier, fiche produit, inscription, Mon compte →
Adresses, tunnel, devis, page de connexion), 2 composants nouveaux (quantité, confirmation),
1 règle de livraison, 1 texte légal

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Ajustements au service du médecin pressé ; rien de généraliste | ✅ |
| II. Simplicité et transparence | Quantités visibles, retrait sans erreur, recherche visible, libellés explicites | ✅ |
| III. Trois phases et connecteurs | Aucune page n'appelle de service externe ; aucun connecteur touché | ✅ |
| IV. Aucune donnée patient | Aucun nouveau champ de saisie | ✅ |
| V. Sécurité et conformité | CGV mises à jour ; aucune donnée nouvelle | ✅ |
| VI. Règles paramétrables | La zone de livraison est une règle de périmètre du site (principe XI), pas une règle commerciale en euros ; elle reste dans le code comme aujourd'hui | ✅ |
| VII. Identité visuelle | Boutons, barre et fenêtre dans les composants et tokens de la charte | ✅ |
| VIII. Accessibilité | Modale native (focus retenu, Échap), boutons nommés, quantité annoncée, cibles 44 px | ✅ |
| IX. Ton | Message de refus court, vouvoiement | ✅ |
| X. Petits incréments | Six changements livrables ensemble, critères [Phase 1] | ✅ |
| XI. Langue et périmètre | Les clients restent les professionnels de France métropolitaine, Corse comprise ; seule la **livraison en ligne** se limite au continent, la Corse étant servie par l'équipe | ✅ |

Aucun écart.

## Project Structure

### Documentation (this feature)

```text
specs/018-ajustements-site/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   └── ecrans.md        (écrans touchés, comportements attendus)
└── tasks.md             (/speckit-tasks)
```

### Source Code (repository root)

```text
src/domaine/comptes/adresses.ts      codePostalLivrable (remplace codePostalMetropole), message unique
src/domaine/commande/devis-client.ts message hors métropole aligné ; refus d'un devis vers la Corse
src/domaine/commande/tunnel.ts       inchangé (appelle déjà refusLivraison)
src/ui/commande/MentionMetropole.tsx texte « France métropolitaine continentale »
src/ui/commande/LignePanier.tsx      ChampQuantite + confirmation de retrait
src/ui/catalogue/ChoixConditionnement.tsx  ChampQuantite
src/ui/ChampQuantite.tsx             nouveau : « − », champ, « + »
src/ui/FenetreConfirmation.tsx       nouveau : fenêtre modale « Retirer cet article du panier ? »
src/ui/en-tete/BarreNavigation.tsx   libellés Panier / Mon compte, lien du compte
src/ui/en-tete/Recherche.tsx         barre toujours visible dès 1 024 px
src/ui/comptes/*, src/ui/commande/FormulaireAdresses.tsx  aide des champs d'adresse
contenus/cgv.md                      partie Livraison
docs/demonstration.md                Corse refusée
tests/unit/f18, tests/e2e/f18 ; tests existants qui acceptent la Corse mis à jour
```

**Structure Decision** : application web unique existante ; chaque ajustement se place dans
le composant qui possède déjà l'écran.

## Décisions (à valider par Pauline)

| # | Sujet | Proposition |
|---|---|---|
| D1 | **Règle de livraison** | Une seule fonction décide si une adresse est livrable : France, code postal de 5 chiffres, département 01 à 95 **hors 20** (Corse). Toutes les vérifications existantes l'utilisent déjà (inscription, Mon compte, tunnel, devis) : la Corse est refusée partout d'un coup. |
| D2 | **Message unique** | « ExploCardio.fr livre en ligne en France métropolitaine continentale. Pour la Corse, l'outre-mer ou l'étranger, contactez-nous : nous vous adressons une offre. », avec le bouton « Nous contacter » de F16 (motif « Commande hors métropole », panier prérempli). L'aide sous les champs d'adresse devient « Livraison en France métropolitaine continentale (hors Corse). » |
| D3 | **Adresses et devis existants en Corse** | Rien n'est effacé ni modifié en base. Le refus intervient quand l'adresse sert : à l'étape adresses du tunnel, à une demande de devis, et à « Commander » un devis déjà émis vers la Corse (message et lien de contact). Les locations en cours ne sont pas touchées. Pas d'email aux clients concernés (il n'y en a pas en démonstration). |
| D4 | **Quantité** | Un composant commun « − / champ / + » pour le panier et les fiches produit. Les flèches natives du champ sont masquées ; chaque bouton fait 44 px. L'enregistrement suit la règle actuelle du panier (attente courte après le dernier appui, puis prix en direct). |
| D5 | **Fenêtre de confirmation** | Fenêtre modale native (comme le menu mobile) : titre « Retirer cet article du panier ? », nom de l'article, boutons « Retirer » (principal) et « Annuler ». Échap, « Annuler » ou un clic à l'extérieur ferment sans rien retirer. Après retrait, le focus va sur l'article suivant ou sur le titre du panier. |
| D6 | **Barre de recherche** | À partir de 1 024 px, le champ est affiché en permanence dans la première ligne de l'en-tête (entre le logo et « Panier »), avec la loupe à gauche et le texte d'exemple « Rechercher un produit… » ; largeur souple (environ 16 à 24 rem) pour que tout tienne à 1 024 px et en Windows 150 %. En dessous, la loupe ouvre la barre comme aujourd'hui. Suggestions et page de résultats inchangées. |
| D7 | **« Mon compte »** | Libellé unique « Mon compte ». Non connecté : le lien mène à la page de connexion avec retour vers « Mon compte » après connexion (`/connexion?retour=/mon-compte`) ; la page de connexion propose déjà « Créer un compte ». Connecté : comportement actuel. « Panier » s'affiche en toutes lettres à côté de l'icône dès 1 024 px. |
| D8 | **CGV et textes** | Partie Livraison des CGV et clause express mises à jour ; un test vérifie qu'aucun texte du site (pages, emails, `contenus/`, aide) ne contient plus « Corse comprise ». |

## Complexity Tracking

Aucun écart à la constitution à justifier.
