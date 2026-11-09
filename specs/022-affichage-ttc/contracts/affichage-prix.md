# Contrat d'interface : affichage d'un prix au client (F22)

## Composant `Prix` (`src/ui/catalogue/Prix.tsx`)

Entrées (l'une des deux formes) :

- `ht` + `tauxTva` : le TTC est calculé (`prixTtc`) ;
- `ht` + `ttc` : montants déjà calculés (totaux, commandes, factures).

Options : `aPartirDe`, `periode` (« / mois »), `taille` (`normal` | `grand`), `barre`.

Rendu attendu :

```text
À partir de 2 388,00 € TTC / mois        ← Semibold, encre ; text-h2 si taille « grand »
soit 1 990,00 € HT / mois                ← text-small, text-muted, juste en dessous
```

- Nom accessible unique : « À partir de 2 388 euros TTC par mois, soit 1 990 euros HT par
  mois » ; les deux lignes visuelles ne sont pas lues séparément.
- Montant nul : « Offert » (ou « 0,00 € TTC »), sans ligne HT.
- Contraste ≥ 4,5:1 pour les deux lignes ; aucun défilement horizontal à 390 px.

## Formateur texte `prixTexte` (emails, messages)

`prixTexte({ ht, tauxTva })` ou `prixTexte({ ht, ttc })` →
« 2 388,00 € TTC (soit 1 990,00 € HT) » ; option `periode` → « … € TTC / mois (soit … € HT
/ mois) ».

## Bloc des totaux d'achat

```text
Sous-total HT                1 990,00 €
Remises en cours              − 99,50 €
Livraison HT                    15,00 €
Total HT                     1 905,50 €
TVA                            381,10 €
───────────────────────────────────────
Total TTC à payer            2 286,60 €   ← text-h2, Semibold
```

## Données structurées (F21)

Le prix déclaré aux moteurs est le TTC affiché en premier (`valueAddedTaxIncluded: true`).
Fichier propriété de F21 ; F22 n'en vérifie que la concordance.
