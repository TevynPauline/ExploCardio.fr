# Modèle de données — F02 Comptes professionnels

**Date** : 2026-10-16
**Plan** : [plan.md](plan.md)

F02 complète la **base du site** de F11 ([../011-connecteurs-base-demonstration/data-model.md](../011-connecteurs-base-demonstration/data-model.md) §1)
et étend le **contrat du connecteur Odoo** de deux opérations. Les comptes, leur validation,
les consentements et le droit au cadeau sont des données réelles du site dès la phase 1 ;
la fiche client et la commande à 0 € sont dans Odoo (base fictive en phase 1).

---

## 1. Entités existantes complétées

### Utilisateur (F11, Better Auth)

Champs déjà présents : nom, prénom, civilité, email (unique), téléphone, spécialité, rôle,
email confirmé, double authentification. **Ajout** : `bloqueJusqua` (date, facultatif) pour
le blocage après échecs répétés.

### Compte client (F11)

| Changement | Détail |
|---|---|
| Statut `supprime` ajouté | Après une suppression RGPD (compte anonymisé) |
| SIRET **non unique** | Un SIRET peut être partagé par plusieurs comptes (structure) ; le RPPS reste unique |
| `valideLe`, `inscritLe` | Dates de validation et d'inscription |
| `newsletterAuto` | — non ajouté : l'état d'abonnement est lu dans les consentements (§2) |

Transitions autorisées (FR-010) :

```text
email_a_confirmer → en_attente → valide ⇄ suspendu
                              ↘ refuse
tout statut → supprime (demande RGPD)
email_a_confirmer → (suppression automatique après 30 jours)
```

Règle de commande (FR-011, R4) : seul `valide` peut commander ; `en_attente` peut commander
une mise à disposition express (F05), sans expédition avant validation.

### Adresse (F11)

Types `cabinet`, `livraison`, `facturation`. Règle : l'adresse de livraison est en France
métropolitaine — code postal de 5 chiffres, hors 97 et 98 (outre-mer) ; la Corse (20, 2A,
2B) est acceptée. Une case « identique à l'adresse du cabinet » recopie l'adresse.

### Consentement (F11)

Objets utilisés par F02 : `cgu_cgv` (obligatoire à l'inscription), `newsletter`. Origines :
`inscription`, `mon_compte`, `pied_de_page` (F01). Chaque ligne conserve la date, l'heure, le
texte présenté (FR-026) ; un désabonnement ajoute une ligne à l'état faux (FR-027). L'état
courant d'abonnement est la dernière ligne `newsletter` du compte.

Une inscription newsletter faite auparavant par le pied de page (F01) avec la même adresse
est rattachée au compte, sans doublon (cas limite).

### Paramètre (F11) — clés ajoutées par F02

| Clé | Contenu | Valeur initiale |
|---|---|---|
| `comptes.validation_auto` | Validation automatique après contrôle de format | `false` |
| `bienvenue.active` | Offre de bienvenue active (le texte est `accueil.offre_bienvenue` de F01, une seule source) | `true` |
| `comptes.specialites` | Liste ordonnée (JSON) | Cardiologie, Médecine générale, Médecine du sport, Pneumologie, Médecine vasculaire, Autre |

## 2. Nouvelles entités de la base du site

### Décision de compte

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `compteId` | compte client | |
| `decision` | énuméré | `validation`, `refus`, `suspension`, `retablissement` |
| `motif` | texte | Obligatoire pour un refus ou une suspension |
| `auteurId` | utilisateur, facultatif | Vide pour une validation automatique |
| `date` | date | |

Chaque décision est aussi inscrite au journal des actions (FR-016).

### Attribution du cadeau de bienvenue

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `numero` | texte | RPPS ou SIRET ; **unique** (SC-002) |
| `compteId` | compte client | |
| `etat` | énuméré | `droit_ouvert`, `en_attente_stock`, `remis` |
| `ouvertLe`, `remisLe` | dates | |
| `commandeRef` | texte, facultatif | Commande d'Odoo qui porte la ligne à 0 € |

Transitions : `droit_ouvert → remis` (stock disponible) ; `droit_ouvert → en_attente_stock →
remis` (rupture) ; `remis | en_attente_stock → droit_ouvert` si la première commande est
annulée avant expédition (US4-9). Le numéro reste marqué même si le compte est suspendu ou
supprimé (cas limite).

### Demande de changement de numéro

| Champ | Type | Règles |
|---|---|---|
| `id`, `compteId` | | |
| `ancienNumero`, `nouveauNumero` | texte | Format contrôlé (R2) |
| `etat` | énuméré | `en_attente`, `acceptee`, `refusee` |
| `motif`, `traiteePar`, `dates` | | |

### Échecs de connexion

| Champ | Type | Règles |
|---|---|---|
| `cle` | texte | Empreinte de l'email (jamais l'email en clair) |
| `premierEchec` | date | Fenêtre de 15 minutes |
| `compte` | entier | 5 échecs → blocage de 15 minutes (`Utilisateur.bloqueJusqua`) |

### Demande RGPD

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `compteId` | compte client, facultatif | Conservé anonymisé |
| `type` | énuméré | `export`, `suppression` |
| `etat` | énuméré | `recue`, `traitee`, `refusee` (location en cours, impayé) |
| `motif` | texte, facultatif | |
| `recueLe`, `traiteeLe` | dates | Délai d'un mois au plus (FR-039) |

## 3. Opérations ajoutées au contrat du connecteur Odoo

À reporter dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md),
avec leurs tests de contrat dans les deux modes :

| Domaine | Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|---|
| Fidélité | Lire l'offre de bienvenue | — | article offert (référence), disponibilité, ou « aucune offre » | `ServiceUnavailable` | F02, F04 |
| Clients | Archiver un partenaire | partenaire, clé | — (les factures restent conservées par Odoo) | `NotFound` | F02 (suppression RGPD) |

Opérations existantes utilisées : `clients.creerOuRetrouverPartenaire` (validation),
`clients.mettreAJourCoordonnees` (informations, adresses), `clients.lireSituation`
(export, refus de suppression), `commandes.creerCommandePayee` avec ligne `offerte`
(cadeau, appelée par F04).

Base de démonstration : le programme de fidélité de type « cadeau de bienvenue » désigne
l'article `EC-BIENVENUE-TENSIOMETRE` (déjà présent dans le catalogue de démonstration).

## 4. Réinitialisation de la démonstration (rappel F11)

Les comptes clients créés pendant les séances et leurs données (adresses, consentements,
décisions, attributions, demandes) sont supprimés ; les comptes de démonstration sont
recréés. Les **paramètres** de F02 sont conservés.
