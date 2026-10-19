# Parcours de bout en bout en démonstration (SC-001 de F11)

F11 fournit les connecteurs, la base de démonstration et le cadre de test. Les parcours
complets sont construits par les modules F01 à F10 : **chaque module ajoute ici son parcours**,
écrit avec Playwright et joué en mode démonstration (`npm run test:e2e`).

SC-001 est atteint quand tous les parcours ci-dessous existent et passent.

| Parcours | Module | Fichier attendu | État |
|---|---|---|---|
| Accueil, navigation, recherche, contact, newsletter, cookies, contenus | F01 | `../f01/*.spec.ts` | ✅ |
| Inscription (RPPS ou SIRET), validation, connexion, Mon compte, données personnelles | F02 | `../f02/*.spec.ts` | ✅ |
| Catalogue : catégories et filtres, fiches et formules, consommables, disponibilité, back-office du catalogue, devis, services | F03 | `../f03/*.spec.ts` | ✅ |
| Achat : panier, paiement American Express (accepté, refusé, authentification forte), virement, facture FICTIVE, suivi et remboursement | F04 | `../f04/*.spec.ts` | ✅ |
| Mise à disposition : dépannage express, sans compte, kit, suivi, résiliation, retour, échéances, impayés, retards, parc | F05 | `../f05/*.spec.ts` | ✅ |
| Fidélité : bons d'achat crédités, utilisés dans le panier, droits d'assistance | F06 | `fidelite.spec.ts` | à écrire |
| Demande de financement (F04) ou de devis (F03), copie en opportunité | F04 / F03 | `../f04/financement.spec.ts`, `../f04/back-office-financement.spec.ts`, `../f03/*.spec.ts` | ✅ |

## Règles communes

- Se connecter avec les comptes de démonstration (`../session.ts`), jamais avec des
  identifiants écrits dans le dépôt.
- Vérifier l'accessibilité de chaque page traversée (`../axe.ts`).
- Ajouter les pages du parcours à la liste de `../no-egress.spec.ts`.
- Remettre en l'état les données modifiées, ou s'appuyer sur `npm run demo:reset`.
