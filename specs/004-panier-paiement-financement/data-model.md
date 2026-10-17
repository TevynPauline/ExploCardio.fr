# Modèle de données — F04 Panier, paiement et financement

**Date** : 2026-10-17
**Plan** : [plan.md](plan.md)

Les commandes, factures, avoirs, stocks, abonnements, codes promo et frais de port sont dans
**Odoo** (base fictive en phase 1). La base du site garde le panier, l'état du tunnel de
commande (pour reprendre là où le client s'est arrêté et garantir une seule commande par
paiement) et les demandes de financement.

---

## 1. Base du site — entités complétées

### Panier (F03)

| Champ | Ajout F04 |
|---|---|
| `codePromo` | Code saisi (texte, facultatif) ; sa validité est vérifiée par le devis d'Odoo |
| `utiliserBons` | Booléen : utiliser le solde de bons d'achat (F06) |

Fusion à la connexion : lignes du panier du visiteur ajoutées à celui du compte (quantités
additionnées par référence et formule), puis panier du visiteur supprimé.

### Demande de financement (F11, `DemandeFinancement`)

| Champ | Changement |
|---|---|
| `statut` | `recue`, `en_etude`, `accordee`, `refusee` (existant) |
| `equipements` | `[{ defaultCode, quantite, mensualiteIndicativeHt }]` |
| `cabinet` | **Ajout** : informations sur le cabinet (JSON : nom, SIRET éventuel, adresse, nombre de praticiens) |
| `mensualiteIndicativeHt` | **Ajout** : total indicatif affiché au client |
| `commandeRef` | **Ajout** : commande « financée » créée dans Odoo |
| `opportuniteRef` | Existant : copie dans Odoo |
| `notesInternes` | Existant : jamais visibles du client |

Chaque action est journalisée (`journal_action`, FR-041).

## 2. Base du site — nouvelles entités

### Commande du site (`CommandeSite`)

| Champ | Type | Règles |
|---|---|---|
| `id` | identifiant | |
| `ref` | texte, unique | `EC-AAAA-NNNNNN`, rappelée au client (virement) |
| `compteId` | compte client | |
| `etape` | `adresses` / `livraison` / `paiement` / `recapitulatif` / `terminee` | Reprise du tunnel |
| `adresses` | JSON | Livraison (métropole) et facturation |
| `modeLivraison` | texte | Code d'Odoo (`standard`, `express`) |
| `moyenPaiement` | `carte` / `sepa` / `virement` | Virement interdit pour un abonnement |
| `cgvAccepteesLe` | date | Obligatoire avant validation |
| `devis` | JSON | Dernier devis d'Odoo affiché (pour signaler un écart) |
| `etatAchat` | `a_payer` / `paiement_en_cours` / `payee` / `a_enregistrer` / `en_attente_virement` / `refusee` / `sans_objet` | Partie « paiement unique » |
| `etatAbonnement` | mêmes valeurs | Partie « abonnement mensuel » |
| `sessionAchat`, `sessionAbonnement` | texte | Sessions Stripe (une par tentative) |
| `tentative` | entier | Numéro de tentative (clé d'idempotence) |
| `odooCommandeRef` | texte | Commande d'Odoo créée |
| `echeanceVirement` | date | Fin de la réservation d'une commande en virement (renvoyée par Odoo), pour le rappel et l'annulation |
| `reservationRef` | texte | Réservation de stock faite au lancement du paiement |
| `odooAbonnementRefs` | liste | Abonnements créés |
| `lignes` | JSON | Copie des lignes validées (référence, formule, quantité) |
| `creeLe`, `modifieLe` | dates | |

Transitions de `etatAchat` : `a_payer → paiement_en_cours → payee` ; `paiement_en_cours →
refusee → a_payer` (nouvelle tentative) ; `payee → a_enregistrer` si Odoo n'a pas pu
enregistrer (rejoué jusqu'à réussite, alerte) ; `a_payer → en_attente_virement`.

### Suivi des changements de commandes (`SuiviCommande`)

| Champ | Type | Règles |
|---|---|---|
| `odooCommandeRef` | texte, unique | |
| `dernierStatut` | texte | Statut déjà notifié au client |
| `notifieLe` | date | Une seule notification par changement (FR-032) |

## 3. Paramètres du site (back-office)

| Clé | Contenu | Valeur initiale |
|---|---|---|
| `commande.heure_limite_express` | Heure limite de commande pour l'express (FR-040) | `14:00` |
| `virement.titulaire`, `virement.iban`, `virement.bic` | Coordonnées bancaires affichées | Fictives en démonstration |
| `virement.rappel_jours` | Rappel avant l'échéance de réservation | `2` |

## 4. Base fictive (Odoo) — ajouts

| Élément | Ajout |
|---|---|
| Mode de livraison (`delivery.carrier`) | **Nouveau** : code, libellé, forfait HT, délai (jours), seuil de franco |
| Variante | `fraisLivraisonHt`, `fraisInstallationHt` (équipements volumineux, FR-046) |
| Commande de vente | Statuts complétés ; `echeancePaiement` (virement) ; `transporteur`, `suivi` ; `modifieLe` |
| Remboursement (`account.payment` de remboursement) | **Nouveau** : commande, montant, source (`odoo` / `stripe`), état (`a_executer` / `execute`), référence Stripe |
| Paramètre | Délai de réservation d'un virement (7 jours) |

Migration `demo f04_commandes`.

## 5. Réinitialisation (rappel F11)

Les commandes du site, paniers, demandes de financement et suivis des séances sont supprimés ;
les paramètres sont conservés.
