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

### III. Référentiel de gestion unique, remplaçable par Odoo

L'ERP Odoo (plan personnalisé avec API) ne sera branché qu'en fin de projet.

- D'ici là, le site DOIT posséder son propre référentiel de gestion, administré dans le
  back-office : produits, prix, stocks, parc de location, clients, commandes, factures,
  bons d'achat, droits d'assistance, garanties.
- Tout accès à ces données DOIT passer par une seule couche d'accès (interfaces de type
  « dépôt » / « fournisseur de données »).
- Les pages et les composants NE DOIVENT JAMAIS accéder directement à ces données.
- La bascule vers Odoo DOIT se limiter au remplacement de l'implémentation de cette couche,
  sans modification du reste du site.
- Les modèles de données DOIVENT reprendre dès maintenant les notions et champs d'Odoo :
  client / partenaire, article, variante, commande de vente, facture, numéro de série.

**Justification** : une couche d'accès unique rend la migration vers Odoo mécanique et
évite de réécrire le site en fin de projet.

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
- Les factures émises par le site DOIVENT respecter les mentions légales françaises et une
  numérotation continue.
- Les secrets (clés API Stripe, PCA, puis Odoo) NE DOIVENT JAMAIS figurer dans le code.
- L'authentification DOIT être sécurisée et les actions sensibles DOIVENT être journalisées.

**Justification** : le site émet des factures et encaisse des professionnels de santé.
Une faille ou une non-conformité engage directement la responsabilité de l'entreprise.

### VI. Règles commerciales paramétrables

- Les taux de fidélité, seuils, durées d'assistance, tarifs de mise à disposition et
  promotions DOIVENT être des paramètres modifiables depuis le back-office.
- Ces valeurs NE DOIVENT JAMAIS être codées en dur.

**Justification** : l'offre commerciale évoluera plus vite que le code. Un changement de
tarif ne doit pas exiger une mise en production.

### VII. Identité visuelle ExploCardio.fr

- `docs/brand/design-system.md` est la source de vérité visuelle : toute interface DOIT
  s'y conformer.
- Couleurs, typographies, rayons et espacements DOIVENT provenir exclusivement des tokens
  de `docs/brand/tokens.css` (ou `tokens.json`). Aucune valeur hexadécimale ni police NE
  DOIT être codée en dur dans les composants.
- Le logo DOIT toujours être intégré depuis `docs/brand/assets/*.svg`. Il NE DOIT JAMAIS
  être recomposé en texte, déformé ni recoloré.
- Dans l'en-tête, la version horizontale `explocardio-fr-logo-horizontal.svg` est la seule
  forme compacte admise.
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
- Chaque spec DOIT comporter des critères d'acceptation vérifiables.
- Les tests automatisés DOIVENT couvrir les parcours d'achat, le paiement, la couche
  d'accès au référentiel de gestion et les échanges avec PCA.

**Justification** : des incréments indépendants limitent le risque et permettent de
vérifier chaque livraison sur des critères objectifs.

### XI. Langue et périmètre

- Le site est en français uniquement.
- Les clients sont des professionnels de santé installés en France métropolitaine.
- Aucune fonctionnalité d'internationalisation, de multi-devise ou de vente hors de ce
  périmètre NE DOIT être développée.

**Justification** : un périmètre unique simplifie la fiscalité, la facturation, la
logistique et le contenu.

## Contraintes techniques et intégrations

Cette section rassemble les contraintes d'architecture qui découlent des principes.

- **Systèmes externes autorisés** : Stripe (paiement), PCA (ouverture et fermeture des
  droits d'accès des médecins), un outil d'agenda (prise de rendez-vous), un outil
  d'emailing (emails et newsletter), puis Odoo (ERP) en fin de projet. L'outil d'agenda et
  l'outil d'emailing sont choisis lors de la planification ; ils NE DOIVENT recevoir que
  les données strictement nécessaires, jamais de donnée de patient, et DOIVENT respecter le
  RGPD. Toute autre intégration externe exige un amendement ou une justification dans le
  plan.
- **Frontière des données** : les données de gestion ne sont lues et écrites que par la
  couche d'accès du principe III. Les échanges avec PCA ne portent que sur des comptes et
  des droits de médecins, jamais sur des données de patients (principe IV).
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
- Une fonctionnalité n'est livrable que si ses critères d'acceptation sont vérifiés et ses
  tests automatisés passent (principe X).
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

**Version**: 1.1.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-13
