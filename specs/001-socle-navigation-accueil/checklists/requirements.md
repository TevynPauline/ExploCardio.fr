# Specification Quality Checklist: F01 — Socle, navigation et page d'accueil

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-12
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
- Les 3 questions ouvertes ont été tranchées le 2026-10-12 : ECG de repos dans le méga-menu
  « Holter ECG » (FR-009), mini back-office livré avec F01 (FR-037), pages de présentation
  par famille et service (FR-038).
- Les références aux tokens et aux fichiers de `docs/brand/` sont des exigences de charte
  imposées par la constitution (principe VII), pas des choix d'implémentation.
- Toutes les hypothèses initialement marquées [À CLARIFIER] ont été confirmées ou corrigées
  le 2026-10-12 (bandeau promotionnel : uniquement en période de promotion, non masquable).
- Révisée le 2026-10-14 pour la constitution v2.1.0 : données de gestion lues et écrites dans
  Odoo par son connecteur (base fictive en phase 1), paramètres en euros dans Odoo,
  critères de succès marqués [Phase 1] ou [Phase 3].
- Réduction de périmètre appliquée le 2026-10-14 : outils en ligne limités aux tutos, à
  l'espace client et au contact WhatsApp.
