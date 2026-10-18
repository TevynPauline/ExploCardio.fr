# Site de démonstration — guide de l'équipe

Le site de démonstration présente ExploCardio.fr **avec des données fictives** : aucun service
réel n'est branché (ni Odoo, ni Stripe, ni la plateforme Cloud, ni l'outil d'emailing).

> ⚠️ **Les prix sont inventés.** Ils sont marqués « prix inventé » dans la base et doivent être
> remplacés avant toute présentation à un médecin.

## Ouvrir le site

1. Ouvrez l'adresse du site de démonstration (`demo.explocardio.fr` une fois publié).
2. Saisissez le **mot de passe de démonstration** : il est communiqué par l'administrateur.
3. Un bandeau « Version de démonstration — données fictives » reste affiché sur toutes les pages.

Le site n'est pas référencé par les moteurs de recherche.

## Les comptes de démonstration

Tous les comptes ont le même mot de passe, communiqué par l'administrateur.

| Compte | Ce qu'il permet de montrer |
|---|---|
| `client.droits@demo.explocardio.test` | Client aux droits d'assistance actifs : commandes, location en cours, abonnement logiciel, bons d'achat |
| `client.sans-droits@demo.explocardio.test` | Client sans droits d'assistance, demande de financement en cours |
| `attente@demo.explocardio.test` | Compte en attente de validation : consulte, ne peut pas commander |
| `admin@demo.explocardio.test` | Back-office complet et outils de démonstration |
| `support@demo.explocardio.test` | Consultation des clients, de leurs droits et des accès Cloud |

Les comptes **administrateur** et **support** demandent aussi un code de double
authentification : ajoutez la clé fournie par l'administrateur dans une application
d'authentification (par exemple sur votre téléphone).

La base contient aussi une quinzaine de médecins et de cabinets fictifs, des locations (dont une
en retard de retour), un produit en rupture, des produits « en délai », un bénéficiaire de
l'offre de bienvenue, des accès Cloud dans tous les états.

## Les outils de démonstration (administrateur)

Dans le back-office, rubrique **Démonstration** :

- **Prix**, **Stocks**, **Paramètres commerciaux** : modifiez les valeurs fictives (prix, ruptures,
  paliers des bons d'achat, droits d'assistance, promotions). L'effet est immédiat. Une valeur
  incohérente est refusée avec l'explication.
- **Paiements** : ouvrez une page de paiement de test ; simulez une échéance mensuelle (payée ou
  refusée) ou un remboursement. La page de paiement de démonstration ne demande **aucun numéro
  de carte** : on choisit la carte (Visa, Mastercard, American Express) ou le prélèvement SEPA,
  puis l'issue (accepté, refusé, authentification forte).
- **Pannes simulées** : rendez un service indisponible pour montrer les messages d'erreur.
- **Boîte de démonstration** : tous les emails et notifications qui auraient été envoyés, avec
  leur rendu. **Aucun n'est réellement envoyé.**
- **Accès au site de démonstration** : changez le mot de passe partagé. Toutes les personnes
  connectées devront saisir le nouveau.
- **Réinitialiser** : revenez à l'état de départ en moins d'une minute.

## Les comptes professionnels (F02)

- **S'inscrire** : bouton « Mon compte / Connexion » puis « Créer un compte », ou
  `/inscription`. Utilisez un RPPS fictif commençant par `99` (11 chiffres) et une adresse en
  `@demo.explocardio.test`. L'email de confirmation arrive dans la **boîte de démonstration**.
- **Valider un compte** (administrateur ou commercial) : rubrique **Comptes** du back-office.
  Valider, refuser (motif obligatoire), suspendre, rétablir ; chaque décision envoie un email.
  Les demandes de changement de RPPS ou SIRET sont dans **Comptes → Demandes**.
- **Réglages** (administrateur) : validation automatique, offre de bienvenue, spécialités.
- **Mon compte** : informations, adresses, préférences (newsletter), sécurité (mot de passe,
  double authentification facultative), mes données (export JSON, suppression du compte).
- **Sécurité** : 5 mots de passe erronés en 15 minutes bloquent le compte 15 minutes (email au
  titulaire) ; « Mot de passe oublié » donne le même message que l'adresse existe ou non.
- La suppression est refusée pour `client.droits` (location en cours) : c'est voulu.

## Le catalogue (F03)

- **Parcourir** : chaque catégorie présente ses produits en cartes, avec des filtres (marque,
  type, disponibilité) et un tri par prix. Les filtres restent dans l'adresse : on peut
  partager une liste filtrée.
- **Fiche équipement** : choisissez « Acheter », « Mise à disposition mensuelle » ou
  « Financement longue durée » ; le prix et le contenu changent aussitôt. L'adresse garde le
  choix. Les fiches **Oscar 2** et **DMS 300-2e** sont complètes (onglets, notice PDF de
  démonstration) ; les autres ont des textes provisoires.
- **Fiche consommable** (par exemple les électrodes Holter) : conditionnements, prix à l'unité
  et par lot, prix dégressifs, ajout rapide au panier.
- **Panier** : il liste ce qui a été ajouté (voir F04 ci-dessous pour commander).
- **Mensualité imposée** : le Dr Delvaux-Arnoux (client fictif) a une mensualité de
  financement négociée sur le DMS 300-4L avec logiciel Cloud, visible de lui seul.
- **Back-office → Catalogue** (administrateur) : rédigez textes, photos et documents,
  choisissez le type et l'ordre, publiez. Les prix, stocks et configurations restent en
  lecture seule (ils se gèrent dans Odoo ; en démonstration, dans **Démonstration → Prix** et
  **Stocks**). « Types » règle les filtres ; « Pages services » le badge de l'hébergement, les
  tarifs des services et la mention sous les mensualités.
- **Rupture** : passez un article en rupture dans **Démonstration → Stocks** : la carte et la
  fiche l'indiquent au rechargement suivant.

## Commander, payer et suivre (F04)

- **Panier** : deux blocs, « Paiement unique » (achats) et « Abonnement mensuel » (mises à
  disposition). Quantités modifiables, code promo, total HT, TVA et TTC calculés par Odoo.
  Un prix qui a changé depuis l'ajout est signalé. Le panier d'un visiteur rejoint son compte
  à la connexion.
- **Commander** (compte validé) : adresses (préremplies, France métropolitaine), livraison
  (standard, ou express avant l'heure limite et si l'article est en stock), moyen de paiement,
  récapitulatif et conditions générales de vente. Le stock est réservé avant le paiement.
- **Payer par carte** : la page de paiement de démonstration s'ouvre ; choisissez
  **American Express** et « Paiement accepté ». La commande et sa **facture FICTIVE** (PDF)
  apparaissent dans **Mon compte → Commandes** et **Factures** ; l'email de confirmation est
  dans la boîte de démonstration. « Paiement refusé » rend la main sans rien débiter, panier
  conservé.
- **Payer par virement** : la commande est réservée jusqu'à l'échéance ; l'écran et l'email
  donnent le RIB fictif et la référence. Dans **Démonstration → Paiements**, carte
  « Commandes », bouton **Virement reçu** : la commande passe payée et facturée, le client est
  prévenu. Un montant différent laisse la commande en attente et alerte l'équipe. Sans
  virement, un rappel part 2 jours avant l'échéance et la commande est annulée à l'échéance.
  Le RIB et ces délais se règlent dans **Contenus → Coordonnées et textes**.
- **Mise à disposition** : sur une fiche, « Mise à disposition mensuelle » puis « Ajouter la
  mise à disposition au panier ». Le récapitulatif donne le premier mois, les mois suivants et
  la date de prélèvement (carte ou SEPA). La location apparaît dans **Mon compte → Locations
  en cours**. Panier mixte : l'achat se paie d'abord, puis l'abonnement ; si l'abonnement
  échoue, il se reprend depuis **Mon compte → Commandes**. Pour montrer une échéance :
  **Démonstration → Paiements → Simuler une échéance**.
- **Expédier, livrer, rembourser** : dans **Démonstration → Paiements**, carte « Commandes »
  (ce que l'équipe fera dans Odoo) : **Marquer expédiée** (transporteur et suivi),
  **Marquer livrée**, **Décider un remboursement** (partiel ou total). Le client voit le
  statut, le suivi et l'**avoir** dans Mon compte, et reçoit un email à chaque étape. Un
  remboursement fait directement chez Stripe se montre avec **Simuler un remboursement**.
- **Commandes du site** (toute l'équipe) : **Back-office → Commandes**, en lecture seule ; les
  commandes payées mais pas encore enregistrées dans Odoo y sont signalées (le site réessaie
  seul toutes les 5 minutes).

## Demander un financement (F04)

- Sur une fiche, formule « Financement longue durée » → **Demander mon financement** ; ou
  depuis le panier. Équipements, durée (24 à 60 mois) et cabinet sont préremplis ; la
  mensualité affichée est **indicative**. Aucun paiement en ligne. Les équipements demandés
  depuis le panier en sont retirés.
- La demande est visible dans **Mon compte → Financements** dès l'envoi, et dans
  **Back-office → Financements** (administrateur et commercial, pas le support) : changer le
  statut (reçue, en étude, accordée, refusée) prévient le client par email ; les notes
  internes ne sont jamais visibles du client. Une fois accordée, **Créer la commande
  financée** : commande sans montant à régler et sans facture au client, stock décompté.
- Aucun nom d'organisme de financement n'apparaît côté client.

## Les contenus du site (administrateur)

Dans le back-office, rubrique **Contenus** : bandeau promotionnel, six tuiles d'accès rapide,
actualités, coordonnées et textes de l'accueil, produits phares et liens rapides des menus,
marques partenaires. Une modification est visible sur le site en moins d'une minute et
inscrite au journal. Ces contenus sont **réels** : ils sont conservés quand on réinitialise la
démonstration.

## Réinitialiser entre deux séances

La réinitialisation remet à zéro la base fictive, les comptes clients créés pendant la séance,
les demandes, la boîte de démonstration et les pannes. **Elle conserve** les contenus (textes,
photos, FAQ, tutoriels, bandeau), les paramètres du site et les comptes de l'équipe.

Depuis le back-office (**Démonstration → Réinitialiser**), ou par l'équipe technique :

```bash
npm run demo:reset
```
