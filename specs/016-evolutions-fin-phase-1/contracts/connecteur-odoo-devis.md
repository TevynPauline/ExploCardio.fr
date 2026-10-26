# Contrat — opérations de devis du connecteur Odoo (F16)

Domaine `commandes` du connecteur Odoo. Mêmes données et mêmes erreurs en démonstration et en
réel (principe III). Mode réel : `ConfigurationIncomplete` jusqu'à F14.

| Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|
| `creerDevis` | partenaire, lignes du panier (article, configuration, formule, quantité), adresse et mode de livraison, code promo éventuel, clé d'idempotence | `{ ref, creeLe, validiteLe, lignes, totaux HT/TVA/TTC, fraisPort }` (calcul identique à `calculerDevis`) | `NotFound` (article), `ValeurRefusee` (panier vide, article indisponible), `ServiceUnavailable` |
| `listerDevis` | partenaire | devis du plus récent au plus ancien : `{ ref, creeLe, validiteLe, totalHt, totalTtc, etat: valide \| expire \| commande, commandeRef? }` | `ServiceUnavailable` |
| `lireDevis` | partenaire, ref | le devis : demande (pour recomposer le panier), calcul complet, état | `NotFound` (ref d'un autre partenaire comprise), `ServiceUnavailable` |
| `lireDevisPdf` | partenaire, ref | PDF (octets) ; mention « FICTIF » en démonstration | `NotFound` (ref d'un autre partenaire comprise), `ServiceUnavailable` |
| confirmation | `creerCommandePayee` / `creerCommandeVirement` avec `devisRef` (mêmes paiements que F04) | la commande, **même référence que le devis** (confirmé, comme dans Odoo), prix du devis | un devis déjà commandé ou d'un autre client est ignoré (commande ordinaire) |

`calculerDevis` accepte aussi `devisRef` : un devis valable impose ses prix d'achat au panier et
au tunnel (un devis expiré ou déjà commandé ne compte plus). Le site vérifie l'état du devis
(`lireDevis`) avant de recomposer le panier ; modifier ensuite le panier retire le devis.

Règles : la validité vient des paramètres commerciaux d'Odoo ; un devis ne réserve pas de
stock ; la confirmation applique les contrôles de disponibilité de F04 ; un même `creerDevis`
répété avec la même clé renvoie le même devis.

Tests de contrat : `tests/contract/odoo/devis.test.ts` (communs aux deux modes).
