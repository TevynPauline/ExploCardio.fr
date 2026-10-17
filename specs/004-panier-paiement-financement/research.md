# Recherche et décisions techniques — F04 Panier, paiement et financement

**Date** : 2026-10-17
**Plan** : [plan.md](plan.md)

F04 s'appuie sur F11 (connecteurs Odoo et Stripe de démonstration, page de paiement de
démonstration, traitement unique des événements de paiement, file d'attente, journal), F02
(comptes, `peutCommander`, cadeau de bienvenue) et F03 (panier minimal, prix, disponibilité,
mensualités). Ce document ne traite que les choix propres à F04.

---

## R1. Qui calcule les montants

- **Décision** : Odoo calcule (principe III) : une nouvelle opération du connecteur,
  **« Calculer un devis »**, reçoit le client (ou aucun pour un visiteur), les lignes, le
  code promo, les bons d'achat demandés et le mode de livraison ; elle renvoie le détail que
  le panier et le récapitulatif affichent : prix appliqués (liste de prix, dégressifs),
  remises automatiques, remise du code promo (ou le motif du refus), bons d'achat retenus,
  frais de port (forfait, franco, tarifs propres aux équipements volumineux), TVA et totaux,
  ainsi que les montants mensuels des mises à disposition. La même opération sert au
  panier, au récapitulatif et à la création de la commande : les montants affichés sont
  ceux qui seront facturés.
- **Démonstration** : la base fictive applique les mêmes règles (listes de prix et paliers
  de F03, promotions et codes promo de F11, nouveaux paramètres de livraison).
- **Écarté** : calculer les totaux dans le site (deux sources de vérité pour les prix).

## R2. Panier complet (suite du panier minimal de F03)

- Lignes modifiables (quantité, suppression), code promo et choix d'utiliser les bons
  d'achat enregistrés sur le panier ; deux blocs « Paiement unique » et « Abonnement
  mensuel » (FR-001 à FR-004).
- **Fusion à la connexion** (FR-005) : à la connexion, le panier du cookie est versé dans
  celui du compte (quantités additionnées par référence et formule), puis supprimé ; un
  crochet sur la connexion de Better Auth (comme le blocage de F02).
- **Changements** (FR-006) : à chaque affichage, prix et disponibilité sont relus ; une ligne
  dont le prix a changé depuis l'ajout est signalée ; une ligne « indisponible » est marquée et
  bloque le passage au paiement tant qu'elle reste au panier.
- **Bons d'achat** : choix affiché seulement quand F06 est livré (hypothèse confirmée de la
  spec) ; le calcul est déjà prévu par le devis.

## R3. Tunnel de commande

- **Commande du site** (`CommandeSite`) : créée à l'entrée du tunnel, elle garde l'étape
  atteinte et les saisies (adresses, livraison, moyen de paiement) pour reprendre là où le
  client s'est arrêté (US2-9) ; elle porte une **référence** stable (`EC-2026-000123`) et la
  **clé d'idempotence** transmise à Stripe et à Odoo.
- **Accès** (FR-007, SC-009) : `peutCommander` de F02 avant chaque étape et avant le
  paiement ; panier vide → retour au catalogue ; compte suspendu entre-temps → refus.
- **Étapes** : `/commande/adresses`, `/livraison`, `/paiement`, `/recapitulatif`,
  `/confirmation/[ref]` ; repère de progression (`<ol>` avec `aria-current="step"`),
  retour sans perte de saisie ; adresse de livraison en France métropolitaine (règle de F02).
- **Livraison** (FR-010, FR-011, FR-046) : modes lus dans Odoo (standard, express) avec
  forfait, délai, franco et disponibilité ; express proposé seulement si tous les articles
  sont en stock et avant l'**heure limite**, paramètre du site (FR-040).
- **Juste avant le paiement** (FR-024) : devis recalculé et disponibilité revérifiée ; en cas
  de rupture ou de quantité insuffisante, retour au panier avec l'alerte.
- **Cadeau de bienvenue** (FR-014) : `cadeauPourCommande` de F02 ajoute la ligne à 0 € au
  récapitulatif ; `confirmerCadeauRemis` à la confirmation ; `retablirCadeau` à l'annulation.

## R4. Paiement par carte et cohérence (US2, US3)

- **Flux** : récapitulatif validé (CGV cochées) → `stripe.ouvrirSessionPaiement` avec la
  référence et la clé de la commande du site → page de paiement (Stripe ou démonstration) →
  événement « paiement réussi » reçu par le gestionnaire de F11 → **effet F04** : création de
  la commande dans Odoo (`creerCommandePayee`, clé = commande du site), cadeau, règles de
  fidélité, email, panier vidé, commande du site marquée « payée » avec la référence d'Odoo.
- **Une seule commande par paiement** (FR-022, SC-002) : événement traité une seule fois (F11)
  et création idempotente dans Odoo (même clé → même commande) ; confirmation tardive après
  fermeture de la page : traitée de la même façon ; la page de retour affiche l'état réel
  (« paiement en cours de confirmation » tant que l'événement n'est pas arrivé).
- **Jamais deux débits** (FR-023) : une seule session par commande du site, réutilisée si
  le client rafraîchit ou double-clique (clé d'idempotence côté Stripe).
- **Refus** (FR-021, SC-007) : retour au paiement avec le motif ; panier et saisies
  conservés ; nouvelle tentative = nouvelle session avec une nouvelle clé de tentative.
- **Paiement sans commande** (FR-025) : si Odoo refuse ou est injoignable, l'effet échoue,
  l'événement est rejoué par la file d'attente (F11) ; après 3 échecs ou 15 minutes, alerte à
  l'administrateur ; la commande du site garde l'état « payée, à enregistrer ».
- **Aucune donnée de carte** (FR-016, SC-008) : le site ne reçoit que des références.

## R5. Mise à disposition mensuelle et panier mixte (US5)

- **Panier mixte** (FR-020) : une seule validation, deux paiements successifs : d'abord la
  session de paiement de l'achat, puis, au retour, la session d'abonnement (premier mois +
  autorisation du prélèvement mensuel, carte ou SEPA) pour l'ensemble des mises à
  disposition de la commande. Chaque partie a son état ; si la seconde échoue, le client la
  reprend depuis « Mon compte › Commandes » sans repayer la première (US5-4).
- **Effet « paiement réussi » d'un abonnement** : `location.creerAbonnement` pour chaque
  équipement (réserve le matériel du parc) et facture du premier mois (Odoo).
- **Échéances** (FR-029) : effet « échéance payée » → facture d'Odoo et email ; les impayés
  relèvent de F05.
- **Abonnement logiciel Cloud (FR-049)** : souscrit depuis « Mes logiciels Cloud », page de
  F12 ; **proposé avec F12** (décision D3), F04 fournissant le même mécanisme de session
  d'abonnement.

## R6. Virement (US4)

- **Création** : Odoo enregistre une commande « en attente de paiement » et réserve le stock
  pour le délai réglé dans Odoo (7 jours par défaut) — nouvelle opération **« Créer une
  commande à régler par virement »**. Le site affiche le RIB (paramètres du site :
  titulaire, IBAN, BIC — fictifs en démonstration), le montant TTC et la référence à rappeler.
- **Réception** : enregistrée dans Odoo par l'équipe ; en démonstration, depuis l'écran de
  démonstration (« Virement reçu », montant reçu). Montant différent → commande laissée en
  attente et alerte à l'administrateur.
- **Rappel et annulation** : une tâche quotidienne du site lit les commandes en attente :
  rappel 2 jours avant l'échéance ; à l'échéance, Odoo annule et libère le stock (en
  démonstration, la tâche appelle l'annulation de la base fictive) ; email au client.
- Pas de virement pour un abonnement (FR-019).

## R7. Suivi, notifications et remboursements (US7, US8)

- **Statuts** (FR-027) : le contrat d'Odoo passe à `en_attente_paiement`, `payee`,
  `en_preparation`, `expediee`, `livree`, `annulee`, `remboursee_partiellement`,
  `remboursee` ; la commande porte transporteur et numéro de suivi.
- **Notifications** (FR-032) : une tâche (toutes les 5 minutes) lit les commandes modifiées
  depuis le dernier passage (nouvelle opération **« Lister les changements de commandes »**)
  et envoie les emails d'expédition, de remboursement et d'annulation, une seule fois par
  changement.
- **Remboursements** (FR-030, FR-031) : décidé dans Odoo → la même tâche lit les
  remboursements « à exécuter » et appelle `stripe.rembourser` (clé = remboursement), puis le
  confirme à Odoo, qui émet l'avoir ; fait directement dans Stripe → l'événement
  « remboursement » est reporté à Odoo (nouvelle opération **« Enregistrer un
  remboursement »**). Commande payée par virement → remboursement par virement, enregistré
  dans Odoo par l'équipe.
- **Factures et avoirs** : PDF lus dans Odoo (`factures.obtenirPdf`) et servis à leur seul
  titulaire, jamais copiés sur le site (FR-028).

## R8. Financement longue durée (US6, US8)

- **Demande** (FR-033 à FR-037) : formulaire depuis une fiche ou le panier, équipements et
  coordonnées préremplis, durée parmi celles du barème d'Odoo, mensualité indicative
  (mêmes règles que F03, montant forcé du client compris) ; enregistrée dans la base du site
  (`DemandeFinancement` de F11), copiée en opportunité dans Odoo
  (`opportunites.copierDemande`, par la file d'attente si Odoo est injoignable), email au
  client et notification à l'équipe ; depuis le panier, les équipements concernés quittent
  le panier (US6-5) ; demande en double signalée.
- Ouverte à tout compte connecté, validé ou en attente (hypothèse confirmée) ; aucun nom
  d'organisme de financement dans les écrans et emails (FR-037, SC-011).
- **Back-office** : statut (reçue, en étude, accordée, refusée), notes internes, journal,
  email au client à chaque changement ; « Créer la commande financée » → `creerCommandePayee`
  avec le mode `financement` (aucune facture adressée au client, FR-047).

## R9. Démonstration

- L'écran **Démonstration → Paiements** de F11 gagne : « Virement reçu », « Marquer
  expédiée » (transporteur, suivi), « Marquer livrée », « Rembourser (Odoo) » ; la page de
  paiement de démonstration garde « confirmation tardive » et « confirmation répétée ».

## R10. Accessibilité et performance

- Tunnel utilisable au clavier seul (SC-012), erreurs reliées aux champs, saisies
  conservées ; tests axe-core sur chaque étape ; passage du panier à la confirmation en moins
  de 2 minutes (SC-004), vérifié par un parcours.
