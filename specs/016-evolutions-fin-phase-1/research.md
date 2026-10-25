# Research — F16 Évolutions de fin de phase 1

Inventaire du code existant (2026-10-25) et décisions techniques. Les décisions D1 à D11 du
plan en découlent.

## R1. En-tête et menu horizontal (FR-001, FR-002)

- **Constat** : `src/ui/en-tete/BarreNavigation.tsx` place le logo à gauche et regroupe loupe,
  panier, compte et bouton du menu à droite. Le menu horizontal (deuxième ligne, 7 entrées) et
  les méga-menus ne s'affichent qu'à partir de `xl` (1 280 px) ; `MenuMobile` est visible en
  dessous. Un PC portable 1 366 px réglé à 125 % offre 1 093 px de large : il reçoit le menu
  mobile. C'est la cause du retour « menu pas horizontal sur Windows ».
- **Decision** : seuil abaissé à `lg` (1 024 px) pour la deuxième ligne, les méga-menus et le
  masquage du menu mobile ; espacements réduits entre 1 024 et 1 279 px ; en dessous, grille à
  trois zones (menu | logo centré | actions). Vérification automatique à 1 024 px que les 7
  entrées tiennent sur une ligne.
- **Alternatives** : menu sur une seule ligne avec le logo (ne tient pas à 1 024 px) ; libellés
  raccourcis (« Qui sommes-nous / Contact ») — gardés en réserve si 1 024 px ne suffit pas.

## R2. Fil d'Ariane (FR-003, FR-004)

- **Constat** : deux fils d'Ariane existent déjà, chacun à sa façon : fiche produit
  (`src/ui/catalogue/Fiche.tsx`) et article d'aide (`app/(public)/aide/[slug]`). Les autres pages
  n'en ont pas.
- **Decision** : composant commun `src/ui/FilAriane.tsx` (`nav` étiquetée « Fil d'Ariane »,
  liste ordonnée, `aria-current="page"` sur la dernière étape) ; chaque page lui passe son
  chemin. Sur téléphone : lien unique « ‹ Rubrique parente ». Placé sous l'en-tête par chaque
  page, pas par la mise en page (les pages connaissent leur parent, la mise en page non).
- **Alternatives** : déduction depuis l'URL (libellés inexacts pour les fiches, dont l'adresse
  ne reprend pas toujours le type) ; historique du navigateur (non partageable, inattendu).

## R3. Carrousel et vignettes (FR-005 à FR-008, FR-012, FR-013, FR-015)

- **Constat** : l'accueil (`app/(public)/page.tsx`) enchaîne Heros (logo et signature),
  AccesRapide, Equipements, OffreDigitale, OffreBienvenue, ServiceFidelite, Actualites,
  BlocContact. `Contenu` (F13) a déjà les états, dates, images avec texte de remplacement, ordre,
  aperçu, verrou optimiste et journal. Les actualités ne sont lues que par l'accueil ; leur
  section et leur écran sont retirés (décision D1 finale).
- **Decision** : types `vignette` et `argument` ajoutés à `TypeContenu` ; champ `libelleLien`
  (texte du bouton) ajouté à `Contenu`. Nouvel écran **Contenus → Carrousel**, bâti sur le
  modèle de celui des actualités (qui est retiré) ; lecture `lireVignettes()` en cache « contenus », aperçu F13. La
  vignette « Offre de bienvenue » porte `cle = "offre-bienvenue"` et n'est montrée que si
  l'offre est active (paramètre existant `bienvenue.active`). Carrousel en composant client :
  translation CSS, minuteur de 6 s, pause au survol et au focus, `prefers-reduced-motion`,
  région étiquetée, vignettes annoncées « 2 sur 5 ».
- **Alternatives** : bibliothèque de carrousel (dépendance inutile pour quelques vignettes) ;
  défilement horizontal libre (moins lisible, pas de pause naturelle).

## R4. « Pourquoi préférer ExploCardio.fr » (FR-010, FR-014)

- **Decision** : `Contenu` de type `argument`, `cle` ∈ {intro, 1, 2, 3, 4} ; écran
  **Contenus → Accueil** (un formulaire). Les schémas sont quatre petits dessins SVG en code,
  aux couleurs des tokens (trois points, flèches fines), décoratifs (`aria-hidden`).

## R5. Prix du panier en direct (FR-016, FR-017)

- **Constat** : `src/ui/commande/LignePanier.tsx` garde la quantité dans un état local et
  n'enregistre qu'au `blur` ; le prix vient du serveur après enregistrement. Les totaux sont
  calculés par le connecteur Odoo (`calculerDevis` : prix dégressifs, promotions, bons, frais de
  port, TVA).
- **Decision** : la ligne reçoit son barème (prix unitaire HT par seuil de quantité, TVA) ;
  à chaque changement, le prix de la ligne est recalculé dans la page, les totaux sont estimés
  (somme des lignes) puis corrigés par l'enregistrement, déclenché 300 ms après la dernière
  frappe (seule la dernière quantité compte). Échec : message et retour à la dernière quantité
  enregistrée.
- **Alternatives** : recalcul serveur à chaque frappe (latence visible, non conforme à SC-005).

## R6. Devis (FR-018 à FR-022)

- **Constat** : le « devis » de F04 est un **calcul** (`commandes.calculerDevis`), non enregistré.
  La base de démonstration a `CommandeVente` (statuts brouillon, confirmée…) et un générateur
  de PDF de facture (`factures-pdf.ts`). Dans Odoo, un devis est une `sale.order` à l'état
  `draft`/`sent`, avec une date de validité, que l'on confirme pour en faire une commande.
- **Decision** : quatre opérations ajoutées au connecteur (domaine `commandes`) :
  `creerDevis`, `listerDevis`, `lireDevisPdf`, `confirmerDevis` — contrat :
  [contracts/connecteur-odoo-devis.md](contracts/connecteur-odoo-devis.md). En démonstration :
  statut `devis` et `validiteLe` sur `CommandeVente`, durée de validité dans les paramètres
  commerciaux fictifs (30 jours), PDF « DEVIS — FICTIF ». Le tunnel accepte une commande
  « depuis le devis » : il confirme le devis au lieu de créer une commande (prix figés). Mode
  réel : refus explicite jusqu'à F14.
- **Alternatives** : devis stocké dans la base du site (dupliquerait une donnée d'Odoo,
  contraire au principe III) ; simple demande à l'équipe (rejetée par Pauline au profit du PDF
  immédiat).

## R7. Numéro d'entreprise (FR-023 à FR-027, FR-034)

- **Constat** : `CompteClient` a `type` (médecin / structure), `rpps` (unique), `siret` (indexé),
  `statut` (email_a_confirmer → en_attente → valide…). `peutCommander` n'autorise que `valide`
  (sauf mise à disposition express) ; la fiche Odoo (`odooPartnerRef`) est créée à la
  validation ; `expeditionBloquee` des locations vaut « compte non validé ». Le paramètre
  `comptes.validation_auto` fait déjà passer de « email confirmé » à « validé ».
- **Decision** : à la confirmation de l'email, le compte passe **directement à « validé »**
  (chemin de la validation automatique, désormais toujours suivi) ; `en_attente` n'est plus
  atteint. Nouveaux champs `numeroVerification` (`a_verifier` | `verifie` | `refuse`), date,
  auteur et motif. Refus → statut `suspendu` + email. `expeditionBloquee` des locations : vrai tant
  que le numéro n'est pas `verifie` ; la vérification débloque les expéditions en attente
  (mécanisme F05 existant). SIRET (14 chiffres) ou SIREN (9), clé de Luhn ; plus d'unicité.
  Paramètre `comptes.numero_exige` (`premiere_commande` | `inscription`) remplace
  `comptes.validation_auto` dans Paramètres → Comptes. Formulaire d'inscription : plus de choix
  médecin / structure ni de RPPS ; « Nom du cabinet ou de la structure » et numéro facultatif.
- **Alternatives** : garder « en attente » et autoriser la commande dans cet état (deux notions
  pour une même chose, messages contradictoires).

## R8. Hors métropole (FR-028, FR-029)

- **Constat** : `src/domaine/comptes/adresses.ts` refuse déjà les codes postaux 97/98 avec un
  message, sans contact proposé ; les adresses n'ont pas de pays (code postal français
  supposé).
- **Decision** : champ `pays` (« FR » par défaut, « autre ») dans les adresses de livraison ;
  refus avec bouton « Nous contacter » vers `/qui-sommes-nous?motif=hors-metropole#contact` ; le
  formulaire de contact lit le panier côté serveur pour préremplir le message ; motif ajouté à
  la liste des motifs. Composant `MentionMetropole` sur fiches, panier et conditions.

## R9. Signature et bloc contact (FR-030, FR-031)

- **Constat** : « hors imagerie » apparaît dans `app/layout.tsx` (titre et description),
  `src/ui/PiedDePage.tsx`, `src/ui/accueil/Heros.tsx`, `src/emails/Gabarit.tsx`,
  `src/connecteurs/odoo/demo/factures-pdf.ts`, `contenus/catalogue.md`,
  `contenus/qui-sommes-nous.md` et la charte (`docs/brand`). « Régis Andrieu, fondateur » :
  seulement `src/ui/accueil/BlocContact.tsx`.
- **Decision** : remplacement partout ; un test cherche « hors imagerie » dans les pages, les
  emails de démonstration et les PDF générés (SC-009). La constitution garde sa description du
  métier.
