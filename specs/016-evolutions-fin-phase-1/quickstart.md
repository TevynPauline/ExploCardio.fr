# Guide de validation — F16

Prérequis : base de démonstration remplie ; serveur de développement ; comptes de
démonstration.

## Lot A

1. **En-tête** : 390 px → menu à gauche, logo au centre, loupe, panier, compte à droite.
   1 024 px et 1 280 px → menu horizontal complet. PC Windows à 125 % → idem.
2. **Fil d'Ariane** : Accueil → Holter ECG → une fiche : « Accueil › Holter ECG › … » ;
   cliquer « Holter ECG » ramène à la famille. Sur téléphone : « ‹ Holter ECG ».
3. **Accueil** : ordre carrousel, accès rapides, Pourquoi, Service et fidélité, Offre digitale,
   contact ; ni logo géant, ni signature, ni « Régis Andrieu, fondateur », ni section Équipement
   ou Actualités.
4. **Carrousel** : défilement toutes les 6 s ; Pause ; flèches et points au clavier ; en mouvement
   réduit, aucun défilement seul. Back-office → Contenus → Carrousel : vignette en préparation
   (aperçu seulement), publiée (visible en moins d'une minute), datée de demain (invisible).
   Désactiver l'offre de bienvenue → sa vignette disparaît.
5. **Panier** : passer de 1 à 5 → prix de ligne immédiat, totaux corrigés ; recharger → 5.
6. **Hors « hors imagerie »** : recherche dans les pages, un email et une facture : aucun résultat.

## Lot B

7. **Inscription** sans numéro → email confirmé → commande d'électrodes : le SIRET est demandé
   avant le paiement, puis la commande part. Back-office → À traiter : numéro à vérifier →
   « Numéro vérifié ».
8. **Location** par un compte au numéro non vérifié : expédition bloquée jusqu'à la vérification.
9. **Devis** : panier de 6 000 € HT → « Recevoir un devis » → PDF FICTIF, email dans la boîte de
   démonstration, équipe prévenue → Mon compte → Devis → Commander : prix du devis. Devis expiré
   (date avancée dans l'écran de démonstration) → panier aux prix du jour.
10. **Hors métropole** : adresse 97400 ou « Autre pays » → commande refusée, « Nous contacter »
    ouvre le contact prérempli.

## Contrôles automatiques

```bash
npm test -- tests/unit/f16 tests/contract/odoo/devis.test.ts
npx playwright test tests/e2e/f16
```
