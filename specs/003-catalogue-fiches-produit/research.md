# Recherche et décisions techniques — F03 Catalogue et fiches produit

**Date** : 2026-10-17
**Plan** : [plan.md](plan.md)

F03 s'appuie sur F11 (connecteur Odoo et sa base fictive, cache par étiquettes, écran de
démonstration), F01 (mise en page publique, pages de famille, recherche, formulaires protégés,
stockage des fichiers) et F02 (comptes, `peutCommander`). Ce document ne traite que les choix
propres à F03.

---

## R1. Qui détient quoi

- **Odoo (connecteur, base fictive en phase 1)** : articles, variantes (configurations et
  conditionnements), références, prix HT, taux de TVA, formules proposées, offres de mise à
  disposition, barème de financement, mensualités forcées, paliers dégressifs, stock et état
  hors stock, compatibilités déclarées.
- **Site (base du site, back-office)** : contenus de présentation rattachés à l'article par sa
  référence (`ContenuProduit`, déjà créé par F11) — textes, photos, documents, compatibilités
  ajoutées, produits associés, sous-catégorie de filtre, ordre, publication — ainsi que les
  sous-catégories de filtre, les pages services et les demandes de devis.
- **Écarté** : copier prix ou stocks dans la base du site (principe III ; FR-029, FR-038).

## R2. Pages catégorie et adresses

- **Adresses** : les pages de famille de F01 gardent leur adresse (`/holter-ecg`,
  `/holter-ecg/ecg-de-repos`, `/holter-tensionnel`, `/epreuve-effort`,
  `/accessoires-consommables`) et deviennent les pages catégorie de F03. Les fiches sont sous
  leur catégorie : `/holter-tensionnel/suntech-oscar-2` (identifiant lisible `slug` tiré de la
  marque et du nom, enregistré avec le contenu, unique, modifiable sans casser l'ancien lien :
  l'ancienne adresse redirige).
- **3 clics** : accueil → méga-menu ou tuile (catégorie) → carte (fiche) ; vérifié par un
  parcours qui suit les liens depuis l'accueil pour chaque produit publié (SC-004).
- **Filtres** (FR-007) : marque, sous-catégorie (« type »), disponibilité ; dans l'adresse
  (`?marque=SunTech&type=brassards`) pour être partageables et fonctionner sans JavaScript ;
  mise à jour sans rechargement complet avec JavaScript ; nombre de résultats annoncé
  (`aria-live`), filtres actifs retirables, « Tout retirer ». Tri : ordre de l'administrateur
  ou prix croissant. Pas de pagination (catalogue court).
- **Sous-catégories** : définies par l'administrateur pour chaque catégorie (hypothèse
  confirmée de la spec) ; chaque contenu produit en désigne une.

## R3. Fiche équipement et sélecteur de formule

- **Rendu** : la page est rendue côté serveur avec toutes les données de ses formules et
  configurations ; le passage d'une formule ou d'une configuration à l'autre se fait dans le
  navigateur, sans requête (SC-002 : < 1 s). Formules en pilules (`role="radiogroup"`) ;
  zone de prix et de contenu en `aria-live="polite"`.
- **Formule dans l'adresse** : `?formule=achat|mise-a-disposition|financement` et
  `&config=<référence>` (US2-8), mis à jour par `history.replaceState`.
- **Achat** : configurations = variantes de l'article ; une seule variante → pas de choix.
- **Mise à disposition** : prix du premier mois, des mois suivants, contenu du pack (texte du
  contenu produit), kit requis (article d'Odoo, avec son prix).
- **Financement** : pour chaque durée du barème, mensualité = prix HT de la configuration ×
  coefficient de la durée ; ordre de priorité (FR-046) : mensualité forcée pour le client
  connecté → mensualité forcée pour tous → calcul. Mention indicative (formulation à valider
  par le conseil juridique, déjà notée dans la spec).
- **Prix** : HT en premier, TTC en complément calculé avec le taux de TVA de la variante
  (FR-027). Montants en centimes, formatés par `src/lib/montants.ts` (F11).
- **Boutons** : achat → ajout au panier (R6) ; mise à disposition → parcours de F05 ;
  financement → demande de F04. Tant que F04 et F05 ne sont pas livrés, ces deux boutons
  mènent au formulaire de contact avec le motif présélectionné (hypothèse de la spec).
- **Onglets d'information** : motif « tabs » de l'ARIA (flèches, Origine, Fin) ; un onglet
  sans contenu n'est pas rendu (FR-018).
- **Galerie** : photo principale et vignettes (boutons), navigation au clavier, texte de
  remplacement obligatoire (FR-043) ; emplacement provisoire de la charte sans photo.

## R4. Fiche consommable

- **Conditionnements** = variantes de l'article (déjà le cas dans la base fictive :
  « Boîte de 50 », « Carton de 500 »), avec un attribut `quantiteParLot` ajouté au contrat ;
  prix par lot = prix de la variante, prix unitaire = prix ÷ quantité par lot.
- **Dégressifs** : règles de la liste de prix publique d'Odoo avec une quantité minimale
  (`min_quantity` dans Odoo) ; ajoutés au contrat de l'article (R8).
- **Quantité supérieure au stock** : message « N disponibles, le reste sous X jours ».
- **Points d'assistance** (F06) et **« Commander à nouveau »** (F04) : non affichés tant que
  ces modules ne sont pas livrés (hypothèses confirmées de la spec).

## R5. Disponibilité

- Lue par `stock.lireDisponibilite` (achat et mise à disposition séparées, FR-032), mise en
  cache avec l'étiquette `stock`. En démonstration, l'écran Stocks de F11 invalide l'étiquette :
  le changement est visible au rechargement suivant (SC-013 < 1 min). En réel, cache de
  1 minute pour la disponibilité (SC-003 < 5 min).
- **Connecteur injoignable** (US5-5) : la fiche reste consultable avec ses contenus ; prix et
  disponibilité sont remplacés par « Information momentanément indisponible » et une
  invitation à réessayer ou à nous contacter ; aucun ajout au panier.
- « Indisponible » → pas d'ajout ; « délai X jours » → ajout accepté, délai rappelé.

## R6. Ajout au panier (frontière avec F04)

- F03 livre l'**enregistrement d'une ligne de panier** et la confirmation ; F04 livrera le
  panier complet (modification, fusion à la connexion, totaux, tunnel).
- **Décision proposée (D1)** : un panier minimal dans la base du site : `Panier` (identifié
  par un cookie signé pour un visiteur, rattaché au compte s'il est connecté) et
  `LignePanier` (référence, formule, quantité, prix HT constaté à l'ajout). La page `/panier`
  liste les lignes, sans modification ni paiement (« la commande arrive bientôt »). Le prix
  appliqué est relu à l'ajout ; s'il diffère de celui affiché, le visiteur en est informé
  (cas limite de la spec).
- **Écarté** : un panier seulement dans le navigateur (perdu d'un appareil à l'autre, et F04
  demande la fusion avec le compte).

## R7. Publication et back-office du catalogue

- **Écrans** : `/admin/catalogue` (liste des articles d'Odoo avec l'état de leur contenu :
  à rédiger, en préparation, publié, orphelin), `/admin/catalogue/[reference]` (données
  d'Odoo en lecture seule avec la mention « se gère dans Odoo », formulaire des contenus),
  `/admin/catalogue/sous-categories`, `/admin/catalogue/services`. Rôles : administrateur
  (rédaction et publication) ; commercial en lecture.
- **Publication** (FR-037, US6-5) : refusée avec la liste de ce qui manque si l'article est
  absent d'Odoo, sans prix, sans catégorie, sans description courte ou sans photo ni
  emplacement provisoire accepté. Article disparu d'Odoo → contenu marqué « orphelin »,
  retiré du public, adresse « n'est plus proposé » avec un lien vers sa catégorie.
- **Fichiers** : photos par le stockage de F01 (PNG, JPEG, WebP, 2 Mo) ; documents PDF
  ajoutés au stockage avec une limite propre (10 Mo, contrôle du type réel) ; type et
  taille affichés (US4-3).
- **Journal** : chaque enregistrement et chaque publication (FR-040).
- **Recherche de F01** : n'indexe que les articles publiés (US6-3), lien direct vers la fiche.
- **Décision proposée (D2)** : au premier remplissage, chaque article de la base fictive reçoit
  des contenus provisoires (description tirée d'Odoo, emplacement photo) et est publié, pour
  que la démonstration ne soit pas vide ; l'administrateur les remplace ensuite.

## R8. Évolutions du contrat du connecteur Odoo

À reporter dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md),
avec les tests de contrat dans les deux modes :

| Élément | Changement |
|---|---|
| `VarianteArticle.quantiteParLot` | Ajout : quantité d'unités du conditionnement (1 par défaut) |
| `VarianteArticle.paliers` | Ajout : `[{ quantiteMin, prixUnitaireHt }]` de la liste de prix publique |
| `Article.mensualitesForcees` | Ajout : `[{ dureeMois, montantHt }]` valables pour tous |
| `PrixClient.mensualiteForceeHt` | Remplacé par `mensualitesForcees: [{ dureeMois, montantHt }]` (financement, FR-046) ; la règle de démonstration du Dr Delvaux-Arnoux reçoit sa durée |

Aucune nouvelle opération : `lireArticle`, `listerArticles`, `lirePrixClient`,
`listerReferences` et `stock.lireDisponibilite` suffisent.

## R9. Pages services

- Quatre pages (FR-002) : `/services/hebergement-donnees-sante` et `/services/assistance`
  (F01, complétées), `/financement` (F01, adresse conservée car elle est dans le menu
  principal), `/services/installation-formation` (nouvelle). Texte dans `contenus/`
  (modifiable au back-office), tarif HT standard s'il existe (paramètre), badge et action.
  Badge « En préparation » de l'hébergement retirable par l'administrateur (FR-035).

## R10. Demande de devis ECG de repos

- Formulaire sur `/holter-ecg/ecg-de-repos` (modèle ou besoin, coordonnées, message),
  protections anti-robots et limites d'envoi de F01, enregistré comme `DemandeDevis` (F11)
  avec l'objet « devis ECG de repos », notification à l'équipe, confirmation au visiteur ;
  coordonnées préremplies pour un client connecté. Aucune donnée de patient demandée.

## R11. Accessibilité, charte et performance

- Composants accessibles écrits dans le projet (pilules, onglets, galerie, filtres), sans
  nouvelle bibliothèque ; tests axe-core, clavier, 320 à 1 920 px (SC-010, SC-011), cibles
  de 44 px.
- Photos servies par `next/image` (tailles adaptées, chargement différé hors écran).
- Lighthouse : une fiche équipement et une fiche consommable ajoutées aux pages mesurées
  (affichage principal < 2 s en 4G mobile).
