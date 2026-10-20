# Implementation Plan: F09 — Contact WhatsApp et centre d'aide

**Branch**: `009-contact-whatsapp-aide` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-contact-whatsapp-aide/spec.md`

## Summary

F09 rend le contact humain visible partout (numéro unique, horaires, « Appeler », « Écrire sur
WhatsApp » avec un message pré-rempli) et ouvre un centre d'aide en libre-service (vidéos
sous-titrées, modes d'emploi pas à pas, notices PDF, FAQ), géré au back-office.

Approche : **aucune nouvelle technologie**. Le site reste sans lien technique avec WhatsApp :
il compose des liens (page de démonstration en phase 1). Un composant de contact unique, des
horaires calculés côté serveur (calendrier français existant), un modèle `ContenuAide` dans la
base du site, des vidéos hébergées par le site (stockage de F03) et la recherche de F01
complétée. Détails : [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F12, sans ajout

**Storage** : base du site (paramètres du contact, `ContenuAide`) ; fichiers (vidéos,
sous-titres, PDF, images) dans le stockage existant — voir [data-model.md](data-model.md)

**Testing** : Vitest (horaires et prochaine ouverture, jours fériés, fermetures, message
pré-rempli, liens, publication exigeant sous-titres et transcription, compteur) ; Playwright
avec axe-core (emplacements du contact, centre d'aide, recherche, fiches, back-office, mobile)

**Target Platform** : navigateurs récents ; serveur Node.js (hébergeur en cours de choix)

**Project Type** : application web unique

**Performance Goals** : contact trouvé en moins de 10 secondes depuis toute page (SC-006) ;
réglages répercutés en moins de 5 minutes (SC-003)

**Constraints** : aucun numéro réel contacté en phase 1 (SC-007) ; message pré-rempli limité
au nom et au cabinet (SC-005) ; 100 % des vidéos sous-titrées (SC-009) ; WCAG 2.2 AA

**Scale/Scope** : quelques dizaines de contenus d'aide ; 4 pages publiques, 2 écrans du
back-office, le pied de page, les fiches, « Mon compte » et le gabarit des emails

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Aide classée par appareil et logiciel du catalogue | ✅ |
| II. Simplicité | Contact en un geste, partout ; libre-service | ✅ |
| III. Connecteurs | WhatsApp n'est pas un service connecté : de simples liens, page de démonstration en phase 1 ; aucune donnée fictive envoyée | ✅ |
| IV. Aucune donnée patient | Mention près des boutons ; message limité au nom et au cabinet ; contenus d'aide sans donnée réelle | ✅ |
| V. Sécurité et conformité | Vidéos hébergées par le site (pas de cookies tiers) ; compteur anonyme ; politique de confidentialité complétée | ✅ |
| VI. Paramètres | Numéro, horaires, fermetures au back-office | ✅ |
| VII. Identité visuelle | Composant de la charte | ✅ |
| VIII. Accessibilité | Sous-titres et transcription obligatoires ; libellés explicites ; cibles 44 px | ✅ |
| IX. Ton éditorial | Vouvoiement, phrases courtes | ✅ |
| X. Petits incréments | 5 user stories testables séparément | ✅ |
| XI. Langue et périmètre | Français ; France métropolitaine | ✅ |

Aucune violation. ✅

## Project Structure

```text
specs/009-contact-whatsapp-aide/ : spec, plan, research, data-model, quickstart, contracts/interfaces.md
src/lib/contact-whatsapp.ts (message, horaires) ; src/domaine/contact/horaires.ts
src/ui/contact/ContactWhatsApp.tsx ; src/ui/PiedDePage.tsx ; src/emails/Gabarit.tsx
src/domaine/aide/ (lecture, recherche, consultations, administration)
app/(public)/aide/ ; app/api/aide/[slug]/consultation/ ; fiches (src/ui/catalogue/Fiche.tsx) ; mon-compte
app/(back-office)/admin/contenus/(coordonnees|aide)/
prisma/site/schema.prisma (ContenuAide ; Contenu sans faq/tutoriel/notice) ; seed : contenus d'exemple
tests/unit/contact/, tests/unit/aide/, tests/e2e/f09/
```

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-20.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Horaires** | Lundi à vendredi, 9 h à 18 h ; jours fériés automatiques ; fermetures exceptionnelles saisies au back-office ; hors horaires : « Nous vous répondrons lundi à 9 h » | Avant la mise en ligne (vraies valeurs) |
| D2 | **Message pré-rempli** | « Bonjour, je suis le Dr [nom], cabinet [cabinet]. » ; sans cabinet : « Bonjour, je suis le Dr [nom]. » ; visiteur : « Bonjour, je suis le Dr …, cabinet … » | Avant l'implémentation |
| D3 | **Emplacements** | Version compacte dans le pied de page de toutes les pages ; version complète sur la page Assistance, « Mon compte », les fiches produit et les pages d'aide ; bloc dans le pied des emails | Avant l'implémentation |
| D4 | **Vidéos** | Hébergées par le site (MP4 + sous-titres WebVTT + transcription, obligatoires pour publier), pas YouTube ni Vimeo (service externe, cookies tiers) ; en démonstration, contenus d'exemple fictifs sans vraie vidéo tant que vous n'en fournissez pas | Avant l'implémentation |
| D5 | **Centre d'aide** | Adresse `/aide`, dans le menu Services et le pied de page ; thèmes : prise en main, enregistrement, analyse, matériel et consommables, logiciels Cloud, compte et commandes ; FAQ : les 5 questions les plus consultées en tête (compteur anonyme) | Avant l'implémentation |
| D6 | **Back-office** | Numéro, horaires et fermetures dans Contenus → Coordonnées et textes ; nouvelle rubrique Contenus → Centre d'aide (administrateur) ; F13 les reprendra | Avant l'implémentation |
| D7 | **Numéro non renseigné** | Aucun bouton : lien vers le formulaire de contact | Avant l'implémentation |

## Complexity Tracking

Aucune violation de la constitution à justifier.
