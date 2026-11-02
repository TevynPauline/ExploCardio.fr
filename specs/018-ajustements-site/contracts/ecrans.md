# Contrat des écrans — F18 lot A

| Écran | Changement | Comportement attendu |
|---|---|---|
| En-tête, dès 1 024 px | barre de recherche, libellés | Champ de recherche visible (loupe, « Rechercher un produit… ») ; « Panier » + pastille ; « Mon compte ». Aucun « Connexion ». Menu principal complet sur la seconde ligne (F16). |
| En-tête, sous 1 024 px | noms accessibles | Loupe, panier, compte en icônes ; noms « Rechercher », « Panier, N articles » / « Panier, vide », « Mon compte ». |
| Lien « Mon compte » | destination | Non connecté → `/connexion?retour=/mon-compte` ; connecté → `/mon-compte` (équipe : comportement actuel). |
| Panier (`/panier`) | quantité | Par ligne modifiable : bouton « Diminuer la quantité de {article} », champ « Quantité », bouton « Augmenter la quantité de {article} », visibles sans survol, 44 px ; « − » inactif à 1, « + » inactif au maximum ; prix en direct (F16). |
| Panier (`/panier`) | retrait | « Retirer » ouvre la fenêtre « Retirer cet article du panier ? » (nom de l'article, « Retirer », « Annuler »). Retrait seulement après confirmation ; message de statut ; focus sur l'article suivant ou le titre du panier. Kit obligatoire : pas de bouton (F05). |
| Fiche produit | quantité | Même composant « − / champ / + » que le panier. |
| Inscription, Mon compte → Adresses, tunnel (adresses) | aide et refus | Aide « Livraison en France métropolitaine continentale (hors Corse). » ; code postal en 20…, 97…, 98… ou autre pays → message unique + « Nous contacter ». |
| Panier, fiches, conditions de livraison (`MentionMetropole`) | texte | « Livraison en France métropolitaine continentale. Corse, outre-mer et étranger : nous contacter. » |
| Demande de devis ; « Commander » un devis | refus | Adresse de livraison en Corse → message unique + « Nous contacter » ; aucun devis créé ou commandé. |
| CGV (`/cgv#livraison`) | texte | France métropolitaine continentale ; Corse, outre-mer, étranger : nous contacter ; clause express sans la Corse. |
