# Contrat de la recherche — F01

## `GET /api/recherche?q={texte}`

Route serveur du site (pas un connecteur). Soumise à l'accès du site de démonstration en
phase 1 (F11).

**Entrée** : `q`, texte saisi. Moins de 2 caractères utiles : réponse vide.

**Sortie** (JSON) :

```json
{
  "requete": "orbit 26",
  "groupes": [
    {
      "type": "produits | consommables | services | tutoriels | faq",
      "libelle": "Consommables",
      "elements": [
        {
          "titre": "Brassard MAPA Orbit — 26-34 cm",
          "sousTitre": "SunTech · réf. 98-0239-22",
          "destination": "/accessoires-consommables#EC-SUN-ORBIT-M",
          "prixHt": 5900,
          "correspondanceExacte": false
        }
      ]
    }
  ],
  "indisponible": false
}
```

**Règles**

- Groupes dans l'ordre : produits (équipements et logiciels), consommables (consommables et
  accessoires), services, tutoriels, FAQ ; un groupe vide est omis (US4-5).
- 8 éléments par groupe au plus dans les suggestions ; la page `/recherche` montre tout.
- Normalisation : casse, accents, tirets, points, espaces et barres obliques ignorés (FR-012).
- Une référence interne ou fabricant **exacte** (après normalisation) place l'article en
  premier de son groupe et son groupe en premier (FR-011, SC-009).
- Prix en centimes d'euro **HT** (FR-014) ; absent pour les services.
- `indisponible: true` si l'index ne peut pas être construit (panne du connecteur Odoo) ; la
  page affiche alors une invitation à utiliser la navigation.
- Temps de réponse visé : moins de 300 ms côté serveur ; suggestions affichées en moins
  d'une seconde après le deuxième caractère (SC-008).
- Aucune donnée personnelle n'est enregistrée ; les recherches ne sont pas journalisées.

## Composant de recherche (en-tête)

- Champ avec libellé accessible « Rechercher un produit, une référence ou un service ».
- Liste de suggestions au modèle « combobox » (WAI-ARIA) : flèches pour parcourir, Entrée pour
  ouvrir, Échap pour fermer ; nombre de résultats annoncé aux lecteurs d'écran.
- Entrée sans suggestion choisie : page `/recherche?q=`.
- Sans résultat : message clair et liens vers les familles et le contact (FR-013).
