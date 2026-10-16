# Implementation Plan: F02 — Comptes professionnels, inscription et newsletter

**Branch**: `002-comptes-professionnels` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-comptes-professionnels/spec.md`

## Summary

F02 permet à un professionnel de santé de créer son compte (RPPS ou SIRET), de confirmer son
email, puis d'être validé par l'équipe avant de pouvoir commander. Il livre la connexion
sécurisée (mot de passe oublié, blocage après échecs, double authentification facultative),
l'espace « Mon compte » et ses informations, l'offre de bienvenue (un tensiomètre par numéro,
joint à la première commande), les droits RGPD (export et suppression) et les écrans
d'administration des comptes.

Approche : **réutiliser le socle de F11 et F01** sans nouvelle technologie. Better Auth gère
mots de passe, confirmation d'email, réinitialisation et double authentification ; le site
gère statuts, validations, consentements et droit au cadeau dans sa base ; la fiche client et
la commande à 0 € passent par le connecteur Odoo (base fictive en phase 1), les emails par le
connecteur emailing (boîte de démonstration). Deux opérations sont ajoutées au contrat
d'Odoo, avec leurs tests dans les deux modes.

Le détail des choix est dans [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 et F01, sans ajout (Better Auth, Prisma, pg-boss,
React Email, Next.js 16, Tailwind 4)

**Storage** : base du site (comptes, adresses, consentements, décisions, attributions du
cadeau, demandes de changement, échecs de connexion, demandes RGPD) — voir
[data-model.md](data-model.md) ; Odoo par son connecteur pour la fiche client et la commande
à 0 €

**Testing** : Vitest (domaine : statuts, formats RPPS et SIRET, droit au cadeau y compris en
simultané, blocage de commande ; contrat des deux nouvelles opérations d'Odoo), Playwright
avec axe-core (inscription, validation, connexion, mot de passe, Mon compte, RGPD), contrôles
de charte et de contrastes

**Target Platform** : navigateurs récents (ordinateur, tablette, mobile) ; serveur Node.js
chez o2switch

**Project Type** : application web unique

**Performance Goals** : formulaire d'inscription complété en moins de 4 minutes (SC-004) ;
mot de passe réinitialisé en moins de 2 minutes (SC-008) ; export en moins de 10 minutes
(SC-010, immédiat en pratique)

**Constraints** : aucun message ne révèle l'existence d'un compte (SC-012) ; un seul cadeau
par numéro même en simultané (SC-002) ; aucun compte non validé ne commande (SC-001) ;
WCAG 2.2 AA, clavier seul (SC-011) ; aucune donnée de patient ; aucun service tiers

**Scale/Scope** : quelques centaines à quelques milliers de comptes ; une dizaine d'écrans
publics et quatre écrans d'administration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Comptes réservés aux professionnels de santé de France métropolitaine | ✅ |
| II. Simplicité | Inscription en une page, adresses recopiables, offre de bienvenue claire | ✅ |
| III. Connecteurs | Fiche client, archivage et commande à 0 € par le registre ; deux opérations ajoutées au **contrat** avec tests communs aux deux modes ; comptes et validations dans la base du site (le back-office gère la validation des comptes) | ✅ |
| IV. Aucune donnée patient | Aucun champ libre médical ; export limité aux données du professionnel | ✅ |
| V. Sécurité et conformité | Better Auth (mots de passe hachés, sessions), confirmation d'email, blocage après échecs, double authentification, journal de sécurité, notifications ; RGPD : consentements historisés, export, suppression avec conservation légale des factures dans Odoo | ✅ |
| VI. Règles paramétrables | Validation automatique, offre de bienvenue (active, texte), spécialités : paramètres du back-office ; l'article offert et son stock dans Odoo | ✅ |
| VII. Identité visuelle | Composants et gabarit d'email de la charte | ✅ |
| VIII. Accessibilité | Erreurs reliées aux champs, règles de mot de passe annoncées, clavier seul, tests axe-core et cibles de 44 px | ✅ |
| IX. Ton éditorial | Vouvoiement, messages sobres et neutres | ✅ |
| X. Petits incréments | 6 user stories testables séparément, critères marqués [Phase 1] ou [Phase 3] | ✅ |
| XI. Langue et périmètre | Français ; livraison en France métropolitaine (Corse comprise, outre-mer exclu) | ✅ |

Aucune violation. **Re-vérification après conception** : les opérations « Lire l'offre de
bienvenue » et « Archiver un partenaire » respectent le principe III ; le droit au cadeau
(donnée du site) et l'article offert (donnée d'Odoo) restent chacun à leur place. ✅

## Architecture

```text
Visiteur ─ /inscription ─┐                 ┌─ Better Auth : utilisateur, mot de passe,
Client   ─ /mon-compte ──┤  Site Next.js   │  confirmation, réinitialisation, 2FA, sessions
Équipe   ─ /admin/comptes┘  src/domaine/   ├─ Base du site : compte client, adresses,
                            comptes/       │  consentements, décisions, attributions,
                                           │  demandes, échecs, demandes RGPD
                                           ├─ Registre → Odoo (démo) : partenaire,
                                           │  archivage, offre de bienvenue, commande à 0 €
                                           ├─ Registre → Emailing (démo) : emails, notifications
                                           └─ File d'attente : fiches Odoo à rejouer,
                                              purge des comptes non confirmés (30 jours)
```

## Project Structure

### Documentation (this feature)

```text
specs/002-comptes-professionnels/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── ecrans.md     # pages publiques, Mon compte, back-office
│   ├── domaine.md    # fonctions utilisées par F04 et F05
│   └── emails.md     # modèles d'emails et notifications
└── checklists/requirements.md
```

### Source Code (repository root)

Ajouts à la structure de F11 et F01 :

```text
app/(public)/
├── inscription/ (page.tsx, verifier-email/)
├── connexion/ (déplacée depuis app/connexion, avec double-authentification/)
├── mot-de-passe-oublie/, reinitialiser-mot-de-passe/
└── mon-compte/ (page.tsx, informations/, adresses/, preferences/, securite/, donnees/,
                 commandes/, factures/, locations/, bons-achat/, assistance/, logiciels/)
app/(back-office)/admin/comptes/ (page.tsx, [id]/, demandes/, reglages/)

src/domaine/comptes/
├── numeros.ts         # RPPS, SIRET (Luhn, exception La Poste)
├── adresses.ts        # France métropolitaine
├── statuts.ts         # machine à états, peutCommander
├── inscription.ts     # création, confirmation, purge
├── validation.ts      # valider, refuser, suspendre, rétablir (fiche Odoo)
├── bienvenue.ts       # droit, cadeauPourCommande, confirmerCadeauRemis, retablirCadeau
├── newsletter.ts      # abonnement du compte, rattachement de F01
├── securite.ts        # échecs, blocage, journal, notifications
├── profil.ts          # informations, adresses, email, demande de changement de numéro
└── rgpd.ts            # export, suppression
src/emails/modeles-comptes.tsx
src/connecteurs/odoo/  # + fidelite.lireOffreBienvenue, clients.archiverPartenaire
prisma/site/schema.prisma   # + DecisionCompte, AttributionCadeau, DemandeChangementNumero,
                            #   EchecConnexion, DemandeRgpd ; statut supprime ; SIRET non unique
tests/unit/comptes/ ; tests/contract/odoo/ (2 opérations) ; tests/e2e/f02/
```

**Structure Decision** : application web unique ; les pages de compte rejoignent la mise en
page publique de F01 (en-tête et pied de page) ; la page de connexion de F11 y est déplacée.

## Secrets et configuration

Aucune nouvelle variable : Better Auth utilise `AUTH_SECRET` (F11) ; les réglages de F02 sont
des paramètres du back-office.

## Tests automatisés

| Niveau | Contenu |
|---|---|
| Contrat | `fidelite.lireOffreBienvenue`, `clients.archiverPartenaire` (démonstration ; rejoués en phase 3) |
| Unitaires | RPPS, SIRET (dont La Poste), France métropolitaine, transitions de statut, `peutCommander` (SC-001), droit au cadeau et remise unique y compris 20 demandes simultanées (SC-002), consentements (SC-003), blocage après échecs, export, refus de suppression |
| Parcours | Inscription (erreurs, doublon neutre, confirmation, renvoi), validation, refus, suspension, validation automatique, connexion, blocage, mot de passe oublié, double authentification et code de secours, Mon compte (informations, adresses, email, numéro, préférences), export, suppression ; axe-core et clavier seul (SC-011) ; aucun message ne révèle un compte (SC-012) |

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-16.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Règles du mot de passe** | Recommandation de la CNIL : 12 caractères au moins, avec majuscule, minuscule, chiffre et caractère spécial | Avant l'implémentation |
| D2 | **Blocage après échecs de connexion** | 5 échecs en 15 minutes → compte bloqué 15 minutes, email au titulaire | Avant l'implémentation |
| D3 | **Liste initiale des spécialités** | Cardiologie, Médecine générale, Médecine du sport, Pneumologie, Médecine vasculaire, Autre (modifiable ensuite) | Avant l'implémentation |
| D4 | **Format de l'export des données** | Fichier JSON (format ouvert, lisible et réutilisable) | Avant l'implémentation |
| D5 | **Qui peut valider les comptes** | Administrateur et commercial ; réglages de l'offre et de la validation automatique réservés à l'administrateur | Avant l'implémentation |
| D6 | **Vérification du RPPS dans l'annuaire santé** | Manuelle par l'équipe (lien vers l'annuaire public dans la fiche) ; une vérification automatique pourra devenir un connecteur plus tard | Plus tard |
| D7 | **Formulation de l'offre de bienvenue** (lien avec l'abonnement à la newsletter) | À faire valider par votre conseil juridique (déjà noté dans la spec) | Avant la mise en ligne |

## Points d'action

- Reporter les deux opérations ajoutées dans le contrat d'Odoo de F11.
- Retirer la contrainte d'unicité du SIRET posée par F11 (structures partagées).
- Déplacer la page de connexion de F11 dans la mise en page publique ; faire pointer
  « Mon compte / Connexion » (F01) vers `/mon-compte` pour un visiteur connecté.

## Complexity Tracking

Aucune violation de la constitution à justifier.
