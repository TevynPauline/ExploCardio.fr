# Recherche et décisions techniques — F02 Comptes professionnels

**Date** : 2026-10-16
**Plan** : [plan.md](plan.md)

F02 s'appuie sur le socle de F11 (base du site, Better Auth avec double authentification,
registre des connecteurs, file d'attente, journal des actions) et de F01 (mise en page
publique, formulaires protégés, newsletter à double consentement, limites d'envoi). Ce
document ne traite que les choix propres à F02.

---

## R1. Inscription et confirmation de l'email

- **Décision** : inscription par une action serveur du site qui, dans une même transaction,
  crée l'**utilisateur** (Better Auth, mot de passe haché par lui), le **compte client**
  (statut `email_a_confirmer`), les **adresses** et les **consentements** (CGU et CGV ;
  newsletter si cochée). Better Auth envoie ensuite l'email de confirmation par le connecteur
  emailing (`emailVerification.sendOnSignUp`). Le clic sur le lien confirme l'adresse ; un
  rappel du site fait alors passer le compte à `en_attente` (ou `valide` en validation
  automatique, R3).
- **Connexion avant confirmation** : refusée pour les clients (`requireEmailVerification`),
  avec la possibilité de redemander l'email (3 fois par heure au plus, limites de F01).
- **Lien expiré** : validité de 24 heures ; la page d'erreur propose de renvoyer l'email.
- **Inscription abandonnée** : une tâche quotidienne (file d'attente de F11) supprime les
  comptes restés `email_a_confirmer` depuis 30 jours ; le numéro RPPS redevient disponible.
- **Écarté** : création du compte en deux temps (email puis formulaire) : plus long, et
  SC-004 demande moins de 4 minutes.

## R2. Contrôle des numéros RPPS et SIRET

- **RPPS** : 11 chiffres exactement, espaces ignorés (FR-003). Le format ne prouve pas
  l'identité : la vérification réelle reste celle de l'administrateur.
- **SIRET** : 14 chiffres et clé de Luhn valide ; exception connue de La Poste (SIREN
  356 000 000), dont la clé se calcule sur la somme des chiffres (multiple de 5).
- **Unicité** : un RPPS par compte (contrainte d'unicité en base, qui règle aussi les
  inscriptions simultanées) ; un SIRET peut être partagé par plusieurs comptes (hypothèse
  confirmée de la spec) — la contrainte d'unicité posée par F11 sur le SIRET est retirée.
- **Message en cas de doublon** (FR-031, SC-012) : « Nous ne pouvons pas créer ce compte.
  Si vous avez déjà un compte, connectez-vous ou réinitialisez votre mot de passe ; sinon,
  contactez-nous. » — identique que l'email, le RPPS, ou rien ne soit en cause. Un doublon
  sur le RPPS d'un compte **refusé** est signalé à l'administrateur (cas limite).
- **Écarté** : interroger l'annuaire santé (API RPPS de l'ANS) : service externe non prévu par
  la constitution pour la V1 ; pourra devenir un connecteur plus tard (décision D6).

## R3. Statuts et validation des comptes

- **Machine à états** (FR-010) : `email_a_confirmer → en_attente → valide | refuse` ;
  `valide → suspendu → valide`. Toute autre transition est refusée par le domaine.
- **Validation automatique** (FR-013) : paramètre du back-office `comptes.validation_auto`
  (faux par défaut, hypothèse confirmée). Quand il est vrai, la confirmation de l'email d'un
  compte au numéro bien formé le valide aussitôt, avec les mêmes effets qu'une validation
  manuelle (fiche client, email, journal).
- **Effets d'une validation** (FR-015) : création ou rattachement de la fiche client dans
  Odoo par `clients.creerOuRetrouverPartenaire` (clé d'idempotence = identifiant du compte),
  enregistrement de la référence obtenue (`odooPartnerRef`), email au professionnel,
  ouverture éventuelle du droit au cadeau (R6), journal. Si le connecteur est indisponible, la
  validation est conservée et la création de la fiche est confiée à la file d'attente, qui la
  rejoue jusqu'à réussite (alerte au seuil de F11).
- **Qui valide** : rôles `admin` et `commercial` (décision D5), double authentification
  obligatoire (F11).

## R4. Blocage de la commande

- **Décision** : une seule fonction du domaine, `peutCommander(compte, { miseADispositionExpress })`,
  que F04 et F05 appellent avant tout paiement (SC-001). Seul un compte `valide` peut
  commander ; exception : la mise à disposition express de F05 pour un compte `en_attente`,
  sans expédition avant validation (FR-011). Le message affiché dépend du statut (en cours de
  vérification, refusé, suspendu, email à confirmer).
- F02 la livre avec ses tests unitaires ; le blocage dans le parcours de commande est vérifié
  par F04.

## R5. Connexion, échecs répétés et double authentification

- **Connexion** : page `/connexion` reprise dans la mise en page publique, retour à la page
  consultée (`?retour=`, chemin interne uniquement).
- **Message d'échec unique** (FR-031) : « Email ou mot de passe incorrect. »
- **Échecs répétés** (FR-032, US3-3) : en plus de la limite par adresse IP de Better Auth,
  le site compte les échecs **par compte** (empreinte de l'email) : au 5ᵉ échec en
  15 minutes, le compte est bloqué 15 minutes et son titulaire reçoit un email (décision D2).
  Le message affiché reste le même que l'email existe ou non.
- **Mot de passe oublié** (FR-030) : lien à usage unique valable 1 heure (Better Auth) ; même
  message que l'email soit connu ou non ; à la réinitialisation, les autres sessions sont
  fermées et un email de notification est envoyé (US3-5).
- **Règles de mot de passe** (FR-008) : recommandation de la CNIL (décision D1) : 12
  caractères au moins, avec majuscule, minuscule, chiffre et caractère spécial ; règles
  affichées et cochées en direct pendant la saisie ; vérification identique côté serveur.
- **Double authentification** (FR-033) : facultative pour les clients, par application
  d'authentification et codes de secours (mécanisme de F11), activable dans « Mon compte ›
  Sécurité ». Elle reste obligatoire pour l'équipe.
- **Journal de sécurité** (FR-034, FR-035) : connexions, échecs, blocages, changements de mot
  de passe, d'email et de double authentification, inscrits au journal des actions (actions
  `securite.*`) ; les événements sensibles sont notifiés par email.

## R6. Offre de bienvenue

- **Où est quoi** : l'activation et le texte de l'offre sont des paramètres du back-office
  du site (FR-024, principe VI) ; l'**article offert** et son stock sont dans Odoo. Le
  connecteur Odoo expose donc une nouvelle opération du domaine fidélité, **« Lire l'offre de
  bienvenue »** (article offert et disponibilité), modélisée dans la base de démonstration
  comme un programme de fidélité de type « cadeau de bienvenue » (vocabulaire d'Odoo).
- **Droit au cadeau** : entité « Attribution du cadeau » dans la base du site, avec une
  contrainte d'unicité sur le numéro RPPS ou SIRET (SC-002, y compris en cas de demandes
  simultanées). Le droit s'ouvre quand trois conditions sont réunies : offre active, compte
  validé, abonnement confirmé à la newsletter — à la validation ou plus tard à l'abonnement
  (hypothèse confirmée).
- **Remise** : F02 livre la fonction `cadeauPourCommande(compte)` que F04 appelle à la
  création de la première commande payée : elle ajoute la ligne offerte (« offerte » dans le
  contrat de commande de F11, ligne à 0 €, stock décompté par Odoo) et passe l'attribution à
  `remis` dans la même opération idempotente (clé = attribution). Si l'article est en rupture,
  la ligne est tout de même ajoutée (Odoo l'expédie au retour en stock), l'attribution passe à
  `en_attente_stock`, le bénéficiaire est informé et l'administrateur alerté (FR-025).
- **Annulation avant expédition** : `retablirCadeau(commande)` remet l'attribution à
  `droit_ouvert` (US4-9) ; appelée par F04.
- **Désabonnement** : sans effet sur un droit ouvert ou un cadeau remis (FR-023).

## R7. Mon compte

- **Structure** (FR-036) : `/mon-compte` (tableau de bord : statut, offre de bienvenue,
  contact WhatsApp, rubriques) et sous-pages `informations`, `adresses`, `preferences`,
  `securite`, `donnees` ; les rubriques des autres modules (commandes, factures, locations,
  bons d'achat, droits d'assistance, logiciels Cloud) mènent à une page « Bientôt
  disponible » sans erreur (US5-2), remplacée par F04, F05, F06 et F12.
- **Modifications** (FR-037) : téléphone, nom, adresses → enregistrés puis reportés sur la
  fiche client d'Odoo (`clients.mettreAJourCoordonnees`, par la file d'attente si le
  connecteur est indisponible) ; email → Better Auth `changeEmail` avec confirmation de la
  nouvelle adresse et notification de l'ancienne ; RPPS ou SIRET → **demande de changement**
  soumise à l'administrateur, jamais appliquée directement.
- **Accès** : réservé aux clients connectés ; un compte non validé y accède aussi (statut
  affiché, commande bloquée).

## R8. Droits sur les données (RGPD)

- **Export** (FR-039, SC-010) : en libre-service, après nouvelle saisie du mot de passe ; un
  fichier **JSON** aux noms de champs en français (identité, compte, adresses, consentements,
  historique de sécurité, inscriptions newsletter, et ce que le connecteur Odoo renvoie de la
  situation du client : commandes, factures, locations), téléchargé immédiatement (décision
  D4). La demande est journalisée.
- **Suppression** (FR-040) : après nouvelle saisie du mot de passe et confirmation ; refusée
  avec explication si une location est en cours ou une facture impayée (lecture de la
  situation par le connecteur, US6-4). Sinon : sessions fermées, utilisateur et compte
  anonymisés (email remplacé par une adresse inutilisable, identité effacée, statut
  `supprime`), consentements conservés anonymisés, retrait de la newsletter
  (`emailing.mettreAJourContact`), et fiche client **archivée** dans Odoo par une nouvelle
  opération du domaine clients, **« Archiver un partenaire »** (Odoo conserve les factures
  10 ans, obligation légale). Email de confirmation envoyé avant l'anonymisation.
- **Délai** : immédiat en libre-service ; une demande reçue autrement (courrier, email) est
  saisie par l'administrateur et traitée dans le mois.

## R9. Écrans d'administration

- `/admin/comptes` : listes par statut (en attente d'abord), recherche, fiche d'un compte
  (identité, RPPS ou SIRET avec lien vers l'annuaire santé public pour vérification manuelle,
  cabinet, date), actions valider, refuser (motif obligatoire), suspendre, rétablir ;
  demandes de changement de RPPS ou SIRET ; signalements (réinscription d'un refusé).
- `/admin/comptes/reglages` : validation automatique, offre de bienvenue (active, texte),
  liste des spécialités.
- Journal de chaque décision (FR-016). F13 reprendra ces écrans.

## R10. Emails de F02

Tous rendus avec le gabarit de F11 et envoyés par le connecteur emailing (boîte de
démonstration en phase 1) : confirmation d'adresse, compte validé, compte refusé, compte
suspendu, compte rétabli, mot de passe réinitialisé, compte bloqué après échecs,
changement d'email (nouvelle et ancienne adresse), double authentification activée ou
désactivée, cadeau en attente de stock, suppression du compte confirmée. Notifications
d'équipe : nouveau compte à valider, réinscription d'un compte refusé, demande de changement
de numéro, cadeau en rupture.
