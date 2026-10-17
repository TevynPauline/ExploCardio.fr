# Modèle de données — F03 Catalogue et fiches produit

**Date** : 2026-10-17
**Plan** : [plan.md](plan.md)

F03 complète la **base du site** de F11 (contenus du catalogue, sous-catégories, panier
minimal) et étend le **contrat du connecteur Odoo** sans nouvelle opération
([research.md](research.md) R8). Les données de gestion restent dans Odoo (base fictive en
phase 1).

---

## 1. Données lues dans Odoo (rappel et ajouts)

| Notion (Odoo) | Ce que F03 en lit | Ajout F03 |
|---|---|---|
| Article (`product.template`) | nom, marque, catégorie, type, description, formules, compatibilités | `mensualitesForcees` (tous) |
| Variante (`product.product`) | référence, référence fabricant, configuration, prix HT, TVA, offre de mise à disposition | `quantiteParLot`, `paliers` |
| Liste de prix (`product.pricelist`) | prix et remises par client | règles `quantiteMin` (publique), `dureeMois` + `mensualiteCentimes` (forcées) |
| Barème de financement | durées et coefficients | — |
| Stock (`stock.quant`) | disponible, délai X jours, indisponible ; achat et mise à disposition | — |

**Base fictive** : `Variante.quantiteParLot` (entier, 1 par défaut) ; une liste de prix
publique (sans partenaire) porte les paliers des électrodes et des brassards et une mensualité
forcée générale de démonstration ; la règle du Dr Delvaux-Arnoux reçoit `dureeMois`.
Migration `demo f03_catalogue`.

## 2. Base du site — entités complétées

### Contenu produit (F11, `ContenuProduit`)

| Champ | Type | Règles |
|---|---|---|
| `defaultCode` | texte, unique | Référence de l'article d'Odoo (existant) |
| `slug` | texte, unique | **Ajout** : identifiant lisible de l'adresse (`suntech-oscar-2`) |
| `anciensSlugs` | liste de textes | **Ajout** : redirigés vers l'adresse actuelle |
| `textes` | JSON | Clés : `descriptionCourte` (obligatoire à la publication), `caracteristiques` (liste libellé/valeur), `contenuCoffret`, `contenuPackMad`, `logicielAssocie`, `garantie` |
| `photos` | JSON | `[{ chemin, texteRemplacement }]` — texte obligatoire |
| `documents` | JSON | `[{ chemin, titre, type: notice/fiche_technique, octets }]` (PDF) |
| `compatibilites` | liste | Références ajoutées à celles déclarées dans Odoo |
| `produitsAssocies` | liste | Références choisies par l'administrateur |
| `sousCategorieId` | référence | **Ajout** : sous-catégorie de filtre |
| `ordre` | entier | Ordre dans la catégorie |
| `etat` | `preparation` / `publie` | Publication contrôlée (FR-037) |
| `orphelin` | booléen | Article disparu d'Odoo : invisible du public |
| `publieLe` | date | **Ajout** |

### Demande de devis (F11, `DemandeDevis`)

Utilisée telle quelle : `objet` = « devis ECG de repos », `demandeur` = coordonnées
(nom, email, téléphone, cabinet), corps et modèle cherché dans le JSON.

## 3. Base du site — nouvelles entités

### Sous-catégorie

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `categorie` | texte | Code de catégorie d'Odoo (`mapa`, `accessoires`…) |
| `libelle` | texte | Unique dans la catégorie (« Brassards ») |
| `slug` | texte | Valeur du filtre dans l'adresse |
| `ordre` | entier | |

### Panier (minimal, complété par F04)

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `jetonEmpreinte` | texte, unique, facultatif | Empreinte du jeton du cookie d'un visiteur (jamais le jeton) |
| `compteId` | compte client, facultatif, unique | Panier d'un client connecté |
| `creeLe`, `modifieLe` | dates | Panier anonyme inactif depuis 30 jours supprimé |

### Ligne de panier

| Champ | Type | Règles |
|---|---|---|
| `id`, `panierId` | | |
| `defaultCode` | texte | Variante d'Odoo |
| `formule` | `achat` / `mise_a_disposition` | Le financement n'entre pas au panier (demande F04) |
| `quantite` | entier ≥ 1 | Une ligne par (référence, formule) : un nouvel ajout augmente la quantité |
| `prixHtConstate` | centimes | Prix lu à l'ajout, pour signaler un changement |
| `ajouteLe` | date | |

## 4. Paramètres ajoutés (back-office)

| Clé | Contenu | Valeur initiale |
|---|---|---|
| `services.hebergement.badge` | Badge de la page hébergement (vide = retiré) | `En préparation` |
| `services.<page>.tarif` | Tarif HT standard affiché, facultatif | vide |
| `financement.mention` | Mention sous la mensualité | « Montant indicatif, sous réserve d'acceptation par notre partenaire financier. » |

## 5. Réinitialisation de la démonstration (rappel F11)

Les paniers et demandes de devis des séances sont supprimés. Les contenus du catalogue, les
sous-catégories et les paramètres sont **conservés** (données réelles du site).
