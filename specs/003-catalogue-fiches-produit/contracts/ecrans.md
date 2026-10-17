# Contrat des écrans — F03

## Pages publiques

| Adresse | Contenu | Exigences |
|---|---|---|
| `/catalogue` | Les cinq catégories (F01, liens mis à jour vers les fiches) | FR-001 |
| `/holter-ecg`, `/holter-tensionnel`, `/epreuve-effort`, `/accessoires-consommables` | Introduction, filtres, cartes des articles publiés | FR-005 à FR-007, US1 |
| `/holter-ecg/ecg-de-repos` | Idem + formulaire « Vous cherchez un autre modèle ? » | FR-008, FR-009, US7 |
| `/<catégorie>/<slug>` | Fiche équipement ou fiche consommable selon le type d'article | FR-010 à FR-026, US2 à US5 |
| `/<catégorie>/<slug>?formule=achat\|mise-a-disposition\|financement&config=<réf>` | Fiche ouverte sur cette formule et cette configuration | US2-8 |
| `/<catégorie>/<ancien-slug>` | Redirection permanente vers l'adresse actuelle | R2 |
| `/<catégorie>/<slug>` d'un article retiré | « Ce produit n'est plus proposé » + lien vers la catégorie (statut 410) | Cas limite |
| `/services/hebergement-donnees-sante`, `/services/assistance`, `/financement`, `/services/installation-formation` | Offre, bénéfices, tarif HT standard, badge, action | FR-034, FR-035, US8 |
| `/panier` | Lignes ajoutées (lecture seule), mention « la commande arrive bientôt » | R6 (complété par F04) |

**Filtres d'une catégorie** : `?marque=<nom>&type=<slug>&dispo=disponible|delai|indisponible&tri=ordre|prix`.

**Cartes** : photo (ou emplacement provisoire), marque en surtitre, nom, prix HT « à partir
de » (prix mensuel si l'article n'est proposé qu'en mise à disposition), TTC en complément,
« Disponible en location », état « délai X jours » ou « indisponible ».

**Fiche équipement** : galerie ; marque, nom, description courte ; disponibilité (par
formule si elles diffèrent) ; pilules de formule ; panneau de la formule :

| Formule | Affiche | Action |
|---|---|---|
| Acheter | configurations (si plusieurs), référence, contenu, prix HT/TTC, disponibilité | « Ajouter au panier » |
| Mise à disposition | 1er mois, mois suivants, contenu du pack, kit requis (prix) | « Demander une mise à disposition » (F05 ; contact en attendant) |
| Financement | mensualité par durée (« à partir de »), mention indicative | « Demander mon financement » (F04 ; contact en attendant) |

Onglets (affichés seulement s'ils ont un contenu) : Caractéristiques techniques, Contenu du
coffret, Consommables compatibles (prix, ajout rapide), Logiciel associé, Documents (type,
taille), Garantie. Puis « Produits associés ».

**Fiche consommable** : conditionnements, prix unitaire et par lot, paliers dégressifs,
quantité, total, ajout rapide, équipements compatibles (liens vers leurs fiches).

**Connecteur Odoo indisponible** : contenus affichés ; prix et disponibilité remplacés par
« Information momentanément indisponible » ; pas d'ajout au panier ; lien vers le contact.

## Actions publiques

| Action | Entrée | Résultat |
|---|---|---|
| Ajouter au panier | référence, formule `achat`, quantité | Confirmation sans quitter la page (`role="status"`) ; refus si indisponible ou connecteur injoignable ; avertissement si le prix a changé |
| Demander un devis ECG de repos | modèle ou besoin, nom, email, téléphone, cabinet, message | Confirmation ; erreurs reliées aux champs, saisie conservée |

## Back-office

| Adresse | Rôle | Contenu |
|---|---|---|
| `/admin/catalogue` | admin, commercial (lecture) | Articles d'Odoo par catégorie, état du contenu (à rédiger, en préparation, publié, orphelin), recherche |
| `/admin/catalogue/[reference]` | admin | Données d'Odoo en lecture seule (« se gère dans Odoo ») ; formulaire : slug, sous-catégorie, ordre, textes, photos (texte de remplacement obligatoire), documents PDF, compatibilités, produits associés ; « Publier » / « Retirer » avec la liste de ce qui manque |
| `/admin/catalogue/sous-categories` | admin | Sous-catégories par catégorie, ordre |
| `/admin/catalogue/services` | admin | Badge et tarif des pages services, mention du financement |

Aucun écran ne permet de modifier un prix, un stock, une référence, une configuration ou une
formule (US6-4). « Catalogue » est ajouté à la navigation du back-office.
