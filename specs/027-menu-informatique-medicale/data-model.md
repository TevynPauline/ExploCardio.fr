# Data Model: F27 — Nouveau menu et page Informatique médicale

## Connecteur Odoo (aucune donnée copiée dans la base du site)

### Categorie (interface du connecteur, étendue)

| Champ | Type | Règle |
|---|---|---|
| code | texte | Rubrique (`holter-ecg`, `mapa`, `effort`, `ecg-repos`, `accessoires`) ou `<rubrique>/<slug du chemin relatif>` ; stable tant que le nom ne change pas dans Odoo |
| nom | texte | Nom d'Odoo (dernier segment) ; nom de rubrique pour les racines |
| ordre | entier | Rubriques : ordre fixe ; autres : alphabétique |
| parentCode | texte ou null | null pour une rubrique |
| rubrique | code de rubrique | Rubrique de la branche |
| niveau | 0 à 2 | 0 rubrique, 1 sous-catégorie, 2 sous-sous-catégorie (plus profond : rattaché au niveau 2) |

Seules les catégories reliées à une rubrique sont listées ; les catégories techniques (frais,
logistique, transport, services, dépenses, génériques) ne le sont jamais.

### Article / ResumeArticle (champ ajouté)

| Champ | Type | Règle |
|---|---|---|
| categorieDetail | code de Categorie | Catégorie la plus précise de l'article, ramenée au niveau 2 au plus ; égale à `categorie` si l'article est rangé directement dans la racine |

`type = "consommable"` (inchangé, propriété « Type d'article ») décide de la présence dans
« Consommables ».

### Base de démonstration

`product_category` reçoit les sous-catégories du rangement proposé à Régis
(`docs/rangement-categories-odoo.docx`), par exemple :

- Holter ECG → Enregistreurs Holter ECG, Logiciels Holter ECG, Kits Holter ECG, Accessoires
  Holter ECG (→ Câbles pour Holter ECG, Sacoches pour Holter ECG)
- MAPA → Enregistreurs MAPA, Accessoires MAPA (→ Brassards, Sacoches, Adaptateurs pour MAPA),
  Consommables MAPA
- Épreuve d'effort → Ergomètres et tables, Systèmes d'épreuve d'effort, Accessoires d'effort
- ECG de repos → Électrocardiographes, Systèmes par aspiration
- Consommables → Électrodes

Chaque modèle du seed reçoit sa sous-catégorie (`estFictif` inchangé).

## Base du site

### DemandeInformatique (nouvelle table `demande_informatique`)

| Champ | Type | Règle |
|---|---|---|
| id | cuid | |
| interets | liste | au moins un de `acces_distance`, `materiel`, `prestataire`, `ne_sait_pas` |
| medecins | entier | 1 à 50 |
| postes | entier | 1 à 200 |
| secretariat | booléen | |
| logiciels | objet | `{ holter, mapa, effort }` : valeur d'une liste fermée, `autre` (+ précision ≤ 60 car.) ou `ne_sait_pas` |
| prestataireActuel | énum | `oui_satisfait`, `oui_insatisfait`, `non` |
| delai | énum | `vite`, `trois_mois`, `information` |
| coordonnees | objet | nom (≤ 80), cabinet (≤ 120), codePostal (5 chiffres, France métropolitaine), email, telephone (format français) |
| creneau | énum | `matin`, `midi`, `apres_midi` |
| consentement | date | date du consentement (obligatoire) |
| compteId | texte ou null | compte du médecin connecté |
| etat | énum `EtatDemandeInformatique` | `nouvelle` → `en_cours` → `transmise` → `close` (tout retour arrière permis) |
| notes | texte ou null | ≤ 2 000 car., interne |
| traitePar | texte ou null | dernier membre de l'équipe ayant modifié |
| creeLe, modifieLe | dates | `modifieLe` sert de verrou optimiste (comme F13) |

Index : `(etat, creeLe)`. Chaque changement d'état ou de note est journalisé
(`journaliser(..., "demandes.informatique.suivi")`). Conservation : 3 ans après le dernier
contact (registre des traitements), suppression sur demande.

### ElementMenu (supprimée)

Produits phares et liens rapides du menu (F01) : table `element_menu` et énumérations
`EntreeMenu`, `TypeElementMenu` supprimées (décision de Régis du 2026-11-16).

### Suppressions

- Table `sous_categorie` et colonne `contenu_produit.sous_categorie_id` (R5).

### Contenus et paramètres (tables existantes)

- `contenu` : clés `informatique.entete`, `informatique.benefice-1..3`, `informatique.etape-1..3`,
  `informatique.hebergement`, `informatique.prestataire`, `informatique.partenaire` (titre +
  corps, valeurs par défaut dans le code).
- `parametre` : `partenaire.pca.lien` (adresse https, défaut le site public de PCA).

### Inchangé

- `inscription_ouverture` (F12) : reste consultable dans « Demandes → Ouverture ».
