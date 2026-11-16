# Contrat : Catalogue du connecteur Odoo — évolution F27

Complète `specs/011-connecteurs-base-demonstration/contracts/odoo.md` §1. Tests communs aux deux
modes dans `tests/contract/odoo/`.

## listerCategories(): Promise<Categorie[]>

- Renvoie les cinq rubriques (niveau 0, `parentCode = null`) et, sous chacune, les catégories
  d'Odoo reliées, avec `rubrique` et `niveau` (1 ou 2).
- Les codes sont stables d'un appel à l'autre et uniques.
- Une catégorie d'Odoo non reliée à une rubrique n'apparaît pas.
- Une catégorie plus profonde que le niveau 2 n'apparaît pas ; ses articles sont rattachés à son
  ancêtre de niveau 2.
- Une catégorie peut n'avoir aucun article : c'est le domaine du site qui masque les vides.
- Erreurs : celles du connecteur (`ConnecteurIndisponible`), identiques dans les deux modes.

## listerArticles(code, filtres?)

- `code` : code de rubrique **ou** de sous-catégorie. Renvoie les articles de cette catégorie et
  de tous ses sous-niveaux.
- Code inconnu : liste vide (pas d'erreur), comme aujourd'hui pour une rubrique inconnue.
- Filtres existants inchangés (`marque`, `type`, `disponibilite`) ; `type: "consommable"` sert
  au panneau et à la page Consommables.

## Article et ResumeArticle

- Nouveau champ `categorieDetail` : code de la catégorie la plus précise de l'article (niveau ≤ 2),
  ou le code de la rubrique.
- `categorie` (rubrique) inchangé : adresses des fiches et pages de famille inchangées.

## Cas de test communs (démo et réel sur instantané enregistré)

1. Les rubriques sont toutes présentes, au niveau 0, dans l'ordre fixe.
2. « Câbles pour Holter ECG » a pour parent « Accessoires Holter ECG », lui-même enfant de
   `holter-ecg`.
3. `listerArticles("holter-ecg")` contient les articles des sous-catégories.
4. `listerArticles(<code de Sacoches pour Holter ECG>)` ne contient que les sacoches.
5. Aucune catégorie « Frais d'importation », « Logistique », « Transports In », « Services »,
   « Expenses », « Goods » n'est listée.
6. `categorieDetail` d'un câble HDMI = code de « Câbles pour Holter ECG ».
7. Un article de type « Consommable » rangé dans « MAPA / Consommables MAPA » a
   `categorie = "mapa"` et `type = "consommable"`.
