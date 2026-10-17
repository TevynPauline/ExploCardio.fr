# Contrat du domaine — F04 (`src/domaine/commande/`, `src/domaine/financement/`)

| Fonction | Rôle | Utilisée par |
|---|---|---|
| `panierDetaille(panier, compte?)` | Lignes, devis d'Odoo, blocs, changements depuis l'ajout, indisponibles | `/panier`, tunnel |
| `modifierLigne`, `supprimerLigne`, `appliquerCodePromo`, `utiliserBons` | Édition du panier | `/panier` |
| `fusionnerPaniers(jeton, compteId)` | Fusion à la connexion | crochet de connexion |
| `ouvrirCommande(compte)` | Crée ou reprend la `CommandeSite` du panier (étape atteinte) | tunnel |
| `enregistrerAdresses`, `choisirLivraison`, `choisirPaiement` | Étapes du tunnel | tunnel |
| `verifierAvantPaiement(commande)` | Devis recalculé, stock revérifié, `peutCommander` | récapitulatif |
| `lancerPaiement(commande)` | Session Stripe (achat, puis abonnement) ou commande par virement ; jamais deux sessions pour la même tentative | récapitulatif |
| `effets de paiement` | `paiement_reussi` (commande Odoo, cadeau, fidélité, email, panier vidé), `paiement_refuse`, `echeance_payee`, `remboursement` | gestionnaire de F11 |
| `rattraperCommandes()` | Rejoue les commandes « payée, à enregistrer » ; alerte | file d'attente |
| `suivreCommandes()` | Changements d'Odoo → emails ; remboursements à exécuter → Stripe | tâche (5 min) |
| `traiterVirements()` | Rappels et annulations | tâche quotidienne |
| `demanderFinancement(compte, saisie)` | Demande, copie Odoo, emails, panier | `/financement/demande` |
| `changerStatutFinancement`, `noterFinancement`, `creerCommandeFinancee` | Back-office | `/admin/financements` |
