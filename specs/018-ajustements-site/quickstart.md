# Quickstart: F18 — Ajustements du site (lot A)

## Prérequis

- PostgreSQL démarré (`brew services start postgresql@17`), Node 24 dans le `PATH`.
- Serveur de développement « explocardio-dev » sur le port 3000.
- Un compte client de démonstration validé (voir `docs/demonstration.md`).

## Tests automatiques

```bash
npx vitest run tests/unit/f18 tests/unit/comptes/adresses.test.ts tests/unit/f16/metropole.test.ts
```

```bash
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/f18 tests/e2e/f16/hors-metropole.spec.ts tests/e2e/f16/navigation.spec.ts tests/e2e/f16/panier-direct.spec.ts
```

Attendu : tout passe, en mobile et sur ordinateur, analyse axe comprise.

## Vérifications manuelles

1. **Corse refusée** : dans Mon compte → Adresses, saisir 20000 Ajaccio comme adresse de
   livraison → message « …France métropolitaine continentale… » et bouton « Nous contacter »
   (formulaire prérempli, motif « Commande hors métropole »). Même essai à l'inscription, dans
   le tunnel et en demandant un devis. Avec 69003 Lyon : accepté.
2. **Facturation en Corse** : livraison à Lyon, facturation à Bastia → commande acceptée.
3. **Quantités** : sur téléphone (390 px) et ordinateur, ouvrir le panier : « − » et « + »
   visibles sans survol ; « + » met à jour le prix de la ligne aussitôt ; « − » inactif à 1.
4. **Retrait** : « Retirer » → fenêtre ; Échap → rien ne change, focus sur « Retirer » ;
   confirmer → l'article disparaît, totaux et pastille à jour.
5. **En-tête** : à 1 280 px, taper directement dans la barre de recherche ; lire « Panier » et
   « Mon compte » ; déconnecté, « Mon compte » ouvre la connexion, puis ramène à Mon compte.
   À 1 024 px et en Windows 150 %, le menu principal reste complet.
6. **Textes** : la page `/cgv` ne mentionne plus « Corse comprise ».
