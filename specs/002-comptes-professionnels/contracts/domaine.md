# Contrat du domaine « comptes » — utilisé par F04 et F05

Fonctions serveur livrées par F02 (`src/domaine/comptes/`), appelées par les modules de
commande. Elles passent par le registre des connecteurs pour tout accès à Odoo.

| Fonction | Entrée | Sortie | Règle |
|---|---|---|---|
| `peutCommander(compte, { miseADispositionExpress })` | compte client | `{ autorise: true }` ou `{ autorise: false, raison, message }` | Seul `valide` ; exception : `en_attente` pour la mise à disposition express (FR-011, SC-001) |
| `cadeauPourCommande(compte)` | compte client | ligne `{ defaultCode, quantite: 1, offerte: true }` ou `null` | Une seule fois par RPPS ou SIRET (SC-002) ; `null` si l'offre est inactive, le droit non ouvert ou déjà remis |
| `confirmerCadeauRemis(compte, commandeRef)` | compte, référence de commande | état `remis` ou `en_attente_stock` | Idempotent ; rupture → information du bénéficiaire et alerte de l'administrateur (FR-025) |
| `retablirCadeau(commandeRef)` | référence de commande annulée avant expédition | état `droit_ouvert` | US4-9 |
| `partenaireDuCompte(compte)` | compte client validé | référence du partenaire Odoo | Créé à la validation (FR-015) |

Tests : unitaires dans F02 (y compris demandes simultanées pour SC-002), parcours complets
dans F04.
