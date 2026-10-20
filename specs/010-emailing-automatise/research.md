# Recherche et décisions techniques — F10 Emailing automatisé

Point de départ : F11 a livré le connecteur emailing (mode démonstration : boîte de
démonstration `MessageDemonstration`, rejets simulés pour `@rejet.demo.explocardio.test` ;
mode réel non livré) et la file d'attente pg-boss. F01 et F02 ont livré la newsletter à double
consentement (`InscriptionNewsletter`, `Consentement`) et la page « Mon compte → Préférences »
(newsletter seule). F02 à F12 envoient déjà environ 65 emails, rendus avec React Email dans le
gabarit commun (`src/emails/Gabarit.tsx`, bloc de contact de F09), presque tous par la même
fonction `envoyer(destinataire, email, declencheur, cle)` de
`src/domaine/commande/notifications.ts` ; quelques appels directs au connecteur subsistent
(`src/lib/auth.ts`, `src/domaine/newsletter.ts`, `src/domaine/comptes/securite.ts`). F06 envoie
déjà les rappels de fin des droits et d'expiration des bons ; F04 un rappel de virement ; F05
l'email « prélèvement refusé ». **Aucune nouvelle dépendance.**

## R1. Un point d'envoi unique (FR-002, FR-007, FR-035)

- **Decision** : module `src/domaine/emailing/` avec une seule fonction publique d'envoi :
  `demanderEnvoi({ modele, destinataire | compteId, variables, cle, declencheur, programmeLe? })`.
  Elle lit la **famille** du modèle dans un catalogue (`src/domaine/emailing/catalogue.ts`),
  applique les règles (R3), crée une ligne `Envoi` unique par clé (idempotence : un même
  événement signalé deux fois = un seul email) et, pour un transactionnel, tente l'envoi
  aussitôt. `envoyer()` de F04 devient un simple relais : aucun module n'est réécrit, les
  derniers appels directs sont remplacés, et un test interdit tout autre appel à
  `registre.emailing()` hors de `src/domaine/emailing/`.
- Les notifications d'équipe (email, SMS) passent par le même module et sont tracées
  (famille « équipe », jamais filtrées).
- **Alternatives** : une tâche pg-boss par email (rejeté : l'état est caché dans le schéma de
  pg-boss, difficile à suivre et à annuler) ; garder l'envoi direct dans chaque module
  (rejeté : préférences et trace dispersées).

## R2. La table `Envoi` sert de trace et de file (FR-013, FR-034, SC-004, SC-012)

- **Decision** : chaque envoi est une ligne (`programme` → `envoye` → `remis` / `rejete`, ou
  `annule` / `bloque`). Une tâche pg-boss `emails-envoi` (toutes les minutes) relève les envois
  dus, **réévalue les règles au moment d'envoyer** (désinscription ou préférence changée
  depuis, objet disparu : panier commandé, droits prolongés…) puis appelle le connecteur avec
  la clé de l'envoi (idempotente des deux côtés). Panne du connecteur : l'envoi reste
  `programme` avec un nombre d'essais et une prochaine tentative espacée ; au-delà de 30
  minutes, alerte à l'équipe (une seule).
- Rendu : les emails de service et commerciaux sont rendus **au moment de l'envoi** (prix et
  disponibilités du jour, FR-019) à partir de variables enregistrées (jamais de secret). Les
  transactionnels contenant un lien secret (mot de passe, confirmation d'adresse) sont rendus
  tout de suite ; le rendu n'est conservé que le temps de l'envoi, puis effacé.
- **Alternatives** : file en mémoire (rejeté : perdue au redémarrage).

## R3. Décision d'envoi selon la famille (FR-001, FR-003, FR-009 à FR-013, FR-031 à FR-033)

| Règle | Transactionnel | Service | Commercial | Équipe |
|---|---|---|---|---|
| Compte suspendu, refusé ou supprimé | envoyé (engagements en cours) | non | non | — |
| Préférence du type désactivée | ignorée | non | — | — |
| Abonnement newsletter confirmé | ignoré | ignoré | **exigé** | — |
| Adresse suspendue (rejets) | tenté, échec signalé | non | non | — |
| Fréquence maximale (2 / 7 jours) | jamais compté ni retardé | compté, reporté | compté, reporté | — |
| Plages (jours ouvrés 8 h–19 h) | non | oui | oui | non |
| Lien « préférences » en pied | non | oui (« pourquoi vous recevez cet email ») | oui + désinscription | non |
| Promotion dans le texte | interdite | interdite hors objet | — | — |

Fonction pure `decider(envoi, contexte, maintenant)` → `envoyer` | `reporter(date)` |
`annuler(motif)` | `bloquer(motif)`, entièrement couverte par les tests unitaires.

## R4. Textes modifiables sans développeur (FR-025, FR-026, SC-009) — D2

- **Decision** : chaque modèle du catalogue déclare sa famille, son libellé, ses **variables**
  (nom, description, exemple, obligatoire), et ses textes par défaut : objet, titre, aperçu et
  paragraphes en texte simple avec `{{variable}}` et `**gras**`. Les éléments structurés
  (tableau des lignes, RIB, bouton d'action, bloc de suivi du colis) restent des composants
  fixes placés par le modèle. Les modèles React Email existants lisent leurs textes par
  `texte(modele, "intro", variables)` au lieu de chaînes écrites en dur : la mise en page ne
  change pas.
- `ModeleEmail` (base du site) garde, par modèle, la version publiée et un brouillon ; sans
  ligne, les textes par défaut s'appliquent. Publication refusée si un texte utilise une
  variable inconnue ou retire une variable obligatoire ; journal des modifications.
- Variable manquante à l'envoi (nom vide, montant absent) : pas d'envoi, envoi `bloque`,
  alerte à l'équipe (cas limite de la spec).
- Aperçu avec les exemples des variables ; email de test vers l'adresse de l'administrateur
  (boîte de démonstration en phase 1).
- **Alternatives** : modèles dans l'outil d'envoi (rejeté : charte hors du site, impossible à
  tester en démonstration, dépendance forte au fournisseur) ; éditeur libre HTML (rejeté :
  charte et accessibilité non garanties).

## R5. Préférences, consentement et liens sans connexion (FR-014, FR-022 à FR-024) — D8

- **Decision** : `PreferencesEmail` par adresse (compte ou abonné sans compte) : un booléen
  par type de service (réapprovisionnement, panier abandonné, alerte de bons, alerte de
  droits), tous actifs par défaut. Chaque changement crée une ligne `Consentement` (objet
  `email:<type>` ou `newsletter`, état, date, origine : `mon_compte`, `lien_email`,
  `desinscription_un_clic`, `equipe`), comme la newsletter aujourd'hui.
- Lien signé : `/preferences/<jeton>`, jeton = adresse + signature HMAC-SHA256 (clé dérivée
  d'`AUTH_SECRET`), sans expiration ; la page n'affiche que les réglages de cette adresse.
  Désinscription en un clic : `POST /api/emails/desinscription?j=<jeton>&objet=…` (RFC 8058),
  annoncée par l'en-tête `List-Unsubscribe` en mode réel.
- « Mon compte → Préférences » : la page existante est complétée (types facultatifs, et
  liste des emails toujours envoyés avec leur justification).
- Désinscription reçue par réponse à un email : l'équipe l'enregistre depuis le suivi des
  envois (origine `equipe`).

## R6. Relance de réapprovisionnement (FR-015 à FR-017, SC-001, SC-005) — D5

- **Decision** : tâche quotidienne `emails-scenarios` (8 h 30) : pour chaque compte validé,
  historique des commandes lu par le connecteur Odoo (`listerCommandes`, `lireCommande`,
  18 derniers mois), consommables seulement (famille du catalogue). Fonction pure
  `rythme(dates)` : au moins 3 commandes ; intervalle moyen ; irrégulier si un intervalle
  s'écarte de plus de 50 % de la moyenne ; date prévue = dernière commande + moyenne.
  Clé `reappro:<compte>:<article>:<date de la dernière commande>` : une seule relance par
  échéance ; une nouvelle commande change la clé et recalcule la date (SC-005 par
  construction). Relance si la date prévue est dans moins de 7 jours (réglable) et n'est pas
  dépassée de plus de 7 jours. Regroupement par compte des articles dus dans la même fenêtre.
- Contenu : article, prix HT du jour, quantité habituelle, gain estimé en bons et droits
  (`estimerGains` de F06), bouton « Commander de nouveau » →
  `/panier/recommander?ref=…&quantite=…` (connexion exigée, ajout au panier, arrivée sur le
  panier).
- SC-001 : commande tous les 60 jours → date prévue J+60, envoi à J+53 (fenêtre 5–9 jours
  respectée avec la tâche quotidienne).

## R7. Alertes de bons et de droits (US5) — D3

- **Decision** : les rappels quotidiens de F06 (`src/domaine/fidelite/rappels.ts`) restent
  le déclencheur et gardent leurs délais (paramètres de F06) ; ils passent par
  `demanderEnvoi` avec les modèles `rappel_fin_droits` et `rappel_expiration_bons`, désormais
  de famille « service ». À l'envoi, l'objet est revérifié (droits prolongés, bons utilisés →
  annulé).

## R8. Panier abandonné (US6, FR-018, FR-019)

- **Decision** : la tâche horaire relève les paniers de **comptes** non vides, non modifiés
  depuis 24 h (réglable), sans commande depuis. Clé `panier:<panier>:<modifieLe>` : un seul
  rappel par état du panier. Rendu à l'envoi avec prix et disponibilités du moment
  (devis d'Odoo), sans aucune promesse de prix. Revérifié à l'envoi (panier vidé ou commandé →
  annulé). Lien vers `/panier`.

## R9. Relances d'impayés (US7, FR-020, FR-021) — D4

- **Decision** : nouvelle lecture du connecteur Odoo `lireNiveauxRelance()` (équivalent des
  niveaux de relance des factures d'Odoo ; en démonstration, table `NiveauRelance` de la base
  fictive, 3 niveaux : J-5, J-2, J-1, le dernier « avec conséquence »). Créances suivies :
  commandes par virement en attente (échéance = annulation, F04) et locations ou abonnements
  logiciels en impayé (date de suspension, F05 et F12). La tâche quotidienne envoie le niveau
  atteint le plus élevé non encore envoyé (clé `impaye:<objet>:<niveau>`) ; un niveau dépassé
  n'est pas rattrapé ; arrêt dès que le paiement est enregistré (revérifié à l'envoi).
  Famille transactionnelle. Le rappel de virement de F04 (`virement.rappel_jours`) est
  remplacé par ces niveaux.
- **Alternatives** : délais au back-office du site (rejeté : la spec et le principe VI les
  placent dans Odoo).

## R10. Fréquence et plages (FR-031, FR-032) — D6

- **Decision** : au moment de programmer puis d'envoyer, compter les envois facultatifs et
  commerciaux `envoye`/`remis` des 7 derniers jours pour l'adresse ; au-delà de 2, reporter à
  la date où la fenêtre se libère, puis à la prochaine plage autorisée (jours ouvrés, 8 h–19 h,
  jours fériés du calendrier existant). Un envoi reporté plus de 7 jours est annulé (motif
  « fréquence »). Paramètres : `emailing.frequence_max`, `emailing.frequence_jours`,
  `emailing.plage_debut`, `emailing.plage_fin`.

## R11. Remise, rejets, ouvertures et conversions (FR-033, FR-036) — D9, D10

- **Decision** : le contrat du connecteur passe de `lireEtatRemise` à `lireSuivi(envoiId)` →
  `{ etat, ouvertLe, motifRejet, rejetDefinitif }`. Tâche `emails-suivi` (toutes les 15
  minutes) pour les envois des 3 derniers jours. En démonstration : « ouvert » quand le message
  est consulté dans la boîte de démonstration ; rejet définitif pour les adresses
  `@rejet.demo.explocardio.test`. En F14, Brevo pourra pousser ces états par webhook
  (même mise à jour).
- `AdresseRejetee` : rejet définitif ou 3 rejets temporaires → suspension des envois
  facultatifs et commerciaux, alerte d'équipe ; transactionnel rejeté → alerte (US1 #7).
- Conversions : commande du site (`CommandeSite`) du même compte dans les 14 jours suivant
  l'envoi (pour une relance de consommable : contenant l'article).

## R12. Gabarit et présentation (FR-025, FR-027, FR-028, SC-006)

- **Decision** : le gabarit reçoit la famille : pied « Pourquoi vous recevez cet email » +
  « Gérer mes préférences » (service), + « Se désinscrire » (commercial) ; mentions légales
  (raison sociale, adresse, paramètres de F01) ; `color-scheme` clair et sombre ; texte de
  remplacement du logo ; version **texte** générée par React Email et transmise au
  connecteur ; largeur 600 px fluide. Contrôle automatique sur tous les modèles du catalogue
  (rendus avec leurs exemples) : logo avec `alt`, aucun texte en pastel, liens explicites,
  aucune variable non remplacée, aucun motif de donnée interdite (carte, mot de passe).

## R13. Outil réel (FR-040, FR-043) — D1

- **Decision** : **Brevo** pour F14 : API transactionnelle (idempotence par clé, en-têtes
  personnalisés dont `List-Unsubscribe`), SMS pour les alertes d'équipe, états de remise et
  d'ouverture, hébergement dans l'Union européenne, entreprise française. Les campagnes sont
  envoyées par le site, email par email, pour que préférences, fréquence et plages restent
  appliquées par le site ; la liste de contacts de Brevo n'est qu'un reflet
  (`mettreAJourContact`). Seules l'adresse, l'objet et le rendu sont transmis (FR-039).
- **Alternatives** : Mailjet (comparable, groupe Sinch) ; Scaleway Transactional Email
  (transactionnel seul, pas de SMS) ; Amazon SES (hébergeur américain, configuration plus
  lourde).
