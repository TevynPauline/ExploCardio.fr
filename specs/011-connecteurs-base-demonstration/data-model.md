# Modèle de données — F11 Connecteurs et base de démonstration

**Date** : 2026-10-14
**Plan** : [plan.md](plan.md)

Deux bases distinctes (voir [research.md](research.md), R4) :

- **base du site** : données propres au site, réelles dès la phase 1 ;
- **base de démonstration** : équivalent fictif d'Odoo, utilisé seulement par les
  connecteurs en mode démonstration ; absente en production.

Les noms des objets de la base de démonstration reprennent ceux d'Odoo (entre parenthèses)
pour faciliter la phase 2 (FR-012).

---

## 1. Base du site

### Comptes et équipe

| Entité | Champs principaux | Règles |
|---|---|---|
| **Utilisateur** | id, email (unique), nom, prénom, civilité, téléphone, spécialité, rôle (`client`, `admin`, `commercial`, `support`), email confirmé, double authentification activée | Double authentification obligatoire pour les rôles d'équipe (F13) |
| **Compte client** | id, type (`medecin` RPPS / `structure` SIRET), numéro RPPS ou SIRET, nom du cabinet, statut (`email_a_confirmer`, `en_attente`, `valide`, `refuse`, `suspendu`), motif de refus, identifiant du partenaire dans Odoo (`odoo_partner_ref`), est un compte de démonstration | Un RPPS par compte (F02). `odoo_partner_ref` rempli à la validation, par le connecteur |
| **Adresse** | compte, type (`cabinet`, `livraison`, `facturation`), lignes, code postal, ville | Livraison en France métropolitaine |
| **Consentement** | compte ou email, objet (`newsletter`, `cgv`, `cookies`…), état, date, origine, texte présenté | Historique conservé, jamais écrasé |
| **Session** | utilisateur, expiration, appareil | Fermée après inactivité (équipe : 30 min) |

Transitions du compte client : `email_a_confirmer → en_attente → valide | refuse` ;
`valide → suspendu → valide`.

### Contenus et paramètres

| Entité | Champs principaux | Règles |
|---|---|---|
| **Contenu** | id, type (`bandeau`, `tuile`, `actualite`, `page`, `faq`, `tutoriel`, `notice`), titre, corps, images (avec texte de remplacement obligatoire), état (`preparation`, `publie`, `retire`), dates de début et de fin | Publié → visible en moins d'une minute |
| **Contenu produit** | référence de l'article Odoo (`default_code`), textes, photos, documents, compatibilités, produits associés, catégorie d'affichage, ordre, état de publication, orphelin | Rattaché par référence, jamais par copie des données d'Odoo |
| **Paramètre** | clé, valeur, type, rôle autorisé à modifier | Seulement le fonctionnement du site (principe VI) |
| **Historique de paramètre** | paramètre, auteur, date, ancienne valeur, nouvelle valeur | Une ligne par modification (F13, SC-006) |

Paramètres utilisés par F11 : `site_mode` (`demo`, `prod`), mot de passe du site de
démonstration (haché) et sa version, numéro WhatsApp (fictif en démonstration).

### Demandes et messages

| Entité | Champs principaux | Règles |
|---|---|---|
| **Demande de financement** | compte, équipements, durée souhaitée, statut (`recue`, `en_etude`, `accordee`, `refusee`), notes internes, référence de l'opportunité copiée dans Odoo | Gérée par le site ; copie transmise au connecteur Odoo (FR-021) |
| **Demande de devis** | demandeur, objet (ECG de repos, intérêt Cloud…), statut (`recue`, `en_cours`, `traitee`), notes, référence de l'opportunité | Idem |
| **Message de contact** | motif, coordonnées, texte, date, état | Visible par administrateur et commercial |

### Exploitation et démonstration

| Entité | Champs principaux | Règles |
|---|---|---|
| **Journal des connecteurs** | date, connecteur, mode, opération, objet, résultat, motif d'erreur, durée | Filtrable ; alerte au-delà d'un seuil (F13) |
| **Journal des actions** | auteur, action, objet, date, détail | Actions sensibles (FR-033 de F13), réinitialisations |
| **Tâche en file** | file, données, clé d'idempotence, tentatives, état, prochaine tentative | Gérée par la file d'attente (R9) |
| **Événement de paiement traité** | identifiant de l'événement, type, date | Empêche un double traitement (idempotence) |
| **Message de démonstration** | type (`email_client`, `notification_equipe_email`, `notification_equipe_sms`), destinataire, objet, rendu HTML ou texte, date, déclencheur | Existe seulement en mode démonstration |
| **Panne simulée** | connecteur, active, date | Mode démonstration seulement (FR-025) |

---

## 2. Base de démonstration (équivalent fictif d'Odoo)

| Entité (objet Odoo) | Champs principaux | Notes |
|---|---|---|
| **Partenaire** (`res.partner`) | nom, est une société, société parente, email, téléphone, RPPS ou SIRET, adresses, est fictif | Noms, RPPS et SIRET fictifs, ne correspondant à aucun professionnel réel (FR-016) |
| **Catégorie** (`product.category`) | nom, parent | Les cinq catégories du catalogue (F03) |
| **Modèle d'article** (`product.template`) | nom, marque, catégorie, type (`equipement`, `consommable`, `accessoire`, `logiciel`, `service`), formules proposées (achat, mise à disposition, financement), éligible aux bons d'achat, suivi par numéro de série, référence fictive signalée | Marques et modèles de la brochure (F03, FR-050) |
| **Variante** (`product.product`) | modèle, référence (`default_code`), référence fabricant, prix HT, taux de TVA, attributs (configuration) | Référence réelle quand connue, sinon fictive signalée |
| **Stock** (`stock.quant`) | variante, quantité, état hors stock (`disponible`, `delai`, `indisponible`), délai en jours | Modifiable dans l'écran de démonstration |
| **Numéro de série** (`stock.lot`) | variante, numéro, statut du parc (`disponible`, `loue`, `en_retour`, `en_maintenance`) | Parc de location |
| **Liste de prix** (`product.pricelist`) | nom, règles, partenaire éventuel | Prix par client, mensualités forcées (F03) |
| **Barème de financement** | durée, coefficient | Paramètre commercial (principe VI) |
| **Offre de mise à disposition** | variante, prix du premier mois, prix des mois suivants, kit requis, valeur de remplacement | Paramètres commerciaux (F05) |
| **Commande de vente** (`sale.order`) | partenaire, lignes, montants HT, TVA, TTC, mode de paiement, statut, financée, référence du paiement | Créée par le connecteur à la confirmation du paiement |
| **Ligne de commande** (`sale.order.line`) | commande, variante, quantité, prix appliqué, remise | Ligne à 0 € pour le cadeau de bienvenue |
| **Abonnement** (`sale.order` récurrente) | partenaire, objet (`mise_a_disposition`, `logiciel`), variante, numéro de série, montant, échéances, état | Location et abonnement logiciel (F05, F12) |
| **Facture** (`account.move`) | partenaire, commande, numéro continu, montants, état de paiement, PDF « FICTIVE » | Avoirs dans la même entité, type `remboursement` |
| **Programme de fidélité** (`loyalty.program`) | paliers, taux, validité, produits éligibles | Règles de F06 |
| **Mouvement de cagnotte** (`loyalty.card` + historique) | partenaire, type, montant, commande, validité | Le solde est la somme des mouvements |
| **Droits d'assistance** | partenaire, date de fin, période d'origine, plafond | Spécifique ; à reproduire dans Odoo en phase 2 (F06) |
| **Promotion / code promo** (`loyalty.program` de type promotion) | type, cible, remise, dates, conditions, limites, règle de cumul | Ventes flash comprises |
| **Opportunité** (`crm.lead`) | partenaire ou contact, type (`financement`, `devis`), référence de la demande du site, statut | Copie des demandes gérées par le site |
| **Accès Cloud** | partenaire, logiciel, état (`a_ouvrir`, `actif`, `grace`, `suspendu`, `ferme`), dates | Simulé par le connecteur PCA de démonstration |

La base de démonstration **ne contient** ni garanties ni demandes de SAV (réduction de
périmètre du 2026-10-14).

---

## 3. Jeu de données de départ

Créé par le remplissage et recréé par chaque réinitialisation :

- **Catalogue** : toutes les marques et modèles de la brochure, avec configurations,
  consommables compatibles, offres de mise à disposition et barèmes de financement.
- **Cas utiles** (FR-015) : client sans droits d'assistance, client aux droits actifs,
  location en cours, location en retard de retour, produit en rupture, produit en
  « délai X jours », bénéficiaire de l'offre de bienvenue, compte en attente.
- **Une quinzaine de médecins et cabinets** fictifs avec historique de commandes, de
  locations et de bons d'achat.
- **Cinq comptes de démonstration** (FR-041) : client avec droits, client sans droits,
  compte en attente, administrateur, support. Leurs identifiants sont documentés dans
  [quickstart.md](quickstart.md).

## 4. Périmètre de la réinitialisation (FR-020)

| Remis à l'état de départ | Conservé |
|---|---|
| Toute la base de démonstration | Contenus (pages, bandeau, FAQ, tutoriels) |
| Comptes clients et d'équipe créés pendant les séances | Contenus produits |
| Demandes de financement et de devis, messages de contact | Paramètres du site et leur historique |
| Boîte de démonstration | Journal des actions (la réinitialisation y est tracée) |
| Pannes simulées | |
| Cinq comptes de démonstration (recréés) | |
