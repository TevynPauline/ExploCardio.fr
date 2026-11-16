# Quickstart : vérifier F27

## Prérequis

```bash
export PATH=/opt/homebrew/opt/node@24/bin:$PATH
npm run db:migrate   # bases du site et de démonstration
npm run demo:reset   # base de démonstration avec les sous-catégories rangées
```

Serveur de développement : `preview_start explocardio-dev` (port 3000).

## Scénarios

1. **Barre** (ordinateur, 1 280 px) : cinq entrées dans l'ordre, « Qui sommes-nous » et
   « Contact » à droite, une seule ligne dès 1 024 px. Aucun titre de panneau avec le motif.
2. **Produits** : survoler → quatre colonnes ; « Accessoires Holter ECG » en gras, « Câbles » et
   « Sacoches » dessous ; cliquer « Sacoches » → `/holter-ecg?categorie=…` avec seulement les
   sacoches ; aucune catégorie technique.
3. **Consommables** : SaniCuff visible sous « Pour la MAPA » et aussi dans Produits → MAPA ;
   « Tous les consommables » → `/consommables` rangé par examen.
4. **Informatique médicale** : sections dans l'ordre de la spec (US2-1) ; étape 2 « On vous
   appelle » ; lien PCA en nouvel onglet.
5. **Questionnaire** (déconnecté) : étape 1 vide → erreur ; trois étapes remplies → confirmation ;
   « Demandes → Informatique médicale » montre la demande ; « Emails » montre la notification
   simulée.
6. **Questionnaire** (connecté) : coordonnées préremplies, demande rattachée au compte.
7. **Suivi** : passer la demande « En cours » puis « Transmise à 2i », ajouter une note → journal.
8. **Lien suivi** : renseigner `partenaire.pca.lien` → les liens PCA l'utilisent.
9. **Redirection** : `/services/hebergement-donnees-sante` → 308 vers
   `/informatique-medicale#hebergement`.
10. **Téléphone** (390 px) : menu replié, listes dépliables jusqu'au niveau 3, cibles ≥ 44 px.
11. **Panne Odoo simulée** : barre et pages sans catalogue intactes ; colonnes Produits réduites
    aux liens de famille.

## Tests

```bash
npm run test:contract && npm run test:unit
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/f27 tests/e2e/f01 --workers=1
npm run test:lighthouse   # accueil : CLS ≤ 0,1, LCP ≤ 2 s
```

## Phase 3

Brancher le site sur la copie de test d'Odoo après le rangement de Régis : l'arbre du menu doit
reproduire ses catégories (US1-6) ; F25 branchée : la notification arrive par e-mail (US2-6).
