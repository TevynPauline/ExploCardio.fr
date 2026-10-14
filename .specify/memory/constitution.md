# Constitution ExploCardio.fr

Les onze principes ci-dessous sont tous non négociables. Les mots DOIT, NE DOIT PAS et
INTERDIT expriment des obligations vérifiables.

## Core Principles

### I. Spécialisation avant exhaustivité

ExploCardio.fr est un site B2B hyper-spécialisé dans les explorations fonctionnelles
cardiaques hors imagerie : Holter ECG, Holter tensionnel / MAPA, épreuve et écho d'effort,
ECG de repos, accessoires et consommables.

- Toute fonctionnalité DOIT servir un cardiologue libéral pressé.
- Les fonctionnalités de catalogue généraliste sont refusées.
- Tout produit ou service hors de ce périmètre NE DOIT PAS entrer au catalogue.

**Justification** : la valeur du site tient à sa spécialisation. Chaque ajout généraliste
dilue le positionnement et ralentit le médecin.

### II. Simplicité et transparence

- Un médecin DOIT trouver un produit ou un service en 3 clics maximum depuis l'accueil.
- Les prix DOIVENT être affichés HT dès le départ.
- Le « prix sur demande » est INTERDIT pour les modèles standards.
- Chaque produit DOIT proposer des configurations standard prédéfinies plutôt que du
  sur-mesure.

**Justification** : le médecin décide vite s'il voit le prix et le chemin. Le sur-mesure
et les prix masqués imposent un échange commercial que le site veut éviter.

### III. Trois phases et des connecteurs

Le projet avance en trois phases.

- **Phase 1 — Site en démonstration** : tout le site est construit et critiqué sans aucun
  service externe branché. Chaque service externe (Odoo, Stripe, plateforme Cloud PCA,
  emailing) DOIT être utilisé uniquement à travers un connecteur. En
  phase 1, chaque connecteur fonctionne en mode démonstration : il lit et écrit dans une
  mini base de données fictive, ou simule le service.
- **Phase 2 — Branchement** : chaque connecteur reçoit son mode réel. Le passage du mode
  démonstration au mode réel DOIT se faire par configuration, connecteur par connecteur,
  sans modifier les pages ni les composants.
- **Phase 3 — Banc de tests et recette** : tests de bout en bout sur les services réels en
  environnement de test (copie de test d'Odoo, Stripe en mode test). La mise en ligne N'A
  LIEU que si tous les tests passent.

Règles :

- Aucune page ni aucun composant NE DOIT appeler un service externe directement.
- En démonstration comme en réel, un connecteur DOIT renvoyer les mêmes données et les mêmes
  erreurs.
- Aucune donnée fictive NE DOIT JAMAIS être envoyée dans Odoo ni dans un autre service réel.
- À terme, Odoo est la source de vérité pour les produits, prix, stocks, parc de location,
  clients, commandes, factures, bons d'achat, droits d'assistance, numéros de série et
  garanties. Le site NE DOIT dupliquer ni ces données ni leurs règles de gestion.
- La base fictive DOIT reprendre le vocabulaire et les champs d'Odoo, et les références
  produits réelles de la brochure.
- Le back-office du site NE DOIT gérer que les contenus, les paramètres, la validation des
  comptes et les demandes (financement et devis). Ces données-là sont réelles dès la
  phase 1.
- En phase 1, le connecteur Odoo de démonstration applique les mêmes règles qu'Odoo (prix,
  remises, bons d'achat, droits d'assistance) à partir des paramètres stockés dans la base
  fictive. Ce n'est pas une duplication : ce code ne sert qu'en mode démonstration ; en mode
  réel, c'est Odoo qui calcule.
- La hotline est une ligne WhatsApp Business, qui n'est pas un service connecté : le site
  affiche son numéro, paramètre du back-office, avec un bouton « Appeler » et un bouton
  « Écrire sur WhatsApp ». Les notifications d'équipe (email et SMS) passent par le
  connecteur emailing.
- Le SAV (pannes, garanties, réparations, enregistrement des numéros de série) et la prise
  de rendez-vous ne sont pas gérés par le site. Ils relèveront d'une application SAV
  externe, hors du périmètre actuel.

**Justification** : un site entièrement démontrable sans aucun service branché peut être
critiqué et corrigé tôt, sans risque ni coût. Les connecteurs rendent le branchement
mécanique et évitent toute double gestion des données avec Odoo.

### IV. Aucune donnée patient sur le site

- Le site NE DOIT collecter, stocker ni transmettre aucune donnée de santé de patient.
- Les données médicales restent exclusivement sur la plateforme Cloud hébergée HDS du
  partenaire (Nelson / Patient Care Anywhere, « PCA »).
- Le site gère uniquement les comptes des médecins et l'ouverture ou la fermeture de leurs
  droits d'accès.

**Justification** : sans donnée de santé, le site reste hors du champ de l'hébergement HDS.
Toute entorse changerait la nature réglementaire du projet.

### V. Sécurité et conformité

- Le site DOIT être conforme au RGPD : consentements, droit d'accès et de suppression,
  registre des traitements.
- Aucune donnée de carte bancaire NE DOIT transiter par nos serveurs ni y être stockée :
  tout paiement passe par Stripe.
- Les factures DOIVENT être émises par Odoo. En phase 1, les factures fictives DOIVENT
  porter la mention « FICTIVE ».
- Les secrets (clés API Odoo, Stripe, PCA, emailing) NE DOIVENT JAMAIS figurer dans le
  code.
- L'authentification DOIT être sécurisée et les actions sensibles DOIVENT être journalisées.
- En phase 1, le site de démonstration DOIT être protégé par mot de passe, non indexé par
  les moteurs de recherche, et afficher un bandeau « Version de démonstration ».

**Justification** : le site encaisse des professionnels de santé et s'appuie sur des
factures légales. Une faille, une non-conformité ou une démonstration prise pour le vrai
site engagerait directement la responsabilité de l'entreprise.

### VI. Règles commerciales paramétrables, au bon endroit

- Aucune règle commerciale NE DOIT être codée en dur.
- Tout ce qui a une valeur en euros ou un effet comptable DOIT se paramétrer dans Odoo (base
  fictive en phase 1) : prix d'achat et de mise à disposition (premier mois, mois suivants,
  kit d'accessoires), frais de port, remises, promotions, codes promo et ventes flash, taux
  et seuils des bons d'achat, seuil et durée des droits d'assistance, durées de garantie.
- Le back-office du site NE DOIT paramétrer que le fonctionnement du site : textes et
  bandeau, activation de l'offre de bienvenue, heure limite de commande pour une livraison
  le lendemain, numéro et horaires de la ligne WhatsApp.

**Justification** : l'offre commerciale évoluera plus vite que le code. Chaque règle a un
seul endroit où elle se règle : Odoo pour tout ce qui touche à l'argent et à la
comptabilité, le back-office pour le fonctionnement du site.

### VII. Identité visuelle ExploCardio.fr

- `docs/brand/design-system.md` est la source de vérité visuelle : toute interface DOIT
  s'y conformer.
- Couleurs, typographies, rayons et espacements DOIVENT provenir exclusivement des tokens
  de `docs/brand/tokens.css` (ou `tokens.json`). Aucune valeur hexadécimale ni police NE
  DOIT être codée en dur dans les composants.
- Le logo DOIT toujours être intégré depuis `docs/brand/assets/*.svg`. Il NE DOIT JAMAIS
  être recomposé en texte, déformé ni recoloré.
- Le nom s'écrit toujours « ExploCardio.fr ».
- Police unique : Inter, graisses 300, 400, 500 et 600. Titres en Light, sous-titres en
  Semibold.
- Fond de page ivoire (`--ec-bg`), cartes blanches bordées (`--ec-line`).
- Une seule couleur d'action : `--ec-deep-strong` (#3F7068).
- Les pastels (#9CC5BE, #7FB0A8, #C7D8E6) sont décoratifs : ils NE DOIVENT JAMAIS servir
  pour du texte.
- INTERDITS : cœur, tracé ECG, pictogrammes médicaux clichés, dégradés vifs, ombres
  lourdes, photos de stock génériques.
- Ergonomie inspirée d'apple.com/fr : navigation fixe en haut, méga-menus sobres, beaucoup
  d'air, sélecteurs d'options à onglets ou pilules sur les fiches produit.
- Le site DOIT être responsive, conçu mobile-first.

**Justification** : l'identité « Les trois temps » a été validée. La cohérence visuelle
porte la crédibilité institutionnelle auprès des cardiologues.

### VIII. Accessibilité

Le niveau WCAG 2.2 AA est obligatoire.

- Contraste ≥ 4,5:1 pour le texte et ≥ 3:1 pour les composants.
- Focus visible sur tous les éléments interactifs.
- Cibles tactiles de 44 px minimum.
- `prefers-reduced-motion` DOIT être respecté.

**Justification** : l'accessibilité est une obligation de qualité et de conformité, et
elle profite à tous les utilisateurs, notamment en mobilité.

### IX. Ton éditorial

- Le ton DOIT être institutionnel, sobre, rassurant et concret.
- Vouvoiement, phrases courtes, pas de jargon marketing.
- Public visé : cardiologues libéraux, cabinets et centres.

**Justification** : le site s'adresse à des médecins. Un ton commercial appuyé nuirait à
la confiance.

### X. Livraison par petits incréments testables

- Chaque fonctionnalité DOIT être spécifiée, testée et livrable seule.
- Chaque spec DOIT comporter des critères d'acceptation vérifiables, marqués [Phase 1]
  s'ils se vérifient avec les connecteurs de démonstration, ou [Phase 3] s'ils nécessitent
  les vrais services.
- Chaque connecteur DOIT avoir des tests de contrat communs à ses deux modes.
- La phase 3 DOIT couvrir tous les parcours, les cas limites, la sécurité et la charge.

**Justification** : des incréments indépendants limitent le risque. Le marquage par phase
dit ce qui peut être validé tôt et ce qui attend les vrais services ; les tests de contrat
garantissent que la démonstration ne ment pas.

### XI. Langue et périmètre

- Le site est en français uniquement.
- Les clients sont des professionnels de santé installés en France métropolitaine.
- Aucune fonctionnalité d'internationalisation, de multi-devise ou de vente hors de ce
  périmètre NE DOIT être développée.

**Justification** : un périmètre unique simplifie la fiscalité, la facturation, la
logistique et le contenu.

## Connecteurs et services externes

Cette section rassemble les contraintes d'architecture qui découlent des principes.

- **Services externes connectés** : Odoo (gestion), Stripe (paiement), PCA (ouverture et
  fermeture des droits d'accès des médecins) et un outil d'emailing (emails et SMS). Chacun passe par son connecteur (principe III). Toute autre intégration
  externe exige un amendement.
- **Contact WhatsApp** : hors du site. Le numéro de la ligne WhatsApp Business et ses
  horaires sont des paramètres du back-office.
- **SAV et rendez-vous** : hors du site pour l'instant (application SAV externe à venir).
- **Données transmises** : un service externe NE DOIT recevoir que les données strictement
  nécessaires, jamais de donnée de patient (principe IV) ni de donnée de carte (principe
  V), et DOIT respecter le RGPD.
- **Données de gestion** : produits, prix, stocks, parc de location, clients, commandes,
  factures, bons d'achat, droits d'assistance, numéros de série et garanties sont lus et
  écrits par le connecteur Odoo, en mode démonstration puis en mode réel.
- **Back-office** : il ne gère que les contenus, les paramètres de fonctionnement du site,
  la validation des comptes et les demandes de financement et de devis (principes III et
  VI).
- **Secrets** : fournis par la configuration de l'environnement, hors du dépôt
  (principe V).
- **Interface** : les tokens de `docs/brand/` sont l'unique source des valeurs de style
  (principe VII).
- **Pile technique** : non fixée par la constitution. Elle est choisie lors de la
  planification et DOIT respecter l'ensemble des principes.

## Flux de développement et contrôles qualité

- Chaque fonctionnalité suit le cycle Spec Kit : spécification, plan, tâches,
  implémentation.
- Le plan de chaque fonctionnalité DOIT comporter un contrôle de conformité à la
  constitution, principe par principe. Tout écart DOIT y être justifié par écrit ou
  corrigé avant l'implémentation.
- Le plan DOIT identifier les connecteurs utilisés et leurs contrats.
- Une fonctionnalité est livrable en phase 1 quand ses critères [Phase 1] sont vérifiés et
  ses tests automatisés passent. Ses critères [Phase 3] sont vérifiés lors de la recette.
- Avant livraison, toute interface DOIT être vérifiée sur trois points : conformité au
  design system (principe VII), accessibilité WCAG 2.2 AA (principe VIII) et ton éditorial
  (principe IX).
- Toute fonctionnalité qui touche aux comptes, aux paiements, aux factures ou à PCA DOIT
  être relue au regard des principes IV et V.

## Governance

- La constitution prévaut sur toute autre pratique, convention ou préférence du projet.
- **Amendement** : toute modification est proposée par écrit, avec sa motivation et son
  impact sur les specs, plans et tâches en cours. Elle est approuvée par Pauline Kurkdjian,
  responsable du projet, avant d'être appliquée.
- **Versionnage** sémantique :
  - MAJEUR : suppression ou redéfinition incompatible d'un principe ;
  - MINEUR : ajout d'un principe ou d'une section, ou extension notable d'une règle ;
  - CORRECTIF : clarification, reformulation ou correction sans changement de sens.
- **Contrôle de conformité** : chaque spec, plan et revue de code vérifie le respect des
  principes. Une non-conformité bloque la livraison tant qu'elle n'est pas corrigée ou
  couverte par un amendement.
- Les onze principes étant non négociables, aucune dérogation ponctuelle n'est admise : un
  écart durable passe par un amendement.

**Version**: 2.2.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-14
