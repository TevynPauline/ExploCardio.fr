# Guide de validation — F02 Comptes professionnels

Prérequis : ceux de F11 et de F01, base de démonstration remplie (`npm run demo:seed`), site
lancé, mot de passe du site de démonstration saisi. Les emails arrivent dans la boîte de
démonstration du back-office.

## 1. Inscription (US1)

Ouvrir `/inscription`. Vérifier : case newsletter décochée, case CGU et CGV distincte et
obligatoire, règles du mot de passe affichées en direct. Saisir un RPPS de 10 chiffres :
erreur sur le champ, saisie conservée. Saisir une adresse de livraison en 974 : refusée avec
l'explication. S'inscrire avec un RPPS fictif valide (`99…`, 11 chiffres) et la newsletter
cochée.
Attendu : page « Consultez votre boîte » ; email de confirmation dans la boîte de
démonstration ; connexion refusée tant que l'email n'est pas confirmé. Cliquer sur le lien :
compte « en attente de validation ». Réessayer avec le même RPPS : message neutre qui ne
révèle rien (SC-012).

## 2. Validation (US2)

En administrateur, `/admin/comptes` : le compte apparaît en attente avec identité, numéro,
cabinet et date. Le valider.
Attendu : statut « validé », partenaire créé dans la base de démonstration (référence
`FICT-P-…` sur le compte), email « votre compte est validé », journal. Refuser un autre compte
avec un motif : email de refus. Activer la validation automatique dans
`/admin/comptes/reglages`, inscrire un troisième compte : validé dès la confirmation.

## 3. Connexion et mot de passe (US3)

Se connecter, se déconnecter. Cinq mauvais mots de passe : compte bloqué 15 minutes, email
de blocage, message identique à un échec ordinaire. « Mot de passe oublié » : même message
pour une adresse connue ou inconnue ; le lien permet d'en choisir un nouveau (moins de
2 minutes, SC-008), les autres sessions sont fermées, un email de notification arrive.
Activer la double authentification dans « Mon compte › Sécurité », se reconnecter avec un
code, puis avec un code de secours.

## 4. Offre de bienvenue (US4)

Avec le compte validé et abonné : « Mon compte » indique que le tensiomètre sera joint à la
première commande. La remise elle-même (ligne à 0 € et stock) se vérifie par les tests du
domaine (`npm test`) et, à partir de F04, par le parcours de commande. Un compte non abonné
voit comment devenir bénéficiaire ; s'abonner depuis « Mon compte › Préférences » ouvre le
droit.

## 5. Mon compte et données (US5, US6)

Modifier le téléphone et l'adresse de livraison : enregistrés et reportés sur la fiche client
de démonstration. Changer d'email : la nouvelle adresse doit être confirmée, l'ancienne est
prévenue. Demander un changement de RPPS : visible dans `/admin/comptes/demandes`, non
appliqué. Ouvrir chaque rubrique : aucune erreur (« Bientôt disponible »).
Exporter ses données (mot de passe redemandé) : fichier JSON lisible en moins de 10 minutes.
Supprimer le compte : connexion impossible ensuite, adresse retirée de la newsletter,
partenaire archivé dans la base de démonstration. Avec le compte de démonstration
« client avec droits » (location en cours) : la suppression est refusée avec l'explication.

## 6. Contrôles automatiques

```bash
npm run lint
npm run check:contrast
npm test
npm run test:e2e -- tests/e2e/f02
```

Attendu : tous les tests passent ; aucune non-conformité WCAG 2.2 AA ; inscription et
connexion au clavier seul (SC-011) ; aucun compte non validé ne peut commander (SC-001,
tests du domaine) ; jamais deux cadeaux pour un même numéro, même en simultané (SC-002).
