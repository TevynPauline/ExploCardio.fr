# Contrat des pages et des liens — F01

Toute destination de l'en-tête, de l'accueil et du pied de page mène à une **page existante**
(FR-046, SC-012). Quand le module qui doit la fournir n'est pas encore livré, F01 fournit une
page de présentation simple, jamais une erreur ni une page d'attente vide.

## Pages livrées par F01

| Chemin | Page | Contenu | Remplacée ou enrichie par |
|---|---|---|---|
| `/` | Accueil | 8 sections dans l'ordre de FR-015 | — |
| `/catalogue` | Vue d'ensemble des familles | Familles de produits, services | F03 |
| `/holter-ecg` | Famille Holter ECG | Présentation + articles (prix HT) ; lien vers l'ECG de repos | F03 |
| `/holter-ecg/ecg-de-repos` | ECG de repos | Présentation + articles | F03 |
| `/holter-tensionnel` | Famille Holter tensionnel / MAPA | Présentation + articles | F03 |
| `/epreuve-effort` | Famille Épreuve & écho d'effort | Présentation + articles, environnement d'effort | F03 |
| `/accessoires-consommables` | Accessoires & consommables | Présentation + articles | F03 |
| `/services` | Services | Liens vers les quatre services | F03 |
| `/services/hebergement-donnees-sante` | Hébergement des données de santé | Badge « En préparation » | F12 |
| `/services/assistance` | Assistance et service | Modèle gagnant-gagnant, contact WhatsApp | F06, F09 |
| `/financement` | Financement | Principe, formule « Demander mon financement » → contact (motif financement) | F04 |
| `/mise-a-disposition` | Mise à disposition | Principe, « Demander une mise à disposition » → contact (motif présélectionné) | F05 |
| `/qui-sommes-nous` | Qui sommes-nous / Contact | Équipe, expertise, partenariats, coordonnées renseignées, formulaire | — |
| `/recherche?q=` | Résultats de recherche | Groupes par type, chemins alternatifs | — |
| `/newsletter/confirmation?jeton=` | Confirmation d'inscription | Message de réussite ou de lien expiré | — |
| `/newsletter/desinscription?jeton=` | Désinscription | Confirmation | — |
| `/panier` | Panier | « Votre panier est vide » et lien vers le catalogue | F04 |
| `/mentions-legales`, `/cgv`, `/cgu`, `/confidentialite`, `/cookies` | Pages légales | Texte fourni, ou « Texte en cours de validation » | Textes d'ExploCardio.fr |
| page introuvable | Erreur 404 | Accueil, recherche, familles | — |

« Mon compte / Connexion » mène à `/connexion` (F11), remplacée par l'espace client de F02.

## Destinations des éléments de l'accueil

| Élément | Destination |
|---|---|
| Bouton « Découvrir le catalogue » | `/catalogue` |
| Bouton « Demander une mise à disposition » | `/mise-a-disposition` |
| Tuile Holter ECG | `/holter-ecg` |
| Tuile Holter tensionnel | `/holter-tensionnel` |
| Tuile Épreuve d'effort | `/epreuve-effort` |
| Tuile Hébergement des données de santé | `/services/hebergement-donnees-sante` |
| Tuile Assistance et service | `/services/assistance` |
| Tuile Financement | `/financement` |
| Bouton de l'offre de bienvenue | `/connexion` puis, dès F02, la création de compte |

Les liens des tuiles sont modifiables dans le mini back-office ; un lien interne vers une page
inexistante est refusé à l'enregistrement.

## Contrôle automatique

Un test parcourt tous les liens de l'en-tête (méga-menus compris), de l'accueil et du pied de
page, sur ordinateur et sur mobile, et échoue si l'un renvoie une erreur (SC-012). Il vérifie
aussi qu'aucune page n'a de défilement horizontal de 320 px à 1 920 px (SC-006).
