import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// --- Charte (principe VII) : aucune couleur ni police codée en dur hors des tokens ---
const COULEUR_HEX = "#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?\\b";
const COULEUR_FONCTION = "\\b(rgba?|hsla?|oklch|oklab|lab|lch)\\(";
const POLICE = "font-family|font-\\[|\\bfont-\\(";
const MESSAGE_CHARTE =
  "Charte ExploCardio.fr : utilisez les tokens --ec-* (docs/brand/tokens.css) ou les classes du thème, jamais de couleur ni de police codée en dur.";

const reglesCharte = [
  { selector: `Literal[value=/${COULEUR_HEX}/]`, message: MESSAGE_CHARTE },
  { selector: `Literal[value=/${COULEUR_FONCTION}/]`, message: MESSAGE_CHARTE },
  { selector: `Literal[value=/${POLICE}/]`, message: MESSAGE_CHARTE },
  { selector: `TemplateElement[value.raw=/${COULEUR_HEX}/]`, message: MESSAGE_CHARTE },
  { selector: `TemplateElement[value.raw=/${COULEUR_FONCTION}/]`, message: MESSAGE_CHARTE },
  { selector: `TemplateElement[value.raw=/${POLICE}/]`, message: MESSAGE_CHARTE },
  { selector: "Property[key.name='fontFamily']", message: MESSAGE_CHARTE },
  { selector: "Property[key.name='color'] > Literal", message: MESSAGE_CHARTE },
  { selector: "Property[key.name='backgroundColor'] > Literal", message: MESSAGE_CHARTE },
];

// --- Connecteurs (principe III) : pages et composants ne passent que par le registre ---
const MESSAGE_CONNECTEUR =
  "Principe III : n'importez jamais une implémentation de connecteur ni un SDK de service externe hors de src/connecteurs/. Passez par src/connecteurs/registre.ts.";

const importsInterdits = {
  patterns: [
    { regex: "connecteurs/[^/]+/(demo|real)(/|$)", message: MESSAGE_CONNECTEUR },
    { regex: "^(stripe|@stripe/.*)$", message: MESSAGE_CONNECTEUR },
    { regex: "^(odoo-.*|@odoo/.*|xmlrpc|json-rpc-.*)$", message: MESSAGE_CONNECTEUR },
    { regex: "^(@getbrevo/.*|sib-api-v3-sdk|@sendgrid/.*|mailjet.*|nodemailer)$", message: MESSAGE_CONNECTEUR },
  ],
};

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "generated/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "docs/brand/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    rules: {
      "no-restricted-syntax": ["error", ...reglesCharte],
    },
  },
  {
    // Emails : styles en ligne obligatoires ; les valeurs viennent de tokens.json (src/emails/charte.ts).
    // Les couleurs et polices littérales restent interdites.
    files: ["src/emails/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...reglesCharte.filter((r) => !r.selector.startsWith("Property")),
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    // Outils de démonstration (remplissage, réinitialisation) : ils manipulent la base fictive.
    ignores: ["src/connecteurs/**", "tests/contract/**", "tests/unit/**", "prisma/**", "scripts/**"],
    rules: {
      "no-restricted-imports": ["error", importsInterdits],
    },
  },
  {
    // Ce fichier définit les règles : il contient les motifs qu'il interdit.
    files: ["eslint.config.mjs"],
    rules: { "no-restricted-syntax": "off" },
  },
];
export default config;
