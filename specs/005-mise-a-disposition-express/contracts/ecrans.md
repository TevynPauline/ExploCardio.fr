# Écrans — F05

| Adresse | Accès | Contenu |
|---|---|---|
| `/mise-a-disposition` | tous | « Dépannage express » : équipements proposés, premier mois et mois suivants (HT, TTC), date de livraison la plus proche, heure limite, contenu du pack, bouton « Choisir » |
| Fiches produit (F03) | tous | Onglet « Mise à disposition » : date la plus proche, kit (requis ou « déjà en votre possession »), valeur de remplacement |
| `/panier` (F04) | tous | Kit ajouté d'office et marqué « obligatoire, vous le conservez » ; message si le kit est déjà possédé |
| `/commande/livraison` (F04) | compte | Choix de la date de livraison de chaque mise à disposition (jours ouvrés possibles, heure limite rappelée, délai des zones éloignées) |
| `/commande/recapitulatif` (F04) | compte | Pack, premier mois, mois suivants, date de livraison, prochaine échéance, valeur de remplacement, conditions de location à accepter ; message pour un compte en attente |
| `/mon-compte/locations` | client | Locations en cours et commandées : appareil, n° de série (après expédition), début, prochaine échéance (HT et TTC), état ; actions : résilier, prolonger, étiquette de retour, passer à l'achat, passer au financement ; historique des locations terminées et factures |
| `/mon-compte/locations/[ref]/resilier` | client | Confirmation : date de fin, date limite de retour, fermeture de l'accès Cloud |
| `/mon-compte/locations/[ref]/etiquette` | client | PDF de l'étiquette de retour |
| `/admin/locations` | équipe | Lecture seule : commandées (dont expédition bloquée), en cours, impayés, retards de retour |
| `/admin/contenus/coordonnees` | admin | Section « Livraison et mise à disposition » : heure limite, jours non livrés, zones et délai, rappels |
| `/admin/demonstration/locations` | admin, démo | Préparer et expédier, marquer livrée, enregistrer un retour, enregistrer un kit, prélèvement échoué, régulariser, avancer la date |

Toutes les pages : charte, WCAG 2.2 AA (clavier, focus, cibles 44 px), 320 à 1 920 px sans
défilement horizontal, aucun champ de patient.
