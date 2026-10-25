# Data Model — F16

## Base du site

### Contenu (existant, F01/F13) — ajouts

| Champ | Changement |
|---|---|
| `type` | enum `TypeContenu` + `vignette`, `argument` (`actualite` inchangé : section et écran conservés) |
| `libelleLien` | **nouveau**, `String?` — texte du bouton d'une vignette, 30 caractères au plus |

**Vignette** (`type = vignette`) : `titre` (≤ 60), `corps` = phrase (≤ 140), `lien` (vérifié
comme F13, obligatoire si `libelleLien`), `libelleLien` (≤ 30), `images[0]` + texte de
remplacement (facultatif ; obligatoire si image), `ordre`, `debut`/`fin` (facultatifs), `etat`
(preparation | publie | retire), `cle` = `offre-bienvenue` pour la vignette de l'offre.
Visible si `etat = publie`, dans sa période, et (pour `offre-bienvenue`) si
`bienvenue.active = true`.

**Argument** (`type = argument`) : `cle` ∈ {`intro`, `1`, `2`, `3`, `4`} ; `titre` (≤ 60, vide
pour l'intro), `corps` (≤ 200).

Données de départ : vignette « Offre de bienvenue », deux vignettes d'exemple (une offre, un
produit phare), cinq arguments (textes de la spec).

### CompteClient (existant, F02) — ajouts et changements

| Champ | Changement |
|---|---|
| `numeroVerification` | **nouveau**, enum `VerificationNumero` (`a_verifier`, `verifie`, `refuse`), `null` sans numéro |
| `numeroVerifieLe`, `numeroVerifiePar`, `motifRefusNumero` | **nouveaux**, facultatifs |
| `siret` | contient un SIRET (14) ou un SIREN (9) ; pas d'unicité (déjà le cas) |
| `rpps` | plus renseigné par l'inscription (colonne conservée, vide) |
| `type` | plus demandé ; `structure` par défaut pour les nouveaux comptes |
| `statut` | `email_a_confirmer` → `valide` à la confirmation de l'email ; `en_attente` n'est plus atteint |

Transitions du numéro : `null` → `a_verifier` (saisie à l'inscription, dans Mon compte ou dans le
tunnel) → `verifie` | `refuse` (équipe, motif obligatoire pour un refus). Un nouveau numéro saisi
repasse à `a_verifier`. `refuse` → statut du compte `suspendu`.

### Parametre (existant, F13)

| Clé | Défaut | Rôle |
|---|---|---|
| `comptes.numero_exige` | `premiere_commande` | moment où le SIRET/SIREN est exigé (`premiere_commande` \| `inscription`) ; remplace `comptes.validation_auto` |
| `accueil.offre_bienvenue` | — | retiré (remplacé par la vignette) |
| `contact.motifs` | + « Commande hors métropole » | motif du contact prérempli |

### Adresses (Mon compte, inscription, tunnel)

Champ `pays` : `FR` (défaut) ou `autre`. Adresse de livraison acceptée si `pays = FR` et code
postal hors 97/98.

## Base de démonstration (Odoo fictif)

### CommandeVente (`sale_order`) — ajouts

| Champ | Changement |
|---|---|
| `statut` | enum `StatutCommande` + `devis` |
| `validiteLe` | **nouveau**, `DateTime?` — fin de validité d'un devis |
| `devisRef` | **nouveau**, `String?` — sur une commande issue d'un devis (le devis confirmé garde sa référence, comme dans Odoo) |

États d'un devis : `devis` (valide si `validiteLe` > maintenant, sinon expiré) → confirmé par
`confirmerDevis` (devient la commande, statut de paiement habituel de F04).

### Paramètres commerciaux fictifs

`devis.validite_jours` = 30 (règle commerciale lue dans Odoo).
