# Modèle de données — F01 Socle, navigation et accueil

**Date** : 2026-10-15
**Plan** : [plan.md](plan.md)

F01 n'ajoute **rien** à la base de démonstration : produits, catégories, références et prix
viennent du connecteur Odoo (principe III). Il complète la **base du site** créée par F11
([../011-connecteurs-base-demonstration/data-model.md](../011-connecteurs-base-demonstration/data-model.md) §1) :
les contenus éditoriaux sont réels dès la phase 1 et conservés à la réinitialisation de la
démonstration.

---

## 1. Entités existantes complétées

### Contenu (F11) — utilisé pour le bandeau, les tuiles et les actualités

Champs ajoutés :

| Champ | Type | Règles |
|---|---|---|
| `lien` | texte, facultatif | Chemin interne (`/…`) ou adresse `https://` ; vérifié à l'enregistrement |
| `ordre` | entier | Ordre d'affichage (bandeau, tuiles) |
| `badge` | texte, facultatif | Ex. « En préparation » (FR-021) |
| `fond` | énuméré, facultatif | Encart doux de la charte : `pale`, `blue-soft`, `lin`, `mint` (tuiles) |
| `typeActualite` | énuméré, facultatif | `actualite`, `nouveau_produit`, `nouvelle_offre` |
| `publieLe` | date, facultatif | Date affichée et tri des actualités (plus récentes d'abord) |

Règles par type :

| Type | Champs utilisés | Visible quand |
|---|---|---|
| `bandeau` | `corps` (texte court, 140 caractères au plus), `lien`, `ordre`, `debut`, `fin` | `etat = publie` et date du jour dans [`debut`, `fin`] (FR-002) |
| `tuile` | `titre` (40 caractères au plus), `corps` (phrase, 120 au plus), `lien` (obligatoire), `badge`, `fond`, `ordre` | Toujours 6 tuiles ; elles se modifient, ne s'ajoutent ni ne se suppriment (FR-017) |
| `actualite` | `titre`, `corps` (texte court), `images` (une, texte de remplacement obligatoire), `lien`, `typeActualite`, `publieLe` | `etat = publie` ; section masquée si aucune (cas limite) |
| `page` | réservé à F13 | — |

### Paramètre (F11) — clés utilisées par F01

| Clé | Contenu | Valeur initiale |
|---|---|---|
| `contact.email` | email affiché | vide (ligne masquée, FR-025) |
| `contact.telephone` | téléphone affiché | vide |
| `contact.adresse` | adresse affichée | vide |
| `contact.destinataire_messages` | adresse qui reçoit les messages du formulaire | vide : notification à l'administrateur de démonstration en phase 1 |
| `contact.motifs` | liste ordonnée des motifs du formulaire (JSON) | information produit, mise à disposition, financement, assistance et SAV, autre |
| `accueil.offre_bienvenue` | texte de l'encart lin | texte initial de FR-022 |
| `accueil.engagements_reactivite` | texte des engagements | vide : rien n'est affiché |
| `accueil.badge_hebergement` | badge « En préparation » de l'hébergement des données de santé | `En préparation` |
| `accueil.badge_logiciel_cloud` | badge « En préparation » du logiciel Cloud | `En préparation` |
| `contact.whatsapp` | numéro de la hotline (créé par F11, fictif en démonstration) | — |

Chaque modification est historisée (historique des paramètres de F11) et journalisée.

### Consentement (F11)

Utilisé pour l'inscription confirmée à la newsletter : `objet = newsletter`, `etat = vrai`,
`origine = pied de page`, `textePresente` = texte exact affiché. Une désinscription ajoute
une ligne `etat = faux` (historique jamais écrasé).

### Message de contact (F11)

Champs déjà présents : motif, coordonnées (nom, email, téléphone facultatif, cabinet
facultatif), texte, date, état (`nouveau`, `traite`). Aucune donnée de patient : un
avertissement est affiché au-dessus du champ message (FR-031).

## 2. Nouvelles entités de la base du site

### Marque partenaire

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `nom` | texte | Unique ; affiché en texte si pas de logo |
| `logo` | fichier image, facultatif | PNG, JPEG, WebP ou SVG nettoyé, 2 Mo au plus ; texte de remplacement = nom de la marque |
| `familles` | liste | `holter-ecg`, `mapa`, `effort` (une marque peut être dans plusieurs) |
| `ordre` | entier | Ordre dans la grille |
| `visible` | booléen | |

Données initiales (FR-019) : DMS ; SunTech ; Microlife ; IEM ; Norav ; Ergoline ; RAM ; Koch
Évolution — sans logo tant que les accords d'usage ne sont pas obtenus (décision D4).

### Élément de méga-menu

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `entree` | énuméré | `holter-ecg`, `holter-tensionnel`, `epreuve-effort`, `accessoires`, `services`, `financement`, `qui-sommes-nous` |
| `type` | énuméré | `produit_phare` (référence d'article d'Odoo, `default_code`) ou `lien_rapide` (libellé + lien) |
| `defaultCode` | texte, facultatif | Pour `produit_phare` ; si l'article n'existe plus, l'élément n'est pas affiché |
| `libelle`, `lien` | texte | Pour `lien_rapide` ; lien vérifié comme pour les contenus |
| `ordre` | entier | 4 produits phares et 4 liens rapides au plus par entrée |

Les **sous-catégories** ne sont pas stockées : elles viennent du catalogue (connecteur Odoo).
Le méga-menu « Holter ECG » contient toujours la sous-catégorie « ECG de repos » (FR-009).

### Inscription à la newsletter

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `email` | texte | Unique, en minuscules |
| `etat` | énuméré | `en_attente` → `confirmee` → `desinscrite` ; `en_attente` → `expiree` (7 jours) |
| `empreinteJeton` | texte | Empreinte du jeton de confirmation ou de désinscription ; le jeton lui-même n'est jamais stocké |
| `demandeeLe`, `confirmeeLe`, `desinscriteLe` | dates | |
| `textePresente` | texte | Texte du consentement affiché au moment de la demande |

Transitions : une nouvelle demande pour une adresse `en_attente`, `expiree` ou
`desinscrite` renvoie un email de confirmation (au plus un toutes les 10 minutes) ; une
adresse déjà `confirmee` ne reçoit rien de plus, et la réponse affichée est la même dans tous
les cas (R7).

### Limite d'envoi

Protection du formulaire de contact et de la newsletter (FR-032).

| Champ | Type | Règles |
|---|---|---|
| `cle` | texte | `formulaire:empreinte-de-l-adresse-IP` (jamais l'adresse en clair) |
| `fenetreDebut` | date | Fenêtre d'une heure |
| `compte` | entier | 5 envois de contact, 5 inscriptions par heure au plus |

Les lignes de plus de 24 heures sont supprimées par une tâche de fond quotidienne.

## 3. Données lues par le connecteur Odoo (aucune copie durable)

| Donnée | Opération du contrat (F11) | Utilisation |
|---|---|---|
| Catégories et sous-catégories | `catalogue.listerCategories` | Méga-menus, vue catalogue |
| Articles d'une famille | `catalogue.listerArticles` | Pages de famille, prix HT « à partir de », disponibilité |
| Produits phares | `catalogue.lireArticle` | Méga-menus |
| **Références pour la recherche** | **`catalogue.listerReferences` (nouvelle)** | Index de recherche en mémoire (R4) |

**Opération ajoutée au contrat du domaine catalogue** (à reporter dans
[../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md),
avec son test de contrat, dans les deux modes) :

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Lister les références | — | une ligne par variante : référence interne, référence fabricant, référence de l'article, nom, marque, type, catégorie, configuration, prix HT, disponibilité, marque « fictif » | `ServiceUnavailable` | F01 (recherche), F03 |

## 4. Données conservées dans le navigateur

| Cookie | Contenu | Durée | Nature |
|---|---|---|---|
| `ec_consentement` | version du bandeau, date, finalités acceptées | 6 mois | Strictement nécessaire (mémorise le choix) |
| `ec_demo_acces` | accès au site de démonstration (F11) | 30 jours | Strictement nécessaire |
| cookies de session (Better Auth, F11) | connexion | session / 7 jours | Strictement nécessaires |

Aucun cookie de mesure d'audience ni de contenu tiers n'est déposé tant que la décision D3
n'est pas prise et que le visiteur n'a pas accepté la finalité correspondante.

## 5. Réinitialisation de la démonstration (rappel F11)

Toutes les entités de F01 sont **conservées** par la réinitialisation (contenus, marques,
éléments de menu, paramètres), sauf les **messages de contact** (déjà remis à zéro par F11) et
les **inscriptions à la newsletter**, qui sont des données de test pendant la phase 1 et
rejoignent le périmètre de la réinitialisation.
