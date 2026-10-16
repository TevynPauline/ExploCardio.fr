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
