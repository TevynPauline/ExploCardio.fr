# Modèle de données — F09 Contact WhatsApp et centre d'aide

Tout est dans la base du site (contenus et réglages, réels dès la phase 1). Aucune donnée
d'Odoo n'est ajoutée ; aucune donnée de patient.

## Paramètres (`Parametre`)

| Clé | Valeur | Défaut |
|---|---|---|
| `contact.whatsapp` | Numéro de la ligne WhatsApp Business (déjà présent) | fictif en démonstration |
| `contact.horaires` | JSON : `{ "1": [["09:00","18:00"]], …, "7": [] }` (jours 1 = lundi) | lundi à vendredi, 9 h à 18 h |
| `contact.fermetures` | JSON : `[{ "du": "AAAA-MM-JJ", "au": "AAAA-MM-JJ", "motif": "…" }]` | `[]` |

Jours fériés : calculés (calendrier français existant), jamais saisis.

## `ContenuAide` — nouveau (`contenu_aide`)

| Champ | Règle |
|---|---|
| `slug` | unique, dérivé du titre |
| `type` | `video` / `mode_emploi` / `notice` / `faq` |
| `titre`, `resume` | obligatoires (titre ≤ 120 caractères) |
| `theme` | prise en main, enregistrement, analyse, matériel et consommables, logiciels Cloud, compte et commandes |
| `references` | références d'articles et de logiciels d'Odoo liées (fiches produit) |
| `video`, `sousTitres`, `transcription` | vidéo : chemins du fichier MP4 et WebVTT, transcription texte — **obligatoires pour publier** |
| `etapes` | mode d'emploi : `[{ texte, image, texteRemplacement }]`, au moins une étape |
| `document` | notice : chemin du PDF |
| `reponse` | FAQ : texte (sous-ensemble Markdown sûr, comme les contenus de F01) |
| `etat` | `preparation` / `publie` ; seuls les contenus publiés sont visibles |
| `ordre`, `consultations` | tri ; compteur anonyme des ouvertures (FAQ) |
| `creeLe`, `modifieLe`, `publieLe` | |

## `Contenu`

Types `faq`, `tutoriel`, `notice` retirés de l'énumération (jamais utilisés).
