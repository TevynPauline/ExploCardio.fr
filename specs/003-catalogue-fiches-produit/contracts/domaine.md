# Contrat du domaine — F03 (`src/domaine/catalogue/`)

Fonctions utilisées par les pages de F03 et par les modules suivants (F04, F05, F06, F09,
F13). Montants en centimes HT ; les erreurs du connecteur sont converties en état
`indisponible` pour l'affichage, jamais en erreur brute.

| Fonction | Entrée | Sortie | Utilisée par |
|---|---|---|---|
| `listerCategorie(categorie, filtres)` | code, `{ marque?, type?, dispo?, tri? }` | `{ cartes, filtresDisponibles, total, indisponible }` | pages catégorie |
| `lireFiche(categorie, slug, compte?)` | adresse, client connecté éventuel | `FicheEquipement \| FicheConsommable \| { redirection } \| { retire } \| null` | fiches |
| `prixTtc(prixHt, tauxTva)` | centimes, taux | centimes arrondis | partout |
| `mensualites(article, variante, mensualitesClient?)` | données d'Odoo | `[{ dureeMois, montantHt, source: client/general/calcul }]` | fiche, F04 |
| `prixPourQuantite(variante, quantite)` | variante, quantité | `{ prixUnitaireHt, totalHt, palier }` | fiche consommable, F04 |
| `ajouterAuPanier(panier, ligne)` | panier courant, `{ defaultCode, formule, quantite }` | `{ ajoutee, prixHt, prixAChange, delaiJours? }` ou refus motivé | fiches, F04 |
| `panierCourant()` | cookie ou session | panier (créé à la demande) | F03, F04 |
| `lignesPanier(panier)` | panier | lignes avec article et prix en vigueur | `/panier`, F04 |
| `peutPublier(defaultCode)` | référence | `{ ok, manquants: string[] }` | back-office |
| `publier`, `retirer`, `enregistrerContenu` | référence, contenu, auteur | — (journalisé, cache invalidé) | back-office, F13 |
| `articlesPublies()` | — | références et adresses des articles publiés | recherche (F01), plan du site |
| `cheminFiche(defaultCode)` | référence | adresse de la fiche ou `null` | F01 (menus, recherche), F04, F06, F09 |
| `envoyerDemandeDevis(saisie)` | formulaire | `{ ok }` ou erreurs par champ | ECG de repos |

`cheminArticle` de F01 (ancre dans la page de famille) est remplacé par `cheminFiche`.
