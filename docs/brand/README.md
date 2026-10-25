# Kit identité visuelle ExploCardio.fr pour Spec Kit

## Contenu

- `design-system.md` : la charte complète (logo, couleurs, typo, composants, accessibilité, structure du site).
- `tokens.css` : variables CSS et classes de base prêtes à l'emploi (`--ec-*`, `.ec-btn`, `.ec-card`…).
- `tokens.json` : les mêmes valeurs, indépendantes du framework (Tailwind, thème Odoo, etc.).
- `assets/` : logo couleur, logo blanc et symbole seul (SVG + PNG), et logo horizontal pour l'en-tête, couleur et blanc (SVG).

## Installation dans le projet

1. Copier le dossier dans le dépôt, par exemple sous `docs/brand/` (ou `.specify/memory/brand/`).
2. Lancer les commandes ci-dessous dans l'agent (Claude Code, Cursor…).

## Prompt 1 : `/speckit.constitution`

À ajouter à la constitution, pour que chaque spec, plan et tâche respecte la charte :

```
/speckit.constitution Ajoute un principe « Identité visuelle ExploCardio.fr » :
- docs/brand/design-system.md est la source de vérité visuelle ; toute UI doit s'y conformer.
- Les couleurs, typographies, rayons et espacements proviennent exclusivement des tokens de docs/brand/tokens.css (ou tokens.json) ; aucune valeur hexadécimale ou police codée en dur dans les composants.
- Le logo est toujours intégré depuis docs/brand/assets/*.svg, jamais recomposé en texte ni recoloré. Le nom s'écrit toujours « ExploCardio.fr ».
- Police unique Inter (300/400/500/600). Titres en Light, sous-titres en Semibold.
- Les pastels (#9CC5BE, #7FB0A8, #C7D8E6) sont décoratifs : jamais pour du texte. Action principale = --ec-deep-strong (#3F7068).
- WCAG 2.2 AA obligatoire (contraste, focus visible, cibles 44 px, prefers-reduced-motion).
- Interdits : cœur, tracé ECG, pictos médicaux clichés, dégradés vifs, ombres lourdes.
- Ton : institutionnel, sobre, vouvoiement, phrases courtes, à destination des cardiologues libéraux.
```

## Prompt 2 : `/speckit.specify` (exemple pour la page d'accueil)

```
/speckit.specify Page d'accueil du site marchand ExploCardio.fr, conforme à docs/brand/design-system.md.
Sections dans l'ordre : carrousel de vignettes (F16 : offres, informations, produits phares, gérés au back-office) ; équipements & marques (3 cartes : Holter ECG, Holter tensionnel/MAPA, épreuve & écho d'effort, puis grille des marques) ; offre digitale & flexibilité (achat, financement, mise à disposition, pack dépannage express, logiciel Cloud « En préparation ») ; offre de bienvenue (encart lin) ; service & fidélité (parcours 3 étapes consommables → points → hotline & SAV offerts) ; contact (bloc sombre) ; footer.
Emplacements photo en placeholders. Responsive mobile-first.
```

Lors de `/speckit.plan`, préciser la stack (Next.js + Tailwind, par exemple) et demander que `tokens.json` soit mappé dans le thème (`theme.extend.colors`, `fontFamily`, `borderRadius`) ou que `tokens.css` soit importé globalement.
