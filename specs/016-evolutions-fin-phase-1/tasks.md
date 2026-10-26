---
description: "Liste des tâches — F16 Évolutions de fin de phase 1"
---

# Tasks: F16 — Évolutions de fin de phase 1

**Input**: documents de conception de `specs/016-evolutions-fin-phase-1/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
F01 à F13 livrés ; décisions D1 à D11 validées le 2026-10-25 (D1 finale : carrousel à la place
du grand bandeau, section et écran Actualités retirés).

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-011 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US9 (spec.md)

## Conventions communes

Celles de F11 à F13 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
WCAG 2.2 AA ; 320 à 1 920 px sans défilement horizontal pour le site public ; rappel « aucune
donnée de patient » sur les écrans du back-office à texte libre ou à image (exigence FR-035 de F13) ;
chaque action sensible journalisée ; un test qui modifie un paramètre le rétablit.

**Livraison** : lot A (phases 1 à 8), commit après accord ; puis lot B (phases 9 à 12), commit
après accord (D11).

---

## Phase 1: Setup

- [X] T001 Créer `tests/unit/f16/` et `tests/e2e/f16/` (outils communs : `tests/e2e/f16/outils.ts`, réutilisant `../session.ts`, `../bases.ts`, `../axe.ts`)

---

## Phase 2: Foundational (lot A)

- [X] T002 Migration de la base du site `scripts/nouvelle-migration.sh site f16_vignettes` : `TypeContenu` + `vignette`, `argument` ; `Contenu.libelleLien String?` (`prisma/site/schema.prisma`)
- [X] T003 [P] Composant commun `src/ui/FilAriane.tsx` (`nav` « Fil d'Ariane », liste ordonnée, `aria-current="page"`, version téléphone « ‹ Rubrique parente », cibles 44 px) et son test unitaire de rendu `tests/unit/f16/fil-ariane.test.tsx`

---

## Phase 3: User Story 1 — Se repérer et naviguer sur tous les écrans (P1) 🎯 lot A

**Goal** : menu à gauche et logo centré sur téléphone ; menu horizontal dès 1 024 px ; fil
d'Ariane partout sauf l'accueil et le paiement.

**Independent Test** : quickstart §1 et §2.

- [X] T004 [P] [US1] Écrire `tests/e2e/f16/navigation.spec.ts` : en-tête à 320 et 390 px (menu à gauche, logo centré, loupe/panier/compte à droite, cibles 44 px) ; à 1 024, 1 093 (écran de 1 366 px à 125 %), 1 280 (écran de 1 920 px à 150 %) et 1 920 px de large, les 7 entrées du menu visibles sur une ligne, méga-menu ouvrable au clavier ; fil d'Ariane sur famille, type, fiche, services, aide, Mon compte (liens corrects, `aria-current`), absent de l'accueil et des étapes de paiement ; axe-core
- [X] T005 [US1] En-tête : `src/ui/en-tete/BarreNavigation.tsx` (grille menu | logo centré | actions sous `lg`, logo réduit au symbole sous 360 px), `MenuMobile.tsx` (bouton à gauche, masqué dès `lg`), `MegaMenu.tsx` et deuxième ligne du menu dès `lg` avec espacements réduits entre 1 024 et 1 279 px
- [X] T006 [US1] Placer `FilAriane` sur les pages : familles et types (`app/(public)/holter-ecg`, `holter-tensionnel`, `epreuve-effort`, `accessoires-consommables`, `catalogue`), fiches (remplace le fil de `src/ui/catalogue/Fiche.tsx`), services et leurs sous-pages, financement, mise à disposition, qui sommes-nous, aide et articles d'aide (remplace celui de `app/(public)/aide/[slug]`), recherche, panier, Mon compte et ses rubriques, pages légales ; version courte dans le tunnel hors paiement

**Checkpoint** : navigation conforme sur téléphone, Mac et PC Windows agrandi.

---

## Phase 4: User Story 2 — Découvrir l'actualité commerciale sur l'accueil (P1) lot A

**Goal** : carrousel de vignettes à la place du grand bandeau vert.

**Independent Test** : quickstart §4 (côté site).

- [X] T007 [P] [US2] Écrire `tests/unit/f16/vignettes.test.ts` : visibilité (état publié, période, vignette `offre-bienvenue` masquée si `bienvenue.active = false`), ordre, aperçu (préparation visible seulement en aperçu)
- [X] T008 [P] [US2] Écrire `tests/e2e/f16/carrousel.spec.ts` : défilement toutes les 6 s, pause au survol, au focus et par bouton, flèches et points au clavier, annonce « n sur N », aucun défilement en `prefers-reduced-motion`, une seule vignette sans contrôles, vignette dont la page liée a disparu affichée sans bouton, aucune vignette → accueil commençant par les accès rapides avec un titre de page ; bouton d'une vignette → page liée ; axe-core
- [X] T009 [US2] Lecture `lireVignettes()` dans `src/domaine/contenus.ts` (cache « contenus », aperçu F13, période, offre de bienvenue selon `bienvenue.active`, bouton omis si la page liée n'existe plus)
- [X] T010 [US2] Composant client `src/ui/accueil/Carrousel.tsx` (une vignette à la fois, hauteur fixe ~420/480 px, translation CSS, minuteur 6 s, pause/lecture, flèches, points, région étiquetée, `prefers-reduced-motion`, première image prioritaire, fonds de la charte et motif des trois points sans image, contraste du texte garanti sur image par un voile)
- [X] T011 [US2] Données de départ `prisma/site/seed/` : vignette « Offre de bienvenue » (`cle = offre-bienvenue`) et deux vignettes d'exemple (une offre de consommables, un produit phare) ; retrait du paramètre `accueil.offre_bienvenue` du seed et du catalogue des paramètres (`src/domaine/parametres/catalogue.ts`)

---

## Phase 5: User Story 3 — Gérer les vignettes au back-office (P1) lot A

**Goal** : Contenus → Carrousel (créer, ordonner, dater, prévisualiser, publier, retirer).

**Independent Test** : quickstart §4 (côté back-office).

- [X] T012 [P] [US3] Écrire `tests/e2e/f16/carrousel-admin.spec.ts` : création en préparation → aperçu ordinateur et mobile seulement → publication visible en moins d'une minute (SC-003) → vignette datée de demain invisible → réordonner → retirer ; image sans texte de remplacement refusée ; titre > 60, phrase > 140, bouton > 30 refusés ; lien inconnu refusé ; deux onglets : le second prévenu ; commercial autorisé, support refusé ; journal
- [X] T013 [US3] Écran `app/(back-office)/admin/contenus/carrousel/page.tsx` et actions dans `app/(back-office)/admin/contenus/actions.ts` (règles F13 : `exigerDroit("contenus","modifier")`, verrou `verifierVersionContenu`, `exigerTexteRemplacement`, `exigerLien`, `etatChoisi`, journal `contenus.vignette.*`, `ApercuCadres` sur `/`, `RappelPatient`) ; carte « Carrousel » dans `app/(back-office)/admin/contenus/page.tsx`
- [X] T014 [US3] Retirer l'écran Actualités du back-office (`app/(back-office)/admin/contenus/actualites/`, actions `enregistrerActualite`/`supprimerActualite`, carte de l'index des contenus) et `lireActualites` de l'accueil ; mettre à jour les tests F01/F13 qui l'utilisaient (`tests/e2e/f01/back-office-contenus.spec.ts`, `tests/e2e/f13/contenus.spec.ts`, `tests/unit/back-office/droits.test.ts` si besoin) ; les lignes `actualite` restent en base

---

## Phase 6: User Story 4 — Pourquoi préférer ExploCardio.fr et ordre de l'accueil (P2) lot A

**Goal** : section d'arguments à la place de « L'équipement » ; nouvel ordre.

**Independent Test** : quickstart §3.

- [X] T015 [P] [US4] Écrire `tests/e2e/f16/accueil.spec.ts` : ordre carrousel → accès rapides → Pourquoi → Service et fidélité → Offre digitale → contact ; absence des sections Équipement, Actualités, Offre de bienvenue et du grand logo ; 4 arguments affichés ; modification d'un argument au back-office visible en moins d'une minute ; affichage à 320 et 1 920 px sans défilement horizontal ; axe-core
- [X] T016 [US4] Composant `src/ui/accueil/Pourquoi.tsx` (introduction, 4 arguments, 4 schémas SVG décoratifs `aria-hidden` aux tokens de la charte) et lecture `lireArguments()` dans `src/domaine/contenus.ts` ; données de départ (textes de la spec) dans `prisma/site/seed/`
- [X] T017 [US4] Écran `app/(back-office)/admin/contenus/accueil/page.tsx` (introduction et 4 arguments, verrou, journal `contenus.argument.modifie`, aperçu `/`)
- [X] T018 [US4] `app/(public)/page.tsx` : nouvel ordre ; retirer `Heros`, `Equipements`, `OffreBienvenue`, `Actualites` de l'accueil (supprimer les composants devenus inutiles de `src/ui/accueil/`) ; titre de page conservé (`h1` « ExploCardio.fr — Le spécialiste des explorations fonctionnelles cardiaques », visuellement discret) ; adapter `tests/e2e/f01/accueil.spec.ts` et les tests F01/F02/F06 qui visaient le héros, l'offre de bienvenue ou les actualités

---

## Phase 7: User Story 5 — Prix du panier en direct (P1) lot A

**Goal** : prix de ligne immédiat, totaux corrigés en moins d'une seconde.

**Independent Test** : quickstart §5.

- [X] T019 [P] [US5] Écrire `tests/unit/f16/prix-ligne.test.ts` (prix de ligne selon le barème dégressif, arrondis, TVA) et `tests/e2e/f16/panier-direct.spec.ts` : flèches, saisie au clavier, saisie rapide « 1 » puis « 12 » (seule la dernière enregistrée), prix de ligne mis à jour en moins de 250 ms sans quitter le champ (SC-005), totaux corrigés, quantité retrouvée après rechargement, quantité au-delà du permis corrigée avec message, champ vidé sans prix à zéro, échec d'enregistrement simulé → message et retour à la quantité enregistrée
- [X] T020 [US5] Barème de prix transmis à la ligne (fonction pure `prixLigne` dans `src/domaine/commande/prix-ligne.ts`, données préparées par `app/(public)/panier/page.tsx`) ; `src/ui/commande/LignePanier.tsx` : calcul immédiat, enregistrement 300 ms après la dernière frappe, totaux estimés puis corrigés (« mise à jour… »), retour arrière en cas d'échec

---

## Phase 8: User Story 9 et mention métropole — Présentation (P2) lot A

**Goal** : signature sans « (hors imagerie) », bloc contact sans le fondateur, mention
« France métropolitaine ».

**Independent Test** : quickstart §6.

- [X] T021 [P] [US9] Écrire `tests/e2e/f16/presentation.spec.ts` : aucune occurrence de « hors imagerie » dans les pages publiques parcourues, un email de la boîte de démonstration et une facture PDF de démonstration (SC-009) ; bloc contact sans « Régis Andrieu, fondateur » ; Qui sommes-nous le présente toujours ; mention métropole sur une fiche, le panier et les conditions de livraison avec lien vers le contact
- [X] T022 [US9] Retirer « (hors imagerie) » : `app/layout.tsx` (titre, description), `src/ui/PiedDePage.tsx`, `src/emails/Gabarit.tsx`, `src/connecteurs/odoo/demo/factures-pdf.ts`, `contenus/catalogue.md`, `contenus/qui-sommes-nous.md`, `docs/brand/design-system.md`, `docs/brand/README.md` ; `src/ui/accueil/BlocContact.tsx` sans « Régis Andrieu, fondateur »
- [X] T023 [US8] Composant `src/ui/commande/MentionMetropole.tsx` placé sur la fiche (`src/ui/catalogue/Fiche.tsx`), le panier et la page des conditions de livraison (CGV, section livraison)
- [X] T024 Lot A : pages modifiées ajoutées aux contrôles transverses (`tests/e2e/no-egress.spec.ts`, `tests/e2e/accessibilite-charte.spec.ts` dont `/admin/contenus/carrousel` et `/admin/contenus/accueil`) ; typecheck, lint, contraste, tests unitaires et e2e de F01, F13 et F16 ; rapport à Pauline et demande de commit du lot A

- [X] T043 [US2] Évolution du 2026-10-26 (FR-036, FR-037) : image facultative des tuiles (`app/(back-office)/admin/contenus/tuiles/page.tsx`, action `enregistrerTuile`, `src/domaine/contenus.ts`, `src/ui/accueil/AccesRapide.tsx` : en haut, fondue vers le texte) ; image des vignettes légèrement transparente sous le texte (`src/ui/accueil/Carrousel.tsx`) ; `tests/e2e/f16/images-accueil.spec.ts`

---

## Phase 9: Foundational (lot B)

- [X] T025 Migrations : base du site `f16_numero` (`enum VerificationNumero`, `CompteClient.numeroVerification`, `numeroVerifieLe`, `numeroVerifiePar`, `motifRefusNumero`) ; base de démonstration `f16_devis` (`StatutCommande` + `devis`, `CommandeVente.validiteLe`, `devisRef`) et paramètre commercial fictif `devis.validite_jours = 30`
- [X] T026 [P] Fonctions pures `src/domaine/comptes/numeros.ts` : `siretOuSirenValide` (9 ou 14 chiffres, clé de Luhn, cas de La Poste), normalisation ; `tests/unit/f16/numeros.test.ts`
- [X] T027 [P] Paramètre `comptes.numero_exige` (`premiere_commande` | `inscription`) dans `src/lib/parametres.ts` et `src/domaine/parametres/catalogue.ts` (thème Comptes, à la place de `comptes.validation_auto`) ; adapter `tests/unit/back-office/parametres.test.ts`

---

## Phase 10: User Story 7 — S'inscrire sans numéro RPPS (P1) lot B

**Goal** : inscription sans RPPS ; numéro demandé à la première commande ; vérification après
coup ; location bloquée jusqu'à la vérification.

**Independent Test** : quickstart §7 et §8.

- [X] T028 [P] [US7] Écrire `tests/unit/f16/verification-numero.test.ts` (compte « validé » dès la confirmation de l'email et fiche Odoo créée ; numéro saisi → à vérifier ; vérifié ; refusé → compte suspendu, email, journal ; nouveau numéro → à vérifier ; paramètre « à l'inscription » rend le numéro obligatoire ; `expeditionBloquee` vraie tant que le numéro n'est pas vérifié, levée à la vérification) et `tests/e2e/f16/inscription-numero.spec.ts` (inscription sans numéro en moins de 3 minutes, SC-007 ; première commande : numéro demandé avant paiement, une seule fois ; À traiter → Numéro vérifié ; location bloquée puis débloquée ; numéro refusé → compte suspendu)
- [X] T029 [US7] Inscription : `src/domaine/comptes/inscription.ts` et `src/ui/comptes/FormulaireInscription.tsx` (plus de RPPS ni de choix médecin/structure, « Nom du cabinet ou de la structure », numéro facultatif ou obligatoire selon le paramètre) ; passage direct à « validé » à la confirmation de l'email ; `src/domaine/comptes/statuts.ts` et messages ; plus d'email « compte validé » ni « demande de compte » (FR-035), modèles retirés du catalogue F10 (`src/domaine/emailing/catalogue.ts`, `src/emails/modeles-comptes.tsx`, exemples)
- [X] T030 [US7] Vérification : `src/domaine/comptes/verification-numero.ts` (vérifier, refuser avec motif, journal, suspension automatique au refus, email F10 « Votre numéro d'entreprise » via modèle modifiable, FR-035) ; `src/domaine/commande/effets.ts` (blocage d'expédition des locations selon le numéro) et levée des blocages à la vérification ; Mon compte → informations : saisie et modification du numéro
- [X] T031 [US7] Tunnel : étape « Numéro d'entreprise » avant le paiement si absent (`src/domaine/commande/tunnel.ts`, page du tunnel) ; message de la location « expédiée après vérification de votre numéro » et date de livraison annoncée en conséquence (F05)
- [X] T032 [US7] Back-office : « Numéros à vérifier » dans `app/(back-office)/admin/page.tsx` ; fiche client (`app/(back-office)/admin/clients/[id]/page.tsx`, `app/(back-office)/admin/comptes/actions.ts`) : « Numéro vérifié » / « Numéro refusé » (motif) à la place de Valider / Refuser, ouverts à l'administrateur et au commercial (droit `comptes.valider`), le refus suspendant le compte même pour le commercial ; rétablissement réservé à l'administrateur (`src/lib/droits.ts`, test de la matrice) ; liste des clients filtrable par état du numéro ; textes parlant du RPPS mis à jour (aide, conditions, emails, `docs/demonstration.md`) ; adapter les tests F02, F05, F13 touchés

---

## Phase 11: User Story 6 — Recevoir un devis depuis le panier (P1) lot B

**Goal** : devis Odoo, PDF immédiat, email, Mon compte → Devis, commande aux prix du devis.

**Independent Test** : quickstart §9.

- [X] T033 [P] [US6] Écrire `tests/contract/odoo/devis.test.ts` (contrat commun aux deux modes, [contracts/connecteur-odoo-devis.md](contracts/connecteur-odoo-devis.md) : création idempotente, calcul identique à `calculerDevis`, validité, liste, PDF d'un autre partenaire refusé, confirmation aux prix du devis, devis expiré ou déjà commandé refusé, mode réel `ConfigurationIncomplete`)
- [X] T034 [P] [US6] Écrire `tests/e2e/f16/devis.spec.ts` : panier → « Recevoir un devis » → PDF « DEVIS — FICTIF » en moins de 10 s (SC-006), email dans la boîte de démonstration, notification de l'équipe, panier inchangé ; visiteur non connecté → connexion puis retour au panier ; Mon compte → Devis (état, PDF) → Commander aux prix du devis ; devis expiré → panier aux prix du jour avec message ; Odoo en panne → message, panier conservé ; compte sans adresse en métropole → devis refusé avec « Nous contacter » ; axe-core
- [X] T035 [US6] Connecteur : interfaces `src/connecteurs/odoo/interfaces/commandes.ts` (`creerDevis`, `listerDevis`, `lireDevisPdf`, `lireDevis` ; confirmation par `creerCommande*` avec `devisRef`, cf. contrat) ; démonstration `src/connecteurs/odoo/demo/devis.ts` et `commandes.ts` (statut `devis`, validité lue dans les paramètres commerciaux fictifs, PDF à partir du générateur de `factures-pdf.ts` titré « DEVIS », mention FICTIF) ; mode réel : refus explicite (F14)
- [X] T036 [US6] Domaine `src/domaine/commande/devis-client.ts` (demander depuis le panier avec l'adresse par défaut du compte et le mode standard, refus hors métropole avec « Nous contacter », lister, PDF, commander : tunnel « depuis le devis » qui confirme le devis au lieu de créer une commande ; expiré → panier recomposé) ; route de téléchargement du PDF (partenaire vérifié) ; modèle d'email « devis_envoye » (`src/emails/`, catalogue F10, exemple) ; notification d'équipe (`notifierEquipe`)
- [X] T037 [US6] Écrans : bouton « Recevoir un devis » dans `app/(public)/panier/page.tsx` ; `app/(public)/mon-compte/devis/page.tsx` (liste, PDF, Commander) et entrée « Devis » dans les rubriques du tableau de bord `app/(public)/mon-compte/page.tsx` (à côté de Commandes et Factures) ; ajout aux contrôles transverses

---

## Phase 12: User Story 8 — Commander depuis l'outre-mer ou l'étranger (P2) lot B

**Goal** : adresse hors métropole refusée, contact prérempli.

**Independent Test** : quickstart §10.

- [X] T038 [P] [US8] Écrire `tests/unit/f16/metropole.test.ts` (97/98, autre pays refusés ; Corse 20 acceptée ; facturation hors métropole acceptée) et `tests/e2e/f16/hors-metropole.spec.ts` (inscription, Mon compte et tunnel avec 97400 puis « Autre pays » : refus, bouton « Nous contacter » → formulaire avec motif « Commande hors métropole » et contenu du panier préremplis, aucune donnée de patient, rien dans l'adresse de la page)
- [X] T039 [US8] Champ `pays` dans les adresses (`src/domaine/comptes/adresses.ts`, `src/ui/comptes/ChampsAdresse.tsx`, tunnel) ; refus avec bouton « Nous contacter » ; motif « Commande hors métropole » ajouté à `contact.motifs` ; préremplissage du formulaire de contact depuis le panier lu côté serveur (`src/ui/FormulaireContact.tsx`, `app/(public)/qui-sommes-nous`)

---

## Phase 13: Polish & Cross-Cutting Concerns

- [X] T040 [P] Documentation : `docs/demonstration.md` (carrousel, Pourquoi, devis, numéro d'entreprise, hors métropole, plus de RPPS) et `tests/e2e/parcours/README.md` (ligne F16)
- [X] T041 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [X] T042 Vérification finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile, sous `caffeinate`), `npm run test:lighthouse` (accueil avec carrousel sous 2 s, SC-010) ; rapport à Pauline, demande de commit du lot B, puis intégration continue

---

## Dependencies & Execution Order

- Lot A : T001 → T002, T003 → US1 (T004–T006), US2 (T007–T011) → US3 (T012–T014) → US4
  (T015–T018) ; US5 (T019–T020) et US9 (T021–T023) indépendantes après T001 → T024 (commit).
- Lot B : T025–T027 → US7 (T028–T032) → US6 (T033–T037) ; US8 (T038–T039) indépendante après
  T025 → T040–T042 (commit).
- US3 dépend de US2 (même type de contenu) ; T018 dépend de T010 et T016 ; T031 dépend de T029 ;
  T036 dépend de T035.

## Parallel Opportunities

- Tests écrits en parallèle au début de chaque story : T004, T007/T008, T012, T015, T019, T021,
  T028, T033/T034, T038.
- Lot A : US5 (panier) et US9 (présentation) en parallèle de US1 à US4.
- Lot B : US8 en parallèle de US7 et US6.

## Implementation Strategy

1. **MVP du lot A** : US1 (navigation) et US2 (carrousel) — ce que Régis verra en premier.
2. Compléter le lot A (US3, US4, US5, US9, mention métropole), vérifier, commit après accord,
   démonstration à Régis.
3. Lot B : US7 (inscription et numéro), US6 (devis), US8 (hors métropole), vérification
   complète, commit après accord, intégration continue.
