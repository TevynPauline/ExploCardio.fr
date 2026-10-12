# ExploCardio.fr — Identité visuelle (référence pour le site)

> Source de vérité de l'identité « Les trois temps », variante 2C, validée par Régis Andrieu.
> Les valeurs exactes sont dans `tokens.css` / `tokens.json`. Les logos sont dans `assets/`.

## 1. Positionnement et ton

- **Marque :** ExploCardio.fr. Toujours écrit ainsi, avec « .fr », C majuscule, sans espace.
- **Signature :** « Le spécialiste des explorations fonctionnelles cardiaques (hors imagerie) ».
- **Cible :** cardiologues libéraux, cabinets et centres. Ton institutionnel, sobre, rassurant et concret. On vouvoie, on écrit des phrases courtes et on évite le jargon marketing.
- **Personnalité visuelle :** épurée, calme, médicale sans être clinique. Couleurs pastel, beaucoup d'air, aucun effet tape-à-l'œil.
- **Interdits :** pas de cœur, pas de tracé ECG, pas de pictogramme médical cliché (stéthoscope, croix). Pas de dégradés criards, d'ombres lourdes ni de photos de stock génériques.

## 2. Logo

Le symbole se compose de **trois points alignés qui grandissent en montant** (« trois temps » : repos → effort → récupération). Il est placé **au-dessus** du mot-symbole et centré.

| Fichier | Usage |
|---|---|
| `assets/explocardio-fr-logo.svg` | Logo principal, sur fond clair (ivoire, blanc, eucalyptus pâle) |
| `assets/explocardio-fr-logo-blanc.svg` | Sur fond sombre (`--ec-dark`) |
| `assets/explocardio-fr-symbole.svg` | Favicon, avatar, petits formats, puce décorative |

- **Mot-symbole :** Inter Regular (400), coloré **lettre par lettre** en dégradé du vert sauge `#6BA59B` au bleu `#6E92B4`, en passant par `#518C82`.
- **Points du symbole :** eucalyptus `#9CC5BE`, sauge `#7FB0A8` et bleu brume `#C7D8E6`, de gauche à droite et du plus petit au plus grand.
- **Zone de protection :** au moins la hauteur du grand point tout autour du logo. **Taille minimale :** 120 px de large pour le logo complet. En dessous, on utilise le symbole seul.
- Utiliser **toujours le SVG**. Ne pas recomposer le logo en texte, ne pas le déformer, ne pas changer les couleurs, ne pas l'afficher sur une photo chargée.
- **En-tête du site :** une version horizontale compacte est permise (symbole à gauche, ~28 px de haut, avec « ExploCardio.fr » en dégradé). Le logo empilé est réservé au héros, au footer et aux documents.

## 3. Couleurs

| Rôle | Token | Hex | Règle d'usage |
|---|---|---|---|
| Texte principal / titres | `--ec-ink` | #2F4A55 | Contraste 8,9:1 sur ivoire |
| Texte secondaire | `--ec-muted` | #5E7680 | Seulement sur ivoire ou blanc (4,5:1). Sur eucalyptus pâle, utiliser `--ec-ink` |
| Action (boutons, liens) | `--ec-deep-strong` | #3F7068 | Texte blanc dessus : 5,6:1 |
| Accent vert | `--ec-deep` | #4F8A80 | Icônes, filets, texte ≥ 18 px ou gras uniquement |
| Points de marque | `--ec-euca` / `--ec-sage` / `--ec-blue` | #9CC5BE / #7FB0A8 / #C7D8E6 | Décor uniquement, **jamais pour du texte** sur fond clair |
| Fond de page | `--ec-bg` | #FAF8F4 | Ivoire, fond par défaut |
| Cartes | `--ec-surface` | #FFFFFF | Avec bordure `--ec-line` #E6E1D8 |
| Héros / couverture | `--ec-pale` | #E9F2EF | Eucalyptus pâle : le fond « signature » |
| Encart info | `--ec-blue-soft` | #E3ECF3 | Informations, encadrés techniques |
| Encart promo | `--ec-lin` | #EFE6D8 | Offre de bienvenue, mises en avant commerciales |
| Bloc sombre | `--ec-dark` | #2F4A55 | Contact et footer. Texte blanc, accent `--ec-euca` |

**Équilibre visé :** environ 70 % ivoire et blanc, 20 % eucalyptus pâle, bleu doux et lin, 10 % encre et accents. Une seule couleur d'action : `--ec-deep-strong`.

## 4. Typographie

Une seule police, **Inter** (Google Fonts), avec 4 graisses : 300, 400, 500 et 600.

| Élément | Taille | Graisse | Détail |
|---|---|---|---|
| H1 / display | 36 → 56 px (clamp) | 300 Light | Interligne 1,15, couleur ink |
| H2 | 28 → 36 px | 300 Light | |
| H3 / titre de carte | 20 px | 600 Semibold | |
| Corps | 16 px | 400 | Interligne 1,6, 65 à 75 caractères par ligne au maximum |
| Petit texte | 14 px | 400 | Couleur muted |
| Surtitre (kicker) | 12 px | 500 | MAJUSCULES, interlettrage 0,12 em, couleur deep-strong, précédé des 3 points |
| Mention douce | 14 à 16 px | 300 italique | Par exemple « (hors imagerie) » |

Le contraste vient des graisses (titres Light, sous-titres Semibold) et non des couleurs.

## 5. Motifs graphiques

- **Les trois points :** élément de langage récurrent. On les utilise en puce devant les surtitres, en séparateur ou en grand décor dans le héros (trois cercles pastel qui grandissent, posés en haut à droite, partiellement hors cadre).
- **Parcours en 3 étapes :** trois cercles numérotés de taille croissante (euca → sage → blue), reliés par des flèches fines `--ec-euca`. Ce motif sert par exemple au programme de fidélité : consommables → points → hotline et SAV.
- **Cartes :** fond blanc, bordure 1 px `--ec-line`, rayon 12 px, ombre très légère ou nulle. Une pastille de couleur (un des trois points) peut précéder le titre.
- **Badge « En préparation » :** pilule à fond blanc, bordure sauge, texte deep-strong de 12 px.
- **Photos :** équipements réels en cabinet (Holter, MAPA, salle d'effort), lumière naturelle, tons neutres. En attendant, utiliser des emplacements `.ec-placeholder` (fond #F1EDE5, bordure pointillée).
- **Marques partenaires :** grille de tuiles blanches uniformes, logos en niveaux de gris, avec la couleur au survol.

## 6. Composants UI (référence)

- **Bouton principal :** pilule, fond `--ec-deep-strong`, texte blanc 500, survol en `--ec-ink`, padding 12 × 22 px.
- **Bouton secondaire :** pilule avec contour ink, survol en fond eucalyptus pâle.
- **Liens :** couleur deep-strong, soulignés au survol.
- **Formulaires :** champs blancs, bordure `--ec-line`, rayon 6 px. Au focus, bordure et halo deep-strong (2 px). Libellés au-dessus du champ, en 14 px et 500.
- **Fiche produit :** photo sur fond ivoire, marque en kicker, nom en H3, prix en 600 ink. Les options d'acquisition (Achat, Financement, Mise à disposition) s'affichent en onglets ou pilules.
- **Footer :** fond `--ec-dark`, logo blanc, liens blancs à 80 % d'opacité, accent euca.
- **Rayons :** 6 px pour les champs, 12 px pour les cartes, 20 px pour les grands encarts et pilules boutons.
- **Grille :** conteneur de 1180 px, 12 colonnes, gouttière de 24 px. Marges latérales de 16 px en mobile. Rythme vertical de 64 à 96 px entre sections.

## 7. Accessibilité (non négociable)

- Respect du WCAG 2.2 AA : contraste ≥ 4,5:1 pour le texte et ≥ 3:1 pour les composants. Les couleurs pastel ne servent jamais pour du texte.
- Focus visible sur tous les éléments interactifs, et cibles tactiles d'au moins 44 × 44 px.
- `prefers-reduced-motion` est respecté. Les animations restent sobres : fondu et translation de 8 px au maximum, 200 ms.

## 8. Structure éditoriale (reprise de la brochure)

1. **Héros :** fond eucalyptus pâle, logo empilé, H1 « Le spécialiste des explorations fonctionnelles cardiaques », mention « (hors imagerie) » et grands points décoratifs.
2. **L'équipement et les marques :** Holter ECG (DMS), Holter tensionnel / MAPA (DMS, SunTech, Microlife WatchBP 03, IEM Mobil-O-Graph), épreuve et écho d'effort (DMS, Norav, Ergoline, RAM, Koch Évolution, SunTech Tango M2), environnement de l'épreuve d'effort, accessoires et consommables.
3. **Offre digitale et flexibilité :** achat direct, financement, mise à disposition au mois, pack dépannage express, logiciel Cloud (badge « En préparation »), outils en ligne (tutos, agenda partagé, garantie express, espace client).
4. **Offre de bienvenue** (encart lin) : un tensiomètre offert à la création de compte.
5. **Service et fidélité :** parcours en 3 étapes (consommables → points → hotline et SAV offerts) et engagements de réactivité.
6. **Contact** (bloc sombre) : Régis Andrieu, fondateur. Email, téléphone et adresse restent à compléter.
