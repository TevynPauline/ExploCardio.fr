# Tâches — F17 Page d'attente

- [X] T001 Table `InscriptionOuverture` (nom, email unique, texte du consentement, dates) dans prisma/site/schema.prisma, migration `f17_inscriptions_ouverture`
- [X] T002 Domaine src/domaine/ouverture.ts : validation, inscription (mise à jour si l'email existe, consentement enregistré), liste, CSV, suppression journalisée
- [X] T003 Hôtes de la page d'attente (variable `DOMAINES_PAGE_ATTENTE`) dans src/lib/page-attente.ts ; routage dans proxy.ts (FR-001)
- [X] T004 Page app/bientot/page.tsx et formulaire src/ui/FormulaireOuverture.tsx, action src/actions/ouverture.ts ; bandeau de démonstration déplacé de app/layout.tsx vers les mises en page du site, du back-office et de /demo (FR-002 à FR-006, FR-009)
- [X] T005 Back-office : app/(back-office)/admin/demandes/ouverture (liste, suppression, export CSV) et carte dans Demandes (FR-008)
- [X] T006 Tests unitaires tests/unit/f17/ouverture.test.ts (validation, doublon, CSV, hôtes)
- [X] T007 Test e2e tests/e2e/f17/page-attente.spec.ts (SC-001 à SC-004) ; `DOMAINES_PAGE_ATTENTE=127.0.0.1` en CI et dans .env.example
- [X] T008 Documentation docs/deploiement-scalingo.md (domaine, DNS o2switch, variable) et docs/demonstration.md
