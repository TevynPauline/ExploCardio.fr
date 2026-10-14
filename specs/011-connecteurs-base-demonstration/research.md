# Recherche et choix techniques — F11 Connecteurs et base de démonstration

**Date** : 2026-10-14
**Spec** : [spec.md](spec.md)
**Plan** : [plan.md](plan.md)

Chaque section donne la décision, sa justification et les solutions écartées. Le critère
directeur, fixé par le porteur du projet, est : **technologies très répandues, bien
documentées et simples à maintenir**, avec une seule base de code.

---

## R1. Cadre applicatif : Next.js (App Router) en TypeScript

- **Décision** : Next.js, version stable courante au démarrage du développement, App Router,
  TypeScript en mode strict, sur Node.js LTS. Une seule application pour le site public,
  « Mon compte » et le back-office.
- **Justification** : le cadre le plus répandu pour un site React rendu côté serveur ;
  rendu serveur et pages statiques régénérées pour le référencement et la performance du
  catalogue ; routes serveur pour les webhooks et les actions du back-office ; très bien
  connu de Claude Code, ce qui réduit le coût de maintenance.
- **Écartés** : Remix / React Router (moins répandu) ; Nuxt (Vue, écosystème plus petit en
  France pour ce type de projet) ; site et back-office séparés (deux bases de code,
  contraire à la demande).

## R2. Interface : Tailwind CSS branché sur les tokens de la charte

- **Décision** : Tailwind CSS en version 4. La version 4 se configure dans le CSS (bloc
  `@theme`) et non plus dans `theme.extend` : les variables du thème y sont déclarées
  **à partir des variables `--ec-*` de `docs/brand/tokens.css`**, qui reste l'unique source
  des valeurs. `docs/brand/tokens.json` sert aux scripts de contrôle (contrastes) et aux
  emails. Composants maison reprenant les classes de référence de la charte (`.ec-btn`,
  `.ec-card`, `.ec-kicker`, `.ec-dots`, `.ec-badge`, `.ec-placeholder`).
- **Point de vigilance** : `docs/brand/tokens.css` commence par un `@import` vers Google
  Fonts, interdit par F11 (FR-042). Il sera retiré au premier lot de tâches, la police Inter
  étant fournie localement (R3).
- **Écartés** : Tailwind 3 avec `theme.extend` (version précédente, en fin de vie) ; CSS
  Modules seuls (plus verbeux, moins guidé) ; bibliothèque de composants tierce (charte
  difficile à respecter strictement).

## R3. Police Inter hébergée par le site

- **Décision** : Inter chargée localement par le mécanisme de polices de Next.js, à partir
  des fichiers de la police inclus dans le dépôt (graisses 300, 400, 500, 600 et italiques
  300, 400). Aucun appel à Google Fonts, ni au chargement ni à la compilation.
- **Justification** : exigence F11 (FR-042) et RGPD (aucune adresse IP transmise à Google).
- **Écarté** : chargement depuis Google Fonts, même « optimisé » par Next.js (dépend d'un
  téléchargement depuis Google).

## R4. Base de données : PostgreSQL et Prisma, deux bases distinctes

- **Décision** : PostgreSQL géré, en France. ORM **Prisma**. Deux bases sur le même serveur :
  - **base du site** : comptes, utilisateurs d'équipe, contenus, contenus produits,
    paramètres et leur historique, demandes, messages de contact, journal, file d'attente,
    boîte de démonstration ;
  - **base de démonstration** : l'équivalent fictif d'Odoo, utilisée uniquement par les
    connecteurs en mode démonstration, avec son propre schéma Prisma.
- **Justification** : Prisma est l'ORM TypeScript le plus documenté et le plus simple à lire
  pour un non-développeur (schéma déclaratif lisible). Deux bases plutôt que deux schémas
  dans une même base : isolement total (la réinitialisation vide une base entière sans
  risque pour les données du site), et suppression pure et simple de la base de
  démonstration en production.
- **Écartés** : Drizzle (excellent, mais moins de documentation et d'exemples) ; un seul
  schéma partagé (risque de mélanger données réelles et fictives, contraire au principe
  III) ; deux schémas dans une même base (possible, mais réinitialisation plus délicate).

## R5. Connecteurs : interfaces, deux implémentations, choix par configuration

- **Décision** :
  - une **interface TypeScript** par service et par domaine : Odoo découpé en catalogue,
    stock, clients, commandes, factures, location, fidélité, opportunités commerciales ;
    puis Stripe, PCA, emailing ;
  - deux implémentations par interface : `demo` (base de démonstration ou simulation) et
    `real` (service réel, écrite en phase 2, F14) ;
  - un **registre unique** qui lit, au démarrage, une variable d'environnement par
    connecteur (`CONNECTOR_ODOO=demo|real`, etc.) et fournit l'implémentation ; les pages
    et composants ne connaissent que l'interface ;
  - des **erreurs typées communes** (service indisponible, paiement refusé, authentification
    forte requise, rupture de stock, accès Cloud refusé, configuration incomplète, donnée
    de démonstration refusée) ;
  - une **règle de lint** qui interdit d'importer une implémentation ou un SDK externe hors
    du dossier des connecteurs.
- **Justification** : c'est l'application directe du principe III ; le registre rend la
  bascule « par configuration, connecteur par connecteur » vérifiable.
- **Écartés** : injection de dépendances par une bibliothèque dédiée (complexité inutile) ;
  bascule par branchement de code (contraire à FR-004).

## R6. Tests de contrat communs aux deux modes

- **Décision** : **Vitest**. Pour chaque interface, une suite de tests de contrat écrite une
  fois et exécutée contre l'implémentation `demo` en phase 1, puis contre l'implémentation
  `real` (environnement de test) en phase 3, sans modification. Les tests du mode réel ne
  s'exécutent que si la variable du connecteur vaut `real` et que les identifiants de test
  sont présents.
- **Justification** : exigence F11 (FR-006, SC-004, SC-011) et principe X.
- **Écartés** : Jest (plus lent, configuration plus lourde avec TypeScript moderne).

## R7. Parcours de bout en bout et accessibilité

- **Décision** : **Playwright** pour les parcours (inscription, achat, paiement American
  Express simulé, mise à disposition, fidélité, demande de financement, réinitialisation) ;
  **axe-core** (intégration Playwright) pour le niveau WCAG 2.2 AA sur chaque page testée.
- **Justification** : standard actuel, captures et traces lisibles en cas d'échec, utilisable
  en intégration continue.

## R8. Preuve « aucune sortie vers un service réel » (SC-003)

- **Décision** : trois verrous cumulés :
  1. en mode démonstration, aucun identifiant de service réel n'est requis ni lu ;
  2. un **garde réseau** côté serveur, actif dès qu'un connecteur est en mode
     démonstration, refuse toute requête sortante vers les domaines des services réels
     (Odoo, Stripe, PCA, emailing) et la journalise comme erreur ;
  3. un test Playwright qui enregistre toutes les requêtes du navigateur pendant les
     parcours et échoue si l'une vise un service réel ou Google Fonts.
- **Justification** : un seul verrou pourrait être contourné par erreur ; les trois ensemble
  rendent le critère vérifiable automatiquement.

## R9. File d'attente et reprise des écritures

- **Décision** : **pg-boss**, file d'attente stockée dans PostgreSQL (base du site). Toute
  écriture vers un service externe en mode réel (commande vers Odoo, ouverture d'accès PCA,
  envoi d'email) passe par la file, avec clé d'idempotence, reprises espacées et alerte
  après un seuil d'échecs. En mode démonstration, la même file est utilisée, ce qui teste
  le mécanisme dès la phase 1.
- **Justification** : pas de serveur supplémentaire à maintenir (pas de Redis) ; outil
  répandu et stable.
- **Écartés** : Redis + BullMQ (un service de plus) ; tâches planifiées maison (fiabilité à
  prouver).

## R10. Cache du catalogue

- **Décision** : cache de données de Next.js avec étiquettes et revalidation : catalogue et
  prix relus au plus toutes les 5 minutes en mode réel (exigence des specs F03 et F11),
  revalidation immédiate en mode démonstration après une modification dans l'écran de
  démonstration (SC-009 : moins de 5 secondes).
- **Justification** : intégré au cadre, aucun composant supplémentaire.

## R11. Paiement simulé et paiement réel

- **Décision** : en mode réel (phase 2), **Stripe Checkout** (page de paiement hébergée par
  Stripe), avec Visa, Mastercard, American Express, authentification forte, prélèvement
  SEPA et Stripe Billing pour les abonnements. Confirmation par **webhooks signés**, traités
  de façon idempotente.
  En mode démonstration, une **page de paiement de démonstration** du site imite Checkout :
  elle propose les issues « accepté », « refusé », « authentification forte », pour chaque
  type de carte et le SEPA, puis **émet les mêmes événements que Stripe** vers le même
  gestionnaire de webhooks. Ainsi le traitement des paiements (idempotence, confirmations
  tardives ou répétées) est testé dès la phase 1.
- **Justification** : Checkout est la voie la plus simple et la plus sûre (aucune donnée de
  carte ne touche le site, principe V). Checkout a été retenu par le porteur de projet le
  2026-10-14 (plan, D2).
- **Écarté** : Payment Element intégré (plus de code et de responsabilité d'affichage) — à
  reconsidérer seulement si l'expérience de paiement intégrée est jugée indispensable.

## R12. Factures fictives

- **Décision** : le connecteur Odoo de démonstration produit des PDF de factures et d'avoirs
  au format proche d'Odoo, avec la mention « FICTIVE » en filigrane et en en-tête, par une
  bibliothèque de génération de PDF en JavaScript. En mode réel, les PDF viennent d'Odoo
  par l'API.
- **Justification** : principe V ; le site n'émet jamais de facture réelle.

## R13. Emailing et boîte de démonstration

- **Décision** : modèles d'emails écrits avec **React Email** (composants à la charte,
  versionnés). En mode réel : outil d'emailing européen avec API d'envoi transactionnel,
  campagnes et SMS — **Brevo** par défaut (société française). En mode démonstration : le
  connecteur enregistre chaque email ou SMS dans la boîte de démonstration (base du site),
  avec son rendu HTML, consultable dans le back-office.
- **Justification** : modèles relus et versionnés comme le reste du site ; Brevo couvre
  emails, campagnes et SMS avec un seul fournisseur.

## R14. Authentification

- **Décision** : **Better Auth** (bibliothèque d'authentification TypeScript, adaptateur
  Prisma), avec email et mot de passe, réinitialisation, double authentification par
  application (TOTP) et codes de secours, rôles d'équipe. Double authentification
  facultative pour les clients (F02), obligatoire pour l'équipe (F13).
- **Justification** : couvre nativement mot de passe et double authentification, ce que
  Auth.js ne fait pas sans développement maison pour la connexion par mot de passe.
- **Écarté** : Auth.js (très répandu, mais connexion par mot de passe et double
  authentification à construire soi-même) ; service d'authentification externe (un service
  et un sous-traitant de plus).

## R15. Site de démonstration protégé

- **Décision** : un **intergiciel** (middleware) Next.js, actif quand `SITE_MODE=demo`,
  exige le mot de passe de démonstration (stocké haché en base, modifiable par
  l'administrateur) et pose un cookie signé portant un numéro de version ; changer le mot
  de passe incrémente la version et ferme toutes les sessions (FR-037). Les réponses portent
  l'en-tête `X-Robots-Tag: noindex, nofollow` et `robots.txt` interdit tout. Un bandeau
  permanent « Version de démonstration — données fictives » est rendu par la mise en page
  commune.
- **Justification** : FR-034 à FR-037 sans service tiers.

## R16. Hébergement

- **Décision proposée** : plateforme d'hébergement française de type « PaaS » (déploiement à
  chaque mise à jour du dépôt GitHub), avec PostgreSQL géré, sauvegardes automatiques,
  HTTPS, environnements séparés (démonstration, test, production) et stockage d'objets
  pour les images et documents, le tout en France. Exemples : Scalingo, Clever Cloud.
- **Justification** : simplicité d'exploitation pour un porteur non développeur, données en
  France (RGPD), pas de serveur à administrer. Le site n'héberge aucune donnée de santé :
  la certification HDS n'est pas requise pour lui. Le porteur de projet a retenu un
  hébergeur français le 2026-10-14 ; le prestataire reste à choisir.
- **Écarté** : Vercel avec une base gérée en région UE (très simple pour Next.js,
  mais société américaine, contraire à la préférence « France » ; reste possible). Le
  choix final est une décision du porteur (plan, D1).

## R17. Contrôle automatique de la charte

- **Décision** :
  - une règle **ESLint** et une règle **Stylelint** qui interdisent toute couleur
    hexadécimale, `rgb()`/`hsl()` littérale ou nom de police en dur hors de
    `docs/brand/` et du fichier de thème, y compris dans les valeurs arbitraires Tailwind
    (`bg-[#…]`) ;
  - un **script de contrastes** qui lit `tokens.json`, calcule le contraste des paires
    texte/fond autorisées par la charte et échoue sous 4,5:1 (texte) ou 3:1 (composants), et
    qui interdit l'usage des pastels comme couleur de texte ;
  - **axe-core** dans les tests Playwright pour le rendu réel.
- **Justification** : principe VII et VIII, vérifiés à chaque modification.

## R18. Performance (catalogue en moins de 2 secondes sur mobile 4G)

- **Décision** : pages catalogue rendues côté serveur et mises en cache (R10), images
  optimisées par Next.js (formats modernes, tailles adaptées), police locale préchargée,
  JavaScript client limité aux éléments interactifs (sélecteur de formule, filtres).
  Mesure par **Lighthouse CI** en profil mobile avec réseau 4G simulé : la page doit être
  utilisable (plus grand élément affiché) en moins de 2 secondes ; échec de l'intégration
  continue au-delà.
- **Justification** : objectif fixé par le porteur, mesurable automatiquement.

## R19. Secrets et configuration

- **Décision** : toutes les valeurs sensibles en **variables d'environnement**. Fichier
  `.env.example` versionné, sans aucune valeur réelle ; fichiers `.env*` réels exclus du
  dépôt par `.gitignore` ; valeurs réelles saisies dans l'interface de l'hébergeur et dans
  les secrets GitHub pour l'intégration continue. Une **vérification au démarrage** contrôle
  la présence des variables exigées par chaque connecteur en mode réel (FR-007) ; un
  **scan des secrets** dans l'intégration continue refuse tout secret commité.
- **Justification** : principe V.

## R20. Intégration continue

- **Décision** : **GitHub Actions** : à chaque envoi, vérification des types, lint (dont
  charte), tests unitaires et de contrat en mode démonstration, parcours Playwright avec
  axe-core, contrôle de non-sortie réseau, Lighthouse CI sur les pages catalogue, scan des
  secrets. Les tests en mode réel (phase 3) sont un flux séparé, déclenché à la main.

## R21. API d'Odoo (pour la phase 2, sans impact en phase 1)

- **Constat** : selon sa version, Odoo propose une API externe en XML-RPC / JSON-RPC, et ses
  versions récentes introduisent une nouvelle API externe en JSON, les anciennes étant
  annoncées comme dépréciées.
- **Décision** : la version d'Odoo et l'API à utiliser seront fixées en phase 2 (F14), avec
  l'intégrateur. Les interfaces du connecteur ne dépendent pas du protocole ; seule
  l'implémentation `real` en dépendra.
- **Point à vérifier** : la reproduction des règles de F06 (bons d'achat, droits
  d'assistance) dans Odoo, déjà notée dans F06 et F11.
