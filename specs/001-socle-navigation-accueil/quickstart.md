# Guide de validation — F01 Socle, navigation et accueil

Comment vérifier que F01 fonctionne, une fois le module implémenté. Prérequis : ceux de F11
([../011-connecteurs-base-demonstration/quickstart.md](../011-connecteurs-base-demonstration/quickstart.md)),
base de démonstration remplie (`npm run demo:seed`), site lancé (`npm run dev`), mot de
passe du site de démonstration saisi.

## 1. Accueil (US1, SC-001, SC-010)

Ouvrir `/` sur ordinateur, tablette et mobile.
Attendu : les 8 sections dans l'ordre (héros, accès rapide, équipement et marques, offre
digitale et flexibilité, offre de bienvenue, service et fidélité, actualités, contact) ;
6 tuiles sur 3, 2 puis 1 colonne(s) ; badges « En préparation » sur l'hébergement des données
de santé et le logiciel Cloud ; bloc contact limité à « Régis Andrieu, fondateur » tant
qu'aucune coordonnée n'est saisie. Chaque tuile mène à sa page en un clic.

## 2. Navigation (US2, SC-002, SC-011, SC-012)

Sur trois pages différentes : ouvrir chaque méga-menu à la souris, au clavier (Tab, Entrée,
Échap) et au toucher ; vérifier que « ECG de repos » est dans le méga-menu « Holter ECG » ;
sur mobile, ouvrir le menu replié. Faire défiler : la barre reste en haut.

```bash
npm run test:e2e -- tests/e2e/f01
```

Attendu : tous les parcours de F01 passent, y compris le contrôle de tous les liens (aucune
erreur) et l'absence de défilement horizontal de 320 px à 1 920 px.

## 3. Bandeau promotionnel (US2-7, US2-8)

Dans `/admin/contenus/bandeau`, créer deux messages actifs. Attendu : ils défilent, le bouton
« Mettre en pause » arrête la rotation, l'option « animations réduites » du système la
suspend d'office. Désactiver les deux messages : le bandeau disparaît sans laisser d'espace.

## 4. Recherche (US4, SC-008, SC-009)

Saisir « os », puis « oscar », puis la référence « 98-0239-22 », puis « 98023922 ».
Attendu : suggestions groupées par type en moins d'une seconde ; le brassard Orbit 26-34 cm en
premier pour les deux formes de la référence ; prix HT ; « électrode » et « electrode » donnent
le même résultat. Saisir « zzzz » : message « aucun résultat » et chemins alternatifs.

## 5. Cookies (US3, SC-007)

Ouvrir le site dans une fenêtre de navigation privée. Attendu, tant qu'aucune mesure
d'audience n'est utilisée : un bandeau d'information indique que seuls des cookies
nécessaires sont utilisés ; « J'ai compris » le ferme ; « Gestion des cookies » (pied de page)
mène à la page Cookies. Dès qu'une finalité soumise au consentement existe : « Tout accepter »
et « Tout refuser » côte à côte, de même apparence, rien de déposé avant le choix, choix
modifiable par finalité.

## 6. Contact et newsletter (US5)

Envoyer un message depuis `/qui-sommes-nous`. Attendu : confirmation à l'écran, message dans
la boîte de démonstration (notification d'équipe), aucun envoi réel. Envoyer avec un champ
vide : erreur sur le champ, saisie conservée. Envoyer six fois en une heure : le sixième est
refusé avec un message clair.

S'inscrire à la newsletter depuis le pied de page. Attendu : email de confirmation dans la
boîte de démonstration ; l'inscription n'est effective qu'après le clic sur le lien ; l'email
contient un lien de désinscription.

## 7. Mini back-office (US6, SC-003)

Se connecter en administrateur de démonstration, ouvrir `/admin/contenus`. Modifier un message
du bandeau, une tuile, une actualité et le téléphone. Attendu : chaque changement est visible
sur le site en moins d'une minute et inscrit au journal des actions. Avec le compte support :
accès refusé.

## 8. Charte, accessibilité et performance (SC-004, SC-005, SC-006)

```bash
npm run lint
npm run check:contrast
npm run test:e2e
npm run test:lighthouse
```

Attendu : aucune couleur ni police hors des tokens ; aucun texte pastel ; aucune
non-conformité WCAG 2.2 AA (axe-core) ; cibles de 44 px, focus visible, animations coupées
en mode réduit ; élément principal de l'accueil, de la vue catalogue et d'une page de famille
affiché en moins de 2 s en profil mobile 4G.
