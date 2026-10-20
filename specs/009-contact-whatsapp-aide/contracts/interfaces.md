# Interfaces — F09

F09 n'ajoute aucun connecteur : WhatsApp n'est pas un service connecté (FR-002). Interfaces
exposées par le site :

## Liens de contact

| Mode | « Appeler » | « Écrire sur WhatsApp » |
|---|---|---|
| Démonstration (phase 1) | `/demo/contact?moyen=appel` | `/demo/contact?moyen=whatsapp` |
| Réel | `tel:+33…` | `https://wa.me/33…?text=<message encodé>` |

Message : voir research.md R3. Aucun autre paramètre.

## Pages publiques

| Chemin | Contenu |
|---|---|
| `/aide` | recherche, filtres (appareil, logiciel, thème), FAQ (les plus consultées en tête), contenus publiés |
| `/aide/[slug]` | un contenu ; « Besoin d'aide ? » et boutons en bas |
| `POST /api/aide/[slug]/consultation` | compteur anonyme d'une question de FAQ (204 ; limité par session ; aucune donnée personnelle) |

## Emails (gabarit commun)

Bloc de contact en pied de chaque email transactionnel : numéro, horaires, lien « Écrire sur
WhatsApp » (page de démonstration en phase 1).
