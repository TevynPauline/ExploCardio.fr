# Research: F18 — Ajustements du site (lot A)

Aucune inconnue technique : toutes les décisions s'appuient sur des mécanismes déjà en place.

## R1 — Où appliquer la règle « hors Corse »

- **Decision** : modifier la fonction commune de `src/domaine/comptes/adresses.ts`
  (`codePostalMetropole`, renommée `codePostalLivrable`) pour exclure les codes postaux
  commençant par 20, et réutiliser `refusLivraison` et `MESSAGE_HORS_METROPOLE` partout.
- **Rationale** : l'inscription (`inscription.ts`), le profil (`profil.ts`), le tunnel
  (`tunnel.ts`) et le devis (`devis-client.ts`) passent déjà par ces deux fonctions ; un seul
  point de vérité évite d'oublier un parcours. La mise à disposition et le dépannage express
  passent par le tunnel ou l'inscription.
- **Alternatives considered** : paramètre de zones au back-office (rejeté : le périmètre de
  livraison est une règle du site, pas un réglage à changer souvent) ; liste de départements
  dans Odoo (rejeté : aucun besoin en phase 1, et Odoo ne décide pas de l'éligibilité).

## R2 — Devis déjà émis vers la Corse

- **Decision** : « Commander » un devis recompose le panier puis passe par le tunnel, dont
  l'étape adresses refuse déjà une adresse non livrable ; on ajoute la même vérification au
  moment de « Commander » pour afficher le message tout de suite, sans recomposer le panier.
- **Rationale** : le médecin comprend d'emblée qu'il doit nous contacter ; aucun devis n'est
  modifié en base.
- **Alternatives considered** : expirer les devis concernés (rejeté : action irréversible sur
  des documents d'Odoo, inutile en démonstration).

## R3 — Boutons de quantité

- **Decision** : composant `ChampQuantite` (bouton « − », `input type="number"` sans flèches
  natives, bouton « + »), utilisé par `LignePanier` et `ChoixConditionnement`. Les boutons
  appellent la même fonction que la saisie ; la quantité est annoncée par une zone `aria-live`
  polie.
- **Rationale** : les flèches natives n'apparaissent qu'au survol sur ordinateur et jamais sur
  écran tactile ; un composant commun garde le même comportement partout.
- **Alternatives considered** : forcer l'affichage des flèches natives par CSS (rejeté :
  impossible de façon fiable selon les navigateurs, cibles trop petites pour le WCAG).

## R4 — Fenêtre de confirmation

- **Decision** : élément `<dialog>` natif ouvert avec `showModal()`, comme `MenuMobile` (F16) :
  fond inerte, focus retenu, Échap géré par le navigateur ; clic à l'extérieur détecté sur le
  fond ; focus rendu au bouton d'origine à la fermeture.
- **Rationale** : accessible sans dépendance, déjà éprouvé dans le projet (tests axe verts).
- **Alternatives considered** : `window.confirm` (rejeté : hors charte, texte non maîtrisé) ;
  bibliothèque de modales (rejeté : dépendance inutile).

## R5 — Barre de recherche visible

- **Decision** : `Recherche` rend, à partir de 1 024 px, le champ de la combobox directement
  dans l'en-tête (la liste de suggestions reste un panneau sous le champ) ; en dessous, le
  bouton loupe actuel ouvre le même champ. La logique (attente de 150 ms, annulation, groupes,
  clavier) est partagée.
- **Rationale** : le comportement de recherche de F01 est conservé à l'identique ; seul
  l'affichage change selon la largeur.
- **Alternatives considered** : deux composants distincts (rejeté : doublon de la logique de
  combobox).

## R6 — Lien « Mon compte »

- **Decision** : `BarreNavigation` garde la lecture de session dans le navigateur ; non
  connecté, le lien vise `/connexion?retour=/mon-compte`. Libellé « Mon compte » seul.
- **Rationale** : la page de connexion gère déjà `retour` et propose « Créer un compte ».
- **Alternatives considered** : faire de `/mon-compte` une redirection serveur vers la
  connexion (rejeté : inutile, le lien suffit, et l'accès direct non connecté est déjà protégé).

## R7 — Tests existants touchés

- `tests/unit/comptes/adresses.test.ts`, `tests/unit/f16/metropole.test.ts`,
  `tests/e2e/f16/hors-metropole.spec.ts`, `tests/e2e/f16/presentation.spec.ts` acceptent ou
  citent la Corse : à mettre à jour.
- Les tests e2e qui cliquent sur « Retirer » (F04, F05, F16) doivent confirmer la fenêtre ;
  ceux qui ciblent « Mon compte / Connexion » doivent viser « Mon compte ».
- `tests/unit/location/calendrier.test.ts` (zones sans livraison au lendemain) reste valable
  pour le continent ; ses cas corses deviennent sans objet pour la commande en ligne.
