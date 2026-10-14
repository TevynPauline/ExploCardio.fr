# Specification Quality Checklist: F11 — Connecteurs et base de démonstration (phase 1)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-14
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- Cette spec remplace l'ancienne F11 (connexion et synchronisation Odoo), abandonnée avant
  tout commit.
- Les 2 questions ouvertes ont été tranchées le 2026-10-14 : réinitialisation de la base et de
  l'activité de test, contenus et paramètres conservés, avec cinq comptes de démonstration
  recréés (FR-020, FR-041) ; demandes de financement et de devis gérées par le site, copiées
  en opportunités commerciales, SAV et demandes de rappel retirés (FR-021).
- Les hypothèses ont été confirmées le 2026-10-14. Police Inter hébergée par le site, sans
  Google Fonts (FR-042) ; l'@import de docs/brand/tokens.css est à remplacer au plan.
- Module technique par nature : ses « utilisateurs » sont l'équipe d'ExploCardio.fr, les
  testeurs et l'équipe technique. Les exigences restent exprimées en résultats observables.
- Odoo, Stripe et PCA sont nommés parce que la constitution les impose.
- Réduction de périmètre appliquée le 2026-10-14 : connecteur agenda supprimé (quatre
  connecteurs), garanties retirées de la base fictive, hotline remplacée par la ligne
  WhatsApp non connectée.
