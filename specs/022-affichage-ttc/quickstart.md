# Quickstart: vérifier F22 — Affichage des prix TTC

Prérequis : base de démonstration remplie, serveur local sur le port 3000, connecteurs en
démonstration. **Une seule suite e2e à la fois** sur ce serveur et cette base.

## 1. Tests automatiques

```bash
npm run lint && npm run typecheck
npm run test:unit -- tests/unit/f22
E2E_BASE_URL=http://localhost:3000 npx playwright test tests/e2e/f22
```

Attendu : composant, formateur et invariant des totaux verts (SC-002) ; parcours e2e verts
sur ordinateur et téléphone, accessibilité comprise (SC-001, SC-005).

## 2. Vérification à l'œil (phase 1)

1. Rubrique Holter ECG : chaque carte montre « À partir de … € TTC », puis « soit … € HT ».
2. Fiche d'un consommable à paliers : prix du lot, prix unitaire et total en TTC d'abord.
3. Fiche avec mise à disposition et financement : montants « / mois » en TTC d'abord.
4. Panier avec trois lignes et frais de port : somme des TTC des lignes et du port = « Total
   TTC à payer » ; montant payé sur l'écran de paiement de démonstration identique.
5. Mon compte › Commandes, Devis, Factures : TTC d'abord ; la facture fictive (PDF) inchangée.
6. Boîte de démonstration : l'email de confirmation cite « … € TTC (soit … € HT) ».
7. Back-office › Catalogue : saisie d'un prix toujours en HT, avec l'aide « soit … € TTC ».
8. Lecteur d'écran (VoiceOver) sur une carte : une seule annonce « … euros TTC, soit … euros HT ».

## 3. Phase 3

Sur la copie de test d'Odoo (F14 lot Commandes) : 10 commandes, total TTC du site = total de
la facture Odoo (SC-006).
