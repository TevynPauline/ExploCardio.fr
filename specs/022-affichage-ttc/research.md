# Research: F22 — Affichage des prix TTC

Constats faits le 2026-11-09 sur le code (après F14 lot 1, commit `77e6197`).

## Constats

| Sujet | Constat |
|---|---|
| Composant de prix | `src/ui/catalogue/Prix.tsx` : HT en Semibold, « soit … TTC » en `text-small text-muted` ; utilisé par les cartes, la fiche (onglets, sélecteur de formule, conditionnement) et les services |
| Calcul du TTC | `prixTtc(ht, taux)` (`src/domaine/catalogue/prix.ts`) = `round(ht × (100 + taux) / 100)` ; le connecteur de démonstration calcule la TVA par `tva(ht, taux) = round(ht × taux / 100)` : pour un HT entier en centimes, `ht + tva(ht, taux) = prixTtc(ht, taux)` — les deux formules donnent le même centime |
| TVA du panier | le connecteur (démonstration) calcule la TVA **ligne par ligne** sur le total HT de chaque ligne (remises comprises), puis sur le port, moins la TVA des bons d'achat ; `totalTtc = totalHt + tva` |
| Totaux | `src/ui/commande/Totaux.tsx` : liste HT puis TVA puis « Total TTC » en Semibold ; abonnement : HT puis TTC par mois |
| Autres écrans | environ 30 fichiers montrent un montant avec `euros(…)` suivi de « HT » : panier, livraison, récapitulatif, mise à disposition, Mon compte (commandes, devis, locations, factures, financements, logiciels, données), recherche, méga-menu, financement |
| Emails | `src/emails/modeles-commandes.tsx`, `modeles-locations.tsx`, `modeles-emailing.tsx` (montants en HT) ; `modeles-fidelite.tsx` (bons d'achat) |
| Fidélité | bons d'achat, gains, droits d'assistance : masqués à l'ouverture (F14, option A) |
| Données structurées | `src/lib/referencement/schema.ts` (F21) : déjà passé au TTC dans la fork SEO, non commité au 2026-11-09 |
| Back-office | saisies en HT (`centimesDepuisSaisie`) : écran de démonstration (prix, stocks), catalogue, paiements et locations de démonstration |
| Tests | environ 25 fichiers e2e et quelques tests unitaires vérifient des textes « … € HT » ou « soit … TTC » |

## R1 — Un seul composant de prix, deux formes d'entrée

- **Decision** : le composant `Prix` devient la seule façon d'afficher un prix au client. Il
  accepte soit `ht` + `tauxTva` (le TTC est calculé par `prixTtc`), soit `ht` + `ttc` déjà
  calculés (totaux, commandes, factures lues dans Odoo). Il rend le TTC en Semibold (taille
  normale ou grande), puis le HT en dessous, en `text-small text-muted`, et un nom accessible
  unique « X euros TTC, soit Y euros HT ».
- **Rationale** : FR-001 à FR-006 au même endroit ; les écrans n'ont plus à composer « HT » et
  « TTC » eux-mêmes ; les montants déjà calculés par Odoo ne sont pas recalculés.
- **Alternatives** : modifier chaque écran à la main (incohérences, oublis) ; un drapeau
  « TTC d'abord » (aucun cas ne garde le HT d'abord côté client).

## R2 — Montant TTC d'une ligne de panier

- **Decision** : TTC d'une ligne = `prixTtc(totalHt de la ligne, tauxTva)`, identique à
  `totalHt + tva(totalHt, taux)` du connecteur. TTC des frais de port = `prixTtc(port, 20)`
  (taux des frais, celui du connecteur). Le total TTC reste celui renvoyé par le connecteur.
  Un test vérifie que la somme des TTC des lignes et du port est égale au total TTC sur
  20 paniers (SC-002), bons d'achat exclus (masqués à l'ouverture).
- **Rationale** : même méthode d'arrondi que la TVA du connecteur, donc pas d'écart d'un
  centime ; le site n'invente pas un second calcul de total (principe III).
- **Alternatives** : répartir la TVA globale au prorata des lignes (écarts d'arrondi à
  corriger, illisible) ; afficher les lignes en HT seulement (contraire à FR-010).
- **Phase 3** : Odoo calcule par défaut la TVA ligne par ligne (`round_per_line`) ; la copie de
  test sera vérifiée au lot Commandes de F14. Si elle est réglée en arrondi global, le TTC des
  lignes sera lu dans Odoo (`price_total`) au lieu d'être calculé.

## R3 — Bloc des totaux

- **Decision** : ordre inchangé (sous-total HT, remises, livraison HT, total HT, TVA), puis
  **« Total TTC à payer »** en grand (`text-h2`), séparé par un filet. Abonnement : « Premier
  mois » et « Mois suivants » rendus par `Prix` (TTC par mois, puis HT).
- **Rationale** : FR-011 ; le détail HT reste pour les clients qui récupèrent la TVA.

## R4 — Franco de port

- **Decision** : le seuil reste en HT dans Odoo ; le message « plus que … pour la livraison
  offerte » montre le reste en TTC au taux des frais de port (20 %), puis son HT.
- **Rationale** : un seul taux aujourd'hui ; l'écart TTC/HT est sans ambiguïté.

## R5 — Emails

- **Decision** : un formateur texte `prixTexte(ht, taux | ttc)` → « 2 388,00 € TTC (soit
  1 990,00 € HT) », utilisé dans les versions HTML et texte des emails qui citent un montant.
  Emails de fidélité inchangés (bons masqués à l'ouverture, lot B de F18).
- **Rationale** : FR-014 ; une seule formulation.

## R6 — Données structurées

- **Decision** : F22 ne touche pas `src/lib/referencement/schema.ts` ; F21 (fork SEO) l'a déjà
  aligné sur le TTC. F22 vérifie seulement, une fois F21 commité, que le prix déclaré est égal
  au TTC affiché en premier (test unitaire commun).
- **Rationale** : éviter un conflit de fichiers entre les deux sessions.

## R7 — Back-office

- **Decision** : affichage inchangé (HT d'abord). Aide « soit … € TTC » sous les champs de
  saisie de prix du catalogue et de l'écran de démonstration (taux de l'article).
- **Rationale** : FR-017 ; l'équipe raisonne en HT.

## R8 — Tests existants

- **Decision** : les tests e2e et unitaires qui lisent « … € HT » en premier sont mis à jour
  vers la nouvelle présentation ; un test e2e transverse parcourt les écrans de FR-007 à
  FR-013 et vérifie l'ordre TTC puis HT ; les tests de fidélité restent inchangés.
