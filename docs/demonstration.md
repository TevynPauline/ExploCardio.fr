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
  leur rendu et leur version texte. **Aucun n'est réellement envoyé.** Ouvrir un email simule
  son ouverture par le destinataire (visible dans le suivi des envois).
- **Emails automatisés** : créez des commandes régulières d'un consommable pour un client, puis
  lancez les scénarios sans attendre leur heure (relances de consommables, paniers en attente,
  relances de paiement).
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
- **Mise à disposition** : voir la section F05 ci-dessous. Panier mixte : l'achat se paie
  d'abord, puis le client autorise le prélèvement mensuel ; si cette autorisation échoue, elle
  se reprend depuis **Mon compte → Commandes** sans repayer l'achat.
- **Expédier, livrer, rembourser** : dans **Démonstration → Paiements**, carte « Commandes »
  (ce que l'équipe fera dans Odoo) : **Marquer expédiée** (transporteur et suivi),
  **Marquer livrée**, **Décider un remboursement** (partiel ou total). Le client voit le
  statut, le suivi et l'**avoir** dans Mon compte, et reçoit un email à chaque étape. Un
  remboursement fait directement chez Stripe se montre avec **Simuler un remboursement**.
- **Commandes du site** (toute l'équipe) : **Back-office → Commandes**, en lecture seule ; les
  commandes payées mais pas encore enregistrées dans Odoo y sont signalées (le site réessaie
  seul toutes les 5 minutes).

## Mise à disposition et dépannage express (F05)

- **Dépannage express** : `/mise-a-disposition` (menu Services). Chaque équipement proposé
  affiche le premier mois et les mois suivants (HT puis TTC) et la date de livraison la plus
  proche : « Livraison demain » un jour ouvré avant l'heure limite, sinon la première date
  possible (week-ends, jours fériés, jours non livrés et Corse pris en compte). « Choisir »
  ouvre la fiche sur la formule de mise à disposition.
- **Commander** : l'étape « Livraison » propose les jours ouvrés possibles ; la location
  commence le jour de la livraison. Le récapitulatif détaille le pack, la prochaine échéance,
  la valeur de remplacement (aucun dépôt de garantie) et les **conditions de location** à
  accepter. Un appareil est réservé avant le paiement : si le dernier vient d'être pris, rien
  n'est débité et le médecin choisit la date suivante.
- **Kit d'accessoires** (Holter DMS) : ajouté d'office au panier à la première location,
  marqué « obligatoire, vous le conservez », jamais facturé deux fois. Un kit possédé est
  signalé sur la fiche et au panier. **Démonstration → Locations → Enregistrer un kit**
  simule un kit acquis autrement.
- **Sans compte** : le visiteur commande, crée son compte depuis la page de connexion, confirme
  son email et clique « Reprendre ma commande » : appareil, date et kit sont conservés. Il peut
  payer avant la validation ; l'équipe reçoit une alerte « Validation prioritaire » et rien ne
  part avant la validation (**Comptes**). Validé : expédition débloquée (date recalculée si
  besoin). Refusé : location annulée, premier mois et kit intégralement remboursés.
- **Démonstration → Locations** (ce que l'équipe fera dans Odoo) : préparer et expédier
  (appareil, suivi), signaler un appareil défectueux ou un colis non livré, marquer livrée,
  enregistrer un retour (complet, dégradé avec son montant, perdu), simuler un prélèvement
  échoué, régulariser, et **avancer la date** pour exécuter les actions planifiées (échéances,
  rappels, suspension pour impayé, retard de retour, facturation du mois suivant ou de la valeur
  de remplacement). Les règles d'impayé et de retour se règlent dans **Démonstration →
  Paramètres commerciaux**.
- **Mon compte → Locations** : appareil, numéro de série (après l'expédition), dates,
  prochaine échéance ; boutons Résilier, Prolonger (avant la fin), Étiquette de retour (PDF
  « FICTIVE »), Passer à l'achat, Passer au financement, Annuler sans frais (avant
  l'expédition) ou Reporter (appareil défectueux) ; historique et factures.
- **Résilier** : fin au terme du mois payé, prélèvements de cette location arrêtés, accès Cloud
  fermé à la date de fin, instructions et date limite de retour. L'autorisation de
  prélèvement reste valable jusqu'au retour, pour un éventuel retard ou une dégradation.
- **Back-office → Locations** (toute l'équipe) : commandées, en cours, impayés, retards, en
  lecture seule. **Contenus → Coordonnées et textes** : heure limite, jours non livrés, zones
  éloignées, rappels, conditions de location.

## Bons d'achat, droits d'assistance et promotions (F06)

Le parcours « consommables → bons d'achat → assistance offerte » : tout est calculé par Odoo
(ici la base fictive), le site l'affiche.

- **Ce qu'un achat rapporte** : les fiches de consommables et d'accessoires, le panier (même
  pour un visiteur) et la page de confirmation annoncent les bons d'achat gagnés, le montant
  qui manque pour le palier suivant, et l'ouverture ou la prolongation des droits
  d'assistance (ou ce qui manquait pour les ouvrir). Paramètres par défaut : 0 % sous 500 € HT,
  5 % de 500 € à 1 000 € HT, 10 % au-delà, sur tout le montant éligible ; une commande de
  1 200 € HT de consommables rapporte 120 €.
- **Utiliser ses bons** : au panier, « Bons d'achat » : solde, prochaine expiration, montant à
  utiliser (vide = le maximum). Odoo plafonne au montant des achats ; les bons ne sont débités
  qu'au paiement, en commençant par ceux qui expirent le plus tôt.
- **Annulation et remboursement** : les bons et la période de droits apportés par la commande
  sont retirés ; les bons qu'elle avait utilisés sont rendus avec leur date de validité
  d'origine (30 jours de plus s'ils ont expiré entre-temps). Si les bons crédités ont déjà été
  dépensés, le remboursement est réduit d'autant et l'équipe est prévenue
  (**Démonstration → Paiements** affiche la réduction).
- **Mon compte → Bons d'achat** : solde, prochaine expiration, historique relié aux commandes,
  règles du programme. **Mon compte → Droits d'assistance** : statut, date de fin, commande
  d'origine, comment prolonger ; sans droits, le montant qui les ouvrirait et l'**assistance à
  l'acte** (150 € HT l'intervention, réglée par carte seulement), avec ses interventions.
- **Emails** (boîte de démonstration, relevés toutes les 5 minutes, une seule fois) : bons
  crédités, retirés, rendus, ajustés ; droits ouverts, prolongés ou retirés ; intervention
  close ; rappels avant la fin des droits et avant l'expiration de bons.
- **Promotions** : les remises automatiques, ventes flash et codes « à annoncer » en cours
  s'affichent dans le bandeau et sur les fiches (prix d'origine, prix remisé HT, date de fin),
  et s'arrêtent à la minute de leur fin. Un article encore au panier à la fin d'une promotion
  passe au prix en vigueur, avec un message.
- **Back-office → Assistance** (toute l'équipe, lecture seule) : recherche par nom, cabinet,
  email, téléphone, RPPS ou SIRET ; statut et fin des droits, ajustements, interventions,
  règles en vigueur.
- **Démonstration → Fidélité** (ce que l'équipe fera dans Odoo) : ajuster une cagnotte ou des
  droits (motif obligatoire), clore une intervention payée, exécuter l'expiration des bons
  échus et les rappels à une date simulée, créer ou terminer une promotion. Les paliers, la
  validité, le seuil, la durée et le plafond des droits et le prix de l'assistance à l'acte se
  règlent dans **Démonstration → Paramètres commerciaux** ; une modification ne touche que les
  commandes suivantes.

## Logiciels Cloud et plateforme HDS (F12)

Les logiciels d'analyse sont proposés en ligne, sur la plateforme Cloud hébergée en France
(HDS) de notre partenaire. En démonstration, la plateforme est simulée : aucun compte réel
n'est créé, et « Accéder à la plateforme » mène à une page de démonstration.

- **Ouverture** : une location d'un Holter « + logiciel Cloud » ouvre l'accès à l'expédition
  (au plus tard à la livraison) ; l'achat d'une configuration « + logiciel Cloud » l'ouvre dès
  le paiement, pour la période incluse fixée dans Odoo (12 mois en démonstration). Le médecin
  reçoit un email ; il crée lui-même son mot de passe sur la plateforme, que le site ne connaît
  jamais. Un seul compte par médecin, quel que soit le nombre de logiciels.
- **Mon compte → Logiciels Cloud** : état de chaque logiciel (en cours d'ouverture, actif, en
  délai de grâce, suspendu, fermé) et ses dates, lien vers la plateforme, aide à la première
  connexion, WhatsApp. Sans logiciel : l'offre, avec « Souscrire l'abonnement ».
- **Abonnement** : souscrit par le panier, comme une location sans appareil (carte ou SEPA,
  sans engagement). Avant la fin d'une période incluse, « Poursuivre avec l'abonnement » le fait
  démarrer à sa fin : l'accès continue sans interruption et rien n'est prélevé avant.
  « Résilier l'abonnement » : fin au terme du mois payé.
- **Fin des droits** : à la fin d'une location ou d'un abonnement, l'accès passe en **délai de
  grâce** (consultation et récupération des données, 30 jours par défaut), puis il est fermé ;
  les autres logiciels restent ouverts. Rappels 30 jours avant la fin d'une période incluse
  (avec la proposition d'abonnement) et 7 jours avant toute fin. Pour le montrer :
  **Démonstration → Locations → Avancer la date**.
- **Back-office → Logiciels Cloud** (administrateur et support) : tâches à faire, recherche d'un
  client, ouvrir, suspendre, rétablir ou fermer un accès avec un motif ; journal. Un compte du
  site suspendu suspend ses accès ; un impayé suspend l'accès concerné jusqu'à la régularisation.
- **Plateforme non automatisée** : **Démonstration → Pannes simulées → Passer en mode manuel**.
  Chaque ouverture ou fermeture devient une tâche pour l'équipe ; le médecin voit « en cours
  d'ouverture » jusqu'à la confirmation, puis reçoit le même email qu'en mode automatique.
- **Hébergement des données de santé** : tant que le badge « En préparation » est affiché
  (Contenus → Coordonnées et textes), la page propose un formulaire d'intérêt ; les demandes
  apparaissent dans **Back-office → Devis** et sont copiées en opportunités dans Odoo.
- **Réglages** : délai de grâce, rappels, adresse de la plateforme et aide à la première
  connexion dans **Contenus → Coordonnées et textes → Rappels et accès Cloud** (avec les délais
  des rappels de fidélité de F06).

## Contact WhatsApp et centre d'aide (F09)

- **Contact** : le numéro de la ligne WhatsApp Business, les horaires de réponse (« Nous vous
  répondons maintenant » ou « Nous vous répondrons lundi à 9 h ») et les boutons « Appeler » et
  « Écrire sur WhatsApp » figurent dans le pied de page, sur la page Assistance, dans « Mon
  compte », sur les fiches produit, les pages d'aide et dans les emails. En démonstration, les
  boutons ouvrent une page qui explique que personne n'est contacté et montre le message qui
  aurait été pré-rempli (« Bonjour, je suis le Dr [nom], cabinet [cabinet]. » ; rien d'autre).
- **Réglages** : numéro, horaires par jour et fermetures exceptionnelles dans **Contenus →
  Coordonnées et textes** ; jours fériés automatiques. Numéro vidé : plus aucun bouton, le
  formulaire de contact est proposé.
- **Centre d'aide** (`/aide`, menu Services et pied de page) : modes d'emploi pas à pas,
  tutoriels vidéo (sous-titres et transcription obligatoires), notices des produits reprises de
  leur fiche, FAQ (les plus consultées en tête), classés par thème et par appareil, avec une
  recherche ; « Aide pour ce modèle » sur les fiches ; résultats dans la recherche du site.
  Contenus d'exemple fictifs à remplacer.
- **Contenus → Centre d'aide** (administrateur) : créer, téléverser (vidéo MP4 de 50 Mo au plus,
  sous-titres WebVTT, PDF, images des étapes), relier aux produits, publier ou retirer.
- **Mon compte** : l'état des droits d'assistance à côté du contact ; **Back-office →
  Assistance** retrouve un client par son téléphone, avec ou sans espaces.

## Emails automatisés (F10)

- **Trois familles** : les emails **toujours envoyés** (commande, paiement, compte, location,
  relances de paiement), les emails **de service**, désactivables (relance de consommables,
  panier en attente, alertes de fin des droits et d'expiration des bons), et la **newsletter**,
  réservée aux abonnés confirmés.
- **Relance de consommables** : un client qui commande le même consommable à un rythme régulier
  (au moins 3 commandes) reçoit une relance environ 7 jours avant la date prévue, avec le prix
  HT, ce que la commande lui rapporterait, et « Commander de nouveau » (l'article arrive dans
  son panier). Pour la montrer : **Démonstration → Emails automatisés**, « Commandes
  régulières » (3 commandes tous les 60 jours, la dernière il y a 53 jours), puis « Lancer les
  scénarios ».
- **Panier en attente** : un rappel 24 h après la dernière modification d'un panier non
  commandé, aux prix du jour.
- **Relances de paiement** : virement attendu ou prélèvement refusé : trois relances (5 jours, 2
  jours et la veille de l'annulation ou de la suspension), réglées comme dans Odoo dans
  **Démonstration → Paramètres commerciaux** ; la dernière annonce la conséquence et sa date.
- **Préférences** : **Mon compte → Préférences** (newsletter, chaque email de service, et la
  liste des emails toujours envoyés) ; le même réglage sans connexion par le lien en bas de
  chaque email facultatif ; désinscription en un clic.
- **Règles d'envoi** : au plus 2 emails facultatifs ou commerciaux par semaine et par client ;
  ces emails partent les jours ouvrés, de 8 h à 19 h. Les emails toujours envoyés partent
  aussitôt.
- **Back-office → Emails** (administrateur) :
  - **Suivi des envois** : les emails d'un client, leur état (remis, ouvert, rejeté, non envoyé
    et pourquoi) ; lever la suspension d'une adresse qui rejetait les messages ; enregistrer une
    désinscription reçue par réponse à un email.
  - **Scénarios et règles** : activer, régler, résultats sur 30 jours (envoyés, remis, ouverts,
    suivis d'une commande).
  - **Modèles** : modifier l'objet et les paragraphes de chaque email (informations insérées
    automatiquement entre accolades), aperçu, email de test, publier, revenir au texte d'origine.
  - **Campagnes** : promotion, vente flash ou nouveauté pour les abonnés ; email de test
    obligatoire, puis programmation (jours ouvrés, 8 h – 19 h) ; annulable jusqu'à l'envoi.

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
