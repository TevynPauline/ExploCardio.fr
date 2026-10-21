# Matrice des droits — F13 (D2)

`V` = voir, `M` = modifier, `—` = rubrique absente du menu et adresse refusée.

| Rubrique | Administrateur | Commercial | Support |
|---|---|---|---|
| À traiter (tableau de bord) | V | V (ses éléments) | V (ses éléments) |
| Clients : liste, fiche client | V M | V M | V |
| Clients : valider, refuser un compte | M | M | — |
| Clients : suspendre, rétablir un compte | M | — | — |
| Clients : demandes RGPD | V M | — | — |
| Demandes : financements, devis, messages de contact | V M | V M | — |
| Catalogue (contenus des produits) | V M | V M | — |
| Contenus (bandeau, tuiles, actualités, pages, menus, marques, coordonnées, centre d'aide) | V M | V M | — |
| Commandes, Locations (lecture d'Odoo) | V | V | V |
| Logiciels Cloud : consultation | V | V | V |
| Logiciels Cloud : ouvrir, fermer, confirmer | M | — | M |
| Emails (suivi, scénarios, modèles, campagnes) | V M | — | — |
| Paramètres : offre de bienvenue | V M | V M | — |
| Paramètres : tous les autres | V M | — | — |
| Équipe | V M | — | — |
| Journal | V | — | — |
| Démonstration (mode démonstration seulement) | V M | — | — |

```ts
export type Rubrique = "a_traiter" | "clients" | "demandes" | "catalogue" | "contenus" | "commandes" | "cloud" | "emails" | "parametres" | "equipe" | "journal" | "demonstration";
export type DroitFin = "comptes.valider" | "comptes.suspendre" | "comptes.rgpd" | "cloud.agir" | "parametres.bienvenue";

peut(role, rubrique | droitFin, "voir" | "modifier"): boolean      // pure
exigerDroit(rubrique | droitFin, "voir" | "modifier"): Promise<SessionEquipe>  // redirige sinon
```

Refus : page → `/admin?acces=refuse` ; action → même redirection, rien n'est modifié.
