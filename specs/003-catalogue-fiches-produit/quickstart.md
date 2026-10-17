# Guide de validation — F03 Catalogue et fiches produit

Prérequis : ceux de F11, F01 et F02 ; base de démonstration remplie (`npm run demo:seed`) ;
site lancé ; mot de passe du site de démonstration saisi.

## 1. Parcourir une catégorie (US1)

Ouvrir `/holter-tensionnel`. Attendu : introduction, cartes (photo ou emplacement, marque,
nom, prix HT « à partir de » et TTC, « Disponible en location »). Filtrer par marque SunTech,
puis par disponibilité : nombre de résultats annoncé, filtres retirables. Combiner des
filtres sans résultat : message et « Tout retirer ». Cliquer une carte : la fiche s'ouvre.

## 2. Choisir sa formule (US2)

Sur la fiche d'un Holter tensionnel qui propose les trois formules : passer d'« Acheter » à
« Mise à disposition » puis « Financement » ; prix, contenu et bouton changent sans
rechargement. Changer de configuration : prix, référence et disponibilité suivent. Copier
l'adresse et l'ouvrir dans un autre onglet : même formule. Ajouter au panier sans être
connecté : confirmation ; `/panier` liste la ligne.
Se connecter avec le compte de démonstration du Dr Delvaux-Arnoux : la mensualité forcée
remplace le calcul sur `EC-DMS-3004L-CLOUD`.

## 3. Consommables (US3)

Ouvrir la fiche des électrodes Holter : prix unitaire et par lot, paliers. Passer à la boîte
de 500 et augmenter la quantité : prix unitaire et total suivent. Ajout rapide : confirmation
sans quitter la page. Depuis l'onglet « Consommables compatibles » d'un Holter ECG : même
ajout rapide.

## 4. Onglets et disponibilité (US4, US5)

Ouvrir chaque onglet à la souris puis au clavier (flèches). Télécharger une notice (type et
taille affichés). Dans **Démonstration → Stocks**, passer un article en rupture : au
rechargement (moins d'une minute), la carte et la fiche indiquent « indisponible » ou
« délai X jours » ; l'ajout au panier n'est plus proposé pour « indisponible ». Dans
**Démonstration → Pannes**, couper Odoo : la fiche reste lisible, sans prix ni
disponibilité affirmés, et invite à réessayer.

## 5. Contenus et publication (US6)

En administrateur, `/admin/catalogue` : ouvrir un article, constater que prix et stock sont
en lecture seule (« se gère dans Odoo »). Retirer sa description courte et tenter de
publier : refus avec la liste de ce qui manque. Rédiger, ajouter une photo et son texte de
remplacement, publier : l'article apparaît dans sa catégorie et dans la recherche. Le
remettre en préparation : il disparaît du public et de la recherche.

## 6. ECG de repos et services (US7, US8)

`/holter-ecg/ecg-de-repos` : envoyer « Vous cherchez un autre modèle ? » avec un champ
manquant (erreur, saisie conservée), puis complet (confirmation, notification dans la boîte
de démonstration). Ouvrir les quatre pages services et suivre leur bouton ; l'hébergement
porte « En préparation ».

## 7. Contrôles automatiques

```bash
npm run lint
npm run check:contrast
npm test
npm run test:e2e -- tests/e2e/f03
npm run test:lighthouse
```

Attendu : tous les tests passent ; 3 clics au plus pour chaque article publié (SC-004) ;
aucun « prix sur demande » (SC-005) ; aucune non-conformité WCAG 2.2 AA ; aucun défilement
horizontal de 320 à 1 920 px ; affichage principal d'une fiche en moins de 2 s en 4G mobile.
