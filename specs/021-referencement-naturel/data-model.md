# Data model — F21 Référencement naturel

Toutes les données de F21 sont des **contenus du site** (base du site), réelles dès la phase 1,
jamais envoyées à Odoo. Aucune donnée de patient.

## ReglageReferencement (nouveau, lot 1)

Titre et description saisis dans le back-office pour une page indexable.

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `cible` | texte, **unique** | `accueil`, `page:<nom>` (clé de `PAGES_TEXTE`), `produit:<defaultCode>`, `aide:<slug>` ; plus tard `guide:<slug>`. Le produit est repéré par sa référence Odoo, stable même si son adresse change (`anciensSlugs`). |
| `titre` | texte, facultatif | 1 à 120 caractères après suppression des espaces ; avertissement au-delà de 60 (suffixe « — ExploCardio.fr » compris). Vide = titre automatique. |
| `description` | texte, facultatif | 1 à 300 caractères ; avertissement au-delà de 160. Vide = description automatique. |
| `modifieLe` | date | mise à jour automatique |
| `modifiePar` | texte | libellé de l'auteur (le détail est dans `JournalAction`) |

- Un réglage dont les deux champs sont vides est supprimé (retour à l'automatique).
- Chaque création, modification ou suppression ajoute une ligne `JournalAction`
  (`action = "referencement.modifier"`, `objet = cible`).
- Un produit retiré du catalogue garde son réglage (réutilisé s'il revient) ; il n'apparaît plus
  dans le contrôle.

## Métadonnées en vigueur (calculées, non stockées)

`metadonneesReferencement(cible, auto)` → `{ titre, description, origineTitre, origineDescription }`

- `auto.titre` : nom de la page (fiche : marque + nom ; catégorie : libellé + « matériel
  médical » si la place le permet), coupé au mot pour tenir en 60 caractères avec le suffixe.
- `auto.description` : fiche → `textes.descriptionCourte` ; page texte → premières phrases du
  texte en vigueur, sans balisage ; aide → `resume` ; coupée au mot à 160 caractères avec « … ».
- Unicité : contrôlée par la page `/admin/referencement` (doublons signalés), pas imposée.

## Politique d'indexation (calculée)

`politiqueIndexation(hote, env)` → `"attente" | "ouvert" | "ferme"`

| Hôte / configuration | Résultat |
|---|---|
| hôte présent dans `DOMAINES_PAGE_ATTENTE` | `attente` |
| sinon `SITE_MODE=prod` | `ouvert` |
| tout autre cas (démo, variable absente, valeur inconnue, hôte absent) | `ferme` |

`origineCanonique(politique, env)` : `attente` → `https://<premier domaine d'attente>` ;
`ouvert` → `SITE_URL` ; `ferme` → `SITE_URL` (sans effet, rien n'est indexable).

## Images (existant, complété)

- `PhotoProduit.texteRemplacement`, `Contenu.images[].texteRemplacement`,
  `ContenuAide.etapes[].texteRemplacement` : déjà obligatoires ; F21 ajoute au contrôle les
  textes vides, égaux au nom de fichier ou identiques au nom du produit pour plusieurs photos.
- Logos de `Marque` : texte = `nom` de la marque (pas de champ nouveau).

## Lot 2 (esquisse)

- **Validation éditoriale** : sur `Contenu` (textes de pages) et `ContenuProduit` (textes),
  champs `valideLe` / `validePar` ; la publication d'un texte de catégorie ou de fiche
  prioritaire exige la validation de Régis.
- **Mots-clés** : tenus dans `docs/seo/mots-cles.xlsx`, pas en base.

## Lot 3 (esquisse)

- **Guide** : `ContenuAide` de type `guide` (valeur ajoutée à `TypeContenuAide`) avec `auteur`,
  `fonctionAuteur`, `corps` (Markdown sûr), `references` (produits liés), `publieLe`,
  `modifieLe`.
