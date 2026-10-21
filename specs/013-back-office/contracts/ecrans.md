# Écrans — F13

| Adresse | Nouveau / existant | Rôle |
|---|---|---|
| `/admin` | refondu | « À traiter » : comptes à valider (prioritaires en tête), demandes nouvelles, messages nouveaux, accès Cloud en attente, erreurs de connecteurs (admin), selon le rôle |
| `/admin/clients` | nouveau (reprend comptes + assistance) | recherche (nom, cabinet, téléphone, email, RPPS, SIRET) ; onglets « À valider », « Tous » |
| `/admin/clients/[id]` | nouveau (reprend `/admin/comptes/[id]`) | fiche complète en lecture seule + actions selon le rôle |
| `/admin/comptes/*`, `/admin/assistance` | existants | redirigent vers `/admin/clients` (liens conservés) |
| `/admin/demandes/messages` | nouveau | messages de contact : états, note interne |
| `/admin/devis` | existant → modifiable | états, note interne |
| `/admin/parametres` | nouveau | par thème ; historique et « Remettre cette valeur » |
| `/admin/parametres/bienvenue` | nouveau (repris des réglages des comptes) | offre de bienvenue (admin, commercial) |
| `/admin/equipe` | nouveau | membres, inviter, rôle, désactiver, réactiver |
| `/admin/journal` | nouveau | onglets Connecteurs et Actions de l'équipe, filtres |
| `/admin/contenus/pages` et `[cle]` | nouveau | textes des pages : brouillon, aperçu, publier, revenir à l'origine |
| `/apercu/[type]/[id]` | nouveau | rendu d'un brouillon pour l'équipe, `noindex` |
| `/connexion?raison=inactivite` | existant + message | session fermée après inactivité |
