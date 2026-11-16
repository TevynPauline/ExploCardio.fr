# Contrat : données du menu (domaine → composants d'en-tête)

Préparées côté serveur par `lireNavigation()` (cache 5 min, étiquettes `catalogue` et
`contenus`), passées à `BarreNavigation`, `MegaMenu` et `MenuMobile`.

```text
Navigation = {
  entrees: EntreeNavigation[]        // exactement : produits, consommables, informatique, location, services
  liensSecondaires: Lien[]           // « Qui sommes-nous » (/qui-sommes-nous), « Contact » (/qui-sommes-nous#contact)
}

EntreeNavigation = {
  cle: "produits" | "consommables" | "informatique" | "location" | "services"
  libelle: string                    // « Produits », « Consommables », « Informatique médicale », « Location et financement », « Services »
  href: string                       // page d'ensemble de l'entrée
  colonnes: Colonne[]
  carte: CarteAppel | null
}

Colonne = { titre: string, href: string | null, liens: LienNiveau2[] }
LienNiveau2 = Lien & { enGras: boolean, sousLiens: Lien[] }   // enGras si la sous-catégorie a des enfants
Lien = { libelle: string, href: string, externe?: boolean }

CarteAppel  = { titre, texte, bouton: Lien }   // « Un projet informatique ? », « Vos consommables »
```

Règles :

- **produits** : colonnes Holter ECG, Holter tensionnel / MAPA, Épreuve d'effort, ECG de repos ;
  liens vers `<page de famille>?categorie=<code>` ; catégories sans article publié masquées ;
  aucun produit mis en avant ; lien final « Voir tous les produits » (`/catalogue`) ;
  connecteur indisponible → chaque colonne garde son titre et son lien de famille, sans liens.
- **consommables** : colonnes « Pour le Holter ECG », « Pour la MAPA », « Pour l'épreuve
  d'effort », « Pour l'ECG de repos », « Autres consommables » ; colonne sans article masquée ;
  liens vers les fiches produit (6 par colonne au plus) puis « Tous les consommables »
  (`/consommables`).
- **informatique** : liens vers les sections de `/informatique-medicale` (`#pca`, `#prestataire`,
  `#hebergement`, `#questionnaire`) ; carte d'appel vers `#questionnaire`.
- **location** : `/mise-a-disposition`, `/mise-a-disposition#depannage-express`, `/financement`.
- **services** : `/services/assistance`, `/aide`, `/services/installation-formation`.
- Aucun titre ne porte le motif « trois points ».
