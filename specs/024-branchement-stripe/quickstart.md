# Quickstart — vérifier F24

## Phase 1 (sans clé Stripe)

```bash
npx vitest run tests/contract/stripe.test.ts tests/unit/stripe-reel
```

Attendu : contrat vert en démonstration (dont `null`, `contestation`, gestion du moyen de
paiement) ; tests du mode réel avec un faux Stripe : corps des sessions, écarts du premier
mois, `trial_end`, schedules, ponctuel, remboursement, correspondance des événements, erreurs,
garde clé/environnement.

## Phase 3 (site de recette, Stripe en mode test)

Prérequis : `CONNECTOR_STRIPE=real`, `STRIPE_ENVIRONNEMENT=recette`, clé restreinte de test
(`rk_test_…`, permissions de research R2) et secret du webhook de test (adresse
`https://<recette>/api/evenements/paiement`, événements de research R12), saisis par Régis ou
Pauline dans Scalingo. Réglages du tableau de bord de research R14 faits.

1. **Contrat réel** : suite de contrat depuis la recette → verte.
2. **Achat** : carte `4242 4242 4242 4242` → commande confirmée, email, panier vidé ; carte
   `4000 0025 0000 3155` (authentification) validée puis abandonnée ; carte refusée
   `4000 0000 0000 0002` → message, panier intact. Page aux couleurs et au logo du site,
   montant TTC exact, libellé `EXPLOCARDIO.FR`.
3. **Location par carte** avec deux appareils → abonnement actif, deux articles, premier mois
   au bon montant. Horloge de test avancée d'un mois → `echeance_payee`, facture Odoo, email.
4. **Location par SEPA** (IBAN de test `FR1420041010050500013M02606`) → commande confirmée dès
   le mandat ; IBAN d'échec `FR8420041010050500013M02607` → échéance refusée, règles F05.
5. **Abonnement logiciel différé** → aucun prélèvement, première mensualité à la date prévue.
6. **Équipe** : retirer une location à la fin du mois, rétablir, résilier, prélever un ponctuel,
   libérer puis prélever (refus), rembourser partiellement puis trop (refus).
7. **Événements** : renvoyer un événement depuis le tableau de bord → aucun second effet ;
   requête à signature fausse → 400 sans effet ; contestation de test → alerte.
8. **Garde** : clé `sk_live_` sur la recette → paiements bloqués, alerte « À traiter ».
9. **Moyen de paiement** : « Mettre à jour ma carte » depuis Mon compte → portail Stripe,
   retour au site.
10. **Démonstration inchangée** : site de démonstration → suites complètes vertes.
