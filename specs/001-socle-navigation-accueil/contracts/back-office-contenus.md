# Contrat du mini back-office des contenus — F01

Rubrique `/admin/contenus` du back-office de F11. **Administrateurs uniquement**, double
authentification obligatoire (F11) ; un commercial, un membre du support, un client ou un
visiteur est refusé (US6-5). Chaque enregistrement est inscrit au journal des actions (auteur,
date, valeur avant et après) et rend la modification visible sur le site en moins d'une
minute (SC-003).

| Écran | Chemin | Actions | Validation |
|---|---|---|---|
| Bandeau promotionnel | `/admin/contenus/bandeau` | Ajouter, modifier, ordonner, activer ou désactiver un message ; dates de début et de fin | Texte de 1 à 140 caractères ; fin après début ; lien interne existant ou `https://` |
| Tuiles d'accès rapide | `/admin/contenus/tuiles` | Modifier titre, phrase, lien, badge, fond des 6 tuiles ; ordre | Titre ≤ 40, phrase ≤ 120 caractères ; lien obligatoire et valide ; fond parmi ceux de la charte |
| Actualités | `/admin/contenus/actualites` | Créer, modifier, publier, retirer ; image facultative | Titre obligatoire ; image avec texte de remplacement obligatoire ; types d'image autorisés, 2 Mo au plus |
| Coordonnées et textes | `/admin/contenus/coordonnees` | Email, téléphone, adresse, destinataire des messages, texte de l'offre de bienvenue, engagements de réactivité, badges « En préparation », motifs du formulaire | Email et téléphone au bon format ; un champ vide masque la ligne partout (US6-4) |
| Menus | `/admin/contenus/menus` | Produits phares (référence d'article) et liens rapides de chaque entrée | Référence existante dans le catalogue ; 4 + 4 au plus par entrée |
| Marques | `/admin/contenus/marques` | Ajouter, modifier, ordonner, masquer ; logo | Nom unique ; mêmes règles d'image |

Messages d'erreur en français, reliés au champ concerné ; la saisie est conservée.
