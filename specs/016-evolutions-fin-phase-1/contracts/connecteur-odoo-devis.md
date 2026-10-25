# Contrat — opérations de devis du connecteur Odoo (F16)

Domaine `commandes` du connecteur Odoo. Mêmes données et mêmes erreurs en démonstration et en
réel (principe III). Mode réel : `ConfigurationIncomplete` jusqu'à F14.

| Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `creerDevis` | partenaire, lignes du panier (article, configuration, formule, quantité), adresse et mode de livraison, code promo éventuel, clé d'idempotence | `{ ref, creeLe, validiteLe, lignes, totaux HT/TVA/TTC, fraisPort }` (calcul identique à `calculerDevis`) | `NotFound` (article), `ValeurRefusee` (panier vide, article indisponible), `ServiceUnavailable` |
| `listerDevis` | partenaire | devis du plus récent au plus ancien : `{ ref, creeLe, validiteLe, totalTtc, etat: valide \| expire \| commande, commandeRef? }` | `ServiceUnavailable` |
| `lireDevisPdf` | partenaire, ref | PDF (octets) ; mention « FICTIF » en démonstration | `NotFound` (ref d'un autre partenaire comprise), `ServiceUnavailable` |
| `confirmerDevis` | partenaire, ref, paiement (comme `creerCommande`) | la commande (même forme que `creerCommande`), prix du devis | `ValeurRefusee` (devis expiré ou déjà commandé), `NotFound`, `ServiceUnavailable` |

Règles : la validité vient des paramètres commerciaux d'Odoo ; un devis ne réserve pas de
stock ; la confirmation applique les contrôles de disponibilité de F04 ; un même `creerDevis`
répété avec la même clé renvoie le même devis.

Tests de contrat : `tests/contract/odoo/devis.test.ts` (communs aux deux modes).
