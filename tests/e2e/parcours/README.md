# Parcours de bout en bout en démonstration (SC-001 de F11)

F11 fournit les connecteurs, la base de démonstration et le cadre de test. Les parcours
complets sont construits par les modules F01 à F10 : **chaque module ajoute ici son parcours**,
écrit avec Playwright et joué en mode démonstration (`npm run test:e2e`).

SC-001 est atteint quand tous les parcours ci-dessous existent et passent.

| Parcours | Module | Fichier attendu | État |
|---|---|---|---|
| Inscription (RPPS ou SIRET), validation du compte | F02 | `inscription.spec.ts` | à écrire |
| Achat : panier, paiement American Express (accepté, refusé, authentification forte), facture FICTIVE | F04 | `achat.spec.ts` | à écrire |
| Mise à disposition : choix, abonnement mensuel, première échéance | F05 | `mise-a-disposition.spec.ts` | à écrire |
| Fidélité : bons d'achat crédités, utilisés dans le panier, droits d'assistance | F06 | `fidelite.spec.ts` | à écrire |
| Demande de financement ou de devis, copie en opportunité | F04 / F13 | `demandes.spec.ts` | à écrire |

## Règles communes

- Se connecter avec les comptes de démonstration (`../session.ts`), jamais avec des
  identifiants écrits dans le dépôt.
- Vérifier l'accessibilité de chaque page traversée (`../axe.ts`).
- Ajouter les pages du parcours à la liste de `../no-egress.spec.ts`.
- Remettre en l'état les données modifiées, ou s'appuyer sur `npm run demo:reset`.
