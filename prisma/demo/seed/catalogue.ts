import type { Prisma, PrismaClient } from "@generated/demo/client";

// Catalogue de démonstration (T041, FR-013) à partir de specs/011-…/demo-references.md :
// marques et modèles de la brochure ; vraies références fabricant quand elles sont connues,
// références fictives signalées sinon. TOUS LES PRIX SONT INVENTÉS (décision D6) : ils sont
// marqués « prix inventé » et doivent être remplacés avant toute présentation à un médecin.
// Les default_code sont FIXES : les contenus produits du back-office y sont rattachés.
// Aucune lampe MedLED (hors périmètre, principe I).

type Variante = {
  defaultCode: string;
  configuration?: string;
  referenceFabricant?: string;
  prixHt: number; // euros HT
  stock?: { quantite: number; horsStock?: "delai" | "indisponible"; delaiJours?: number };
  mad?: { premierMois: number; moisSuivants: number; kitRequis?: string; valeurRemplacement: number };
  parc?: { numero: string; statut: "disponible" | "loue" | "en_retour" | "en_maintenance"; retourDansJours?: number }[];
};

type Modele = {
  categorie: string;
  marque: string;
  nom: string;
  type: "equipement" | "consommable" | "accessoire" | "logiciel" | "service";
  description: string;
  formules: ("achat" | "mise_a_disposition" | "financement")[];
  referenceFictive?: boolean;
  compatibleAvec?: string[];
  variantes: Variante[];
};

export const CATEGORIES = [
  { code: "holter-ecg", nom: "Holter ECG", ordre: 1 },
  { code: "mapa", nom: "Holter tensionnel / MAPA", ordre: 2 },
  { code: "effort", nom: "Épreuve / écho d'effort", ordre: 3 },
  { code: "ecg-repos", nom: "ECG de repos", ordre: 4 },
  { code: "accessoires", nom: "Accessoires & consommables", ordre: 5 },
] as const;

const ENREGISTREUR = "Enregistreur seul";
const AVEC_CLOUD = "Enregistreur + logiciel Cloud";
const PACK = "Pack complet (enregistreur, logiciel Cloud, accessoires)";

export const MODELES: Modele[] = [
  // ---------------------------------------------------------------- Holter ECG — DMS
  {
    categorie: "holter-ecg",
    marque: "DMS",
    nom: "DMS 300-2e",
    type: "equipement",
    description: "Enregistreur Holter ECG compact pour les enregistrements de routine.",
    formules: ["achat", "mise_a_disposition", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-3002E", configuration: ENREGISTREUR, prixHt: 1290, stock: { quantite: 6 } },
      { defaultCode: "EC-DMS-3002E-CLOUD", configuration: AVEC_CLOUD, prixHt: 1790, stock: { quantite: 6 },
        mad: { premierMois: 49, moisSuivants: 89, kitRequis: "EC-KIT-HOLTER-MAD", valeurRemplacement: 1290 },
        parc: [
          { numero: "FICT-SN-3002E-001", statut: "disponible" },
          { numero: "FICT-SN-3002E-002", statut: "loue" },
        ] },
      { defaultCode: "EC-DMS-3002E-PACK", configuration: PACK, prixHt: 2090, stock: { quantite: 3 } },
    ],
  },
  {
    categorie: "holter-ecg",
    marque: "DMS",
    nom: "DMS 300-3A",
    type: "equipement",
    description: "Enregistreur Holter ECG 3 voies, pochette dédiée disponible en accessoire.",
    formules: ["achat", "mise_a_disposition", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-3003A", configuration: ENREGISTREUR, prixHt: 1490, stock: { quantite: 4 } },
      { defaultCode: "EC-DMS-3003A-CLOUD", configuration: AVEC_CLOUD, prixHt: 1990, stock: { quantite: 4 },
        mad: { premierMois: 59, moisSuivants: 99, kitRequis: "EC-KIT-HOLTER-MAD", valeurRemplacement: 1490 },
        parc: [
          { numero: "FICT-SN-3003A-001", statut: "loue" },
          { numero: "FICT-SN-3003A-002", statut: "en_retour", retourDansJours: 6 },
        ] },
      { defaultCode: "EC-DMS-3003A-PACK", configuration: PACK, prixHt: 2290, stock: { quantite: 2 } },
    ],
  },
  {
    categorie: "holter-ecg",
    marque: "DMS",
    nom: "DMS 300-4L",
    type: "equipement",
    description: "Enregistreur Holter ECG 12 dérivations pour les analyses approfondies.",
    formules: ["achat", "mise_a_disposition", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-3004L", configuration: ENREGISTREUR, prixHt: 1690, stock: { quantite: 5 } },
      { defaultCode: "EC-DMS-3004L-CLOUD", configuration: AVEC_CLOUD, prixHt: 2190, stock: { quantite: 5 },
        mad: { premierMois: 59, moisSuivants: 109, kitRequis: "EC-KIT-HOLTER-MAD", valeurRemplacement: 1690 },
        parc: [
          { numero: "FICT-SN-3004L-001", statut: "disponible" },
          { numero: "FICT-SN-3004L-002", statut: "loue" },
          { numero: "FICT-SN-3004L-003", statut: "loue" },
          { numero: "FICT-SN-3004L-004", statut: "en_maintenance", retourDansJours: 12 },
        ] },
      { defaultCode: "EC-DMS-3004L-PACK", configuration: PACK, prixHt: 2490, stock: { quantite: 2 } },
    ],
  },
  {
    categorie: "holter-ecg",
    marque: "DMS",
    nom: "DMS 300-2W",
    type: "equipement",
    description: "Enregistreur Holter ECG à batterie rechargeable.",
    formules: ["achat", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-3002W", configuration: ENREGISTREUR, prixHt: 1590, stock: { quantite: 3 } },
      { defaultCode: "EC-DMS-3002W-CLOUD", configuration: AVEC_CLOUD, prixHt: 2090, stock: { quantite: 3 } },
    ],
  },
  {
    categorie: "holter-ecg",
    marque: "DMS",
    nom: "CardioScan Holter ECG (logiciel Cloud)",
    type: "logiciel",
    description: "Programme d'analyse Holter ECG, en abonnement mensuel sur la plateforme Cloud HDS.",
    formules: ["mise_a_disposition"],
    variantes: [{ defaultCode: "EC-DMS-CS-HOLTER-CLOUD", configuration: "Abonnement mensuel", prixHt: 79 }],
  },
  {
    categorie: "holter-ecg",
    marque: "DMS",
    nom: "CardioVision / Cardiac Rehab (logiciel Cloud)",
    type: "logiciel",
    description: "Programme de suivi et de réadaptation, en abonnement mensuel sur la plateforme Cloud HDS.",
    formules: ["mise_a_disposition"],
    variantes: [{ defaultCode: "EC-DMS-CARDIOVISION-CLOUD", configuration: "Abonnement mensuel", prixHt: 59 }],
  },

  // ---------------------------------------------------------------- Holter tensionnel / MAPA
  {
    categorie: "mapa",
    marque: "DMS",
    nom: "DMS300-ABP",
    type: "equipement",
    description:
      "Kit MAPA : enregistreur, logiciel DMS-ABP Satellite sur clé USB, deux brassards (24-32 cm et 25-35 cm), housse et câble USB.",
    formules: ["achat", "mise_a_disposition", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-ABP-KIT", configuration: "Kit complet", referenceFabricant: "dms25", prixHt: 1190, stock: { quantite: 7 },
        mad: { premierMois: 39, moisSuivants: 69, valeurRemplacement: 1190 },
        parc: [
          { numero: "FICT-SN-ABP-001", statut: "disponible" },
          { numero: "FICT-SN-ABP-002", statut: "loue" },
        ] },
    ],
  },
  {
    categorie: "mapa",
    marque: "SunTech",
    nom: "Oscar 2",
    type: "equipement",
    description: "Holter tensionnel (modèle 250) : 250 mesures, deux piles AA, 284 g. Logiciel AccuWin Pro 4.",
    formules: ["achat", "mise_a_disposition", "financement"],
    variantes: [
      { defaultCode: "EC-SUN-OSCAR2", configuration: "Standard", referenceFabricant: "99-0133-00", prixHt: 1890, stock: { quantite: 5 },
        mad: { premierMois: 49, moisSuivants: 99, valeurRemplacement: 1890 },
        parc: [
          { numero: "FICT-SN-OSC2-001", statut: "disponible" },
          { numero: "FICT-SN-OSC2-002", statut: "disponible" },
          { numero: "FICT-SN-OSC2-003", statut: "loue" },
        ] },
      { defaultCode: "EC-SUN-OSCAR2-SPHYG", configuration: "Avec SphygmoCor intégré", referenceFabricant: "99-0133-02", prixHt: 3290, stock: { quantite: 2 } },
    ],
  },
  {
    categorie: "mapa",
    marque: "SunTech",
    nom: "Mini Bravo",
    type: "equipement",
    description: "Holter tensionnel léger. Référence fabricant à confirmer.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-SUN-MINIBRAVO", configuration: "Standard", prixHt: 1390, stock: { quantite: 3 } }],
  },
  {
    categorie: "mapa",
    marque: "Microlife",
    nom: "WatchBP 03",
    type: "equipement",
    description: "Holter tensionnel. Référence fictive en attendant la fiche du fabricant.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-MIC-WATCHBP03", configuration: "Standard", prixHt: 890, stock: { quantite: 0, horsStock: "delai", delaiJours: 10 } }],
  },
  {
    categorie: "mapa",
    marque: "IEM",
    nom: "Mobil-O-Graph",
    type: "equipement",
    description: "Holter tensionnel. Référence fictive en attendant la fiche du fabricant.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    // Cas utile FR-015 : produit en rupture
    variantes: [{ defaultCode: "EC-IEM-MOBILOGRAPH", configuration: "Standard", prixHt: 1990, stock: { quantite: 0, horsStock: "indisponible" } }],
  },

  // ---------------------------------------------------------------- Épreuve / écho d'effort
  {
    categorie: "effort",
    marque: "DMS",
    nom: "CardioScan Stress Test 12 dérivations",
    type: "equipement",
    description: "ECG d'effort 12 dérivations avec boîtier d'acquisition.",
    formules: ["achat", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-STRESS-BT", configuration: "Boîtier Bluetooth", prixHt: 4490, stock: { quantite: 2 } },
      { defaultCode: "EC-DMS-STRESS-USB", configuration: "Boîtier USB", prixHt: 3990, stock: { quantite: 2 } },
    ],
  },
  {
    categorie: "effort",
    marque: "Koch Évolution",
    nom: "ULTRA KOCH EXERCISE",
    type: "equipement",
    description:
      "Divan ergométrique motorisé pour l'écho d'effort : six vérins, hauteur de 64 cm à plus d'un mètre, patient jusqu'à 180 kg à l'effort. Garantie 3 ans, extensible à 5 ans.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    // Cas utile FR-015 : produit en « délai X jours »
    variantes: [{ defaultCode: "EC-KOCH-ULTRA", configuration: "Standard", prixHt: 18900, stock: { quantite: 0, horsStock: "delai", delaiJours: 45 } }],
  },
  {
    categorie: "effort",
    marque: "Koch Évolution",
    nom: "KORELE 8000",
    type: "equipement",
    description: "Divan d'effort. Détail à confirmer auprès du fabricant.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-KOCH-KORELE8000", configuration: "Standard", prixHt: 12900, stock: { quantite: 1 } }],
  },
  {
    categorie: "effort",
    marque: "Koch Évolution",
    nom: "KORELE 7000",
    type: "equipement",
    description: "Divan d'effort. Détail à confirmer auprès du fabricant.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-KOCH-KORELE7000", configuration: "Standard", prixHt: 9900, stock: { quantite: 0, horsStock: "delai", delaiJours: 21 } }],
  },
  {
    categorie: "effort",
    marque: "Koch Évolution",
    nom: "Banc de Koch PURE",
    type: "equipement",
    description: "Banc d'examen. Détail à confirmer auprès du fabricant.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-KOCH-PURE", configuration: "Standard", prixHt: 6900, stock: { quantite: 1 } }],
  },
  {
    categorie: "effort",
    marque: "Norav",
    nom: "ECG d'effort Norav (modèle à préciser)",
    type: "equipement",
    description: "Système d'ECG d'effort. Modèle et référence fictifs en attendant la fiche du fabricant.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-NORAV-STRESS", configuration: "Standard", prixHt: 5900, stock: { quantite: 1 } }],
  },
  {
    categorie: "effort",
    marque: "Ergoline",
    nom: "Ergocycle Ergoline (modèle à préciser)",
    type: "equipement",
    description: "Ergocycle pour l'épreuve d'effort. Modèle et référence fictifs.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-ERGOLINE-ERGO", configuration: "Standard", prixHt: 7400, stock: { quantite: 1 } }],
  },
  {
    categorie: "effort",
    marque: "RAM",
    nom: "Matériel d'effort RAM (modèle à préciser)",
    type: "equipement",
    description: "Équipement d'épreuve d'effort. Modèle et référence fictifs.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-RAM-EFFORT", configuration: "Standard", prixHt: 6200, stock: { quantite: 1 } }],
  },
  {
    categorie: "effort",
    marque: "SunTech",
    nom: "Tango M2",
    type: "equipement",
    description: "Tensiomètre automatique pour l'épreuve d'effort. Référence fictive.",
    formules: ["achat", "financement"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-SUN-TANGOM2", configuration: "Standard", prixHt: 3490, stock: { quantite: 2 } }],
  },
  {
    categorie: "effort",
    marque: "Environnement d'effort",
    nom: "Chariot d'épreuve d'effort",
    type: "accessoire",
    description: "Chariot pour l'environnement de l'épreuve d'effort. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-ENV-CHARIOT", configuration: "Standard", prixHt: 690, stock: { quantite: 4 } }],
  },
  {
    categorie: "effort",
    marque: "Environnement d'effort",
    nom: "Défibrillateur automatisé externe",
    type: "equipement",
    description: "Défibrillateur pour l'environnement de l'épreuve d'effort. Modèle et référence fictifs.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-ENV-DAE", configuration: "Standard", prixHt: 1490, stock: { quantite: 3 } }],
  },

  // ---------------------------------------------------------------- ECG de repos — DMS
  {
    categorie: "ecg-repos",
    marque: "DMS",
    nom: "CardioScan Resting 12 dérivations",
    type: "equipement",
    description: "ECG de repos 12 dérivations, en dépannage ou en complément.",
    formules: ["achat", "financement"],
    variantes: [
      { defaultCode: "EC-DMS-REPOS-BT", configuration: "Boîtier Bluetooth", prixHt: 1490, stock: { quantite: 3 } },
      { defaultCode: "EC-DMS-REPOS-USB", configuration: "Boîtier USB", prixHt: 1290, stock: { quantite: 3 } },
      { defaultCode: "EC-DMS-REPOS-TAB", configuration: "Sur tablette Android + boîtier Bluetooth", prixHt: 1790, stock: { quantite: 2 } },
    ],
  },

  // ---------------------------------------------------------------- Accessoires & consommables
  {
    categorie: "accessoires",
    marque: "SunTech",
    nom: "Brassard MAPA Orbit",
    type: "consommable",
    description: "Brassard pour holter tensionnel Oscar 2.",
    formules: ["achat"],
    compatibleAvec: ["EC-SUN-OSCAR2", "EC-SUN-OSCAR2-SPHYG"],
    variantes: [
      { defaultCode: "EC-SUN-ORBIT-S", configuration: "18-26 cm", referenceFabricant: "98-0239-21", prixHt: 59, stock: { quantite: 40 } },
      { defaultCode: "EC-SUN-ORBIT-M", configuration: "26-34 cm", referenceFabricant: "98-0239-22", prixHt: 59, stock: { quantite: 60 } },
      { defaultCode: "EC-SUN-ORBIT-L", configuration: "32-44 cm", referenceFabricant: "98-0239-23", prixHt: 64, stock: { quantite: 30 } },
      { defaultCode: "EC-SUN-ORBIT-XL", configuration: "42-55 cm", referenceFabricant: "98-0239-24", prixHt: 69, stock: { quantite: 15 } },
    ],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Brassard MAPA 12-19 cm",
    type: "consommable",
    description: "Brassard pédiatrique ou bras fin. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-ABP-KIT"],
    variantes: [{ defaultCode: "EC-DMS-BRASSARD-XS", configuration: "12-19 cm", prixHt: 49, stock: { quantite: 20 } }],
  },
  {
    categorie: "accessoires",
    marque: "SunTech",
    nom: "Pochette Oscar 2",
    type: "accessoire",
    description: "Pochette de transport de l'enregistreur.",
    formules: ["achat"],
    compatibleAvec: ["EC-SUN-OSCAR2", "EC-SUN-OSCAR2-SPHYG"],
    variantes: [{ defaultCode: "EC-SUN-POCHETTE-OSC2", referenceFabricant: "98-0032-07", prixHt: 29, stock: { quantite: 25 } }],
  },
  {
    categorie: "accessoires",
    marque: "SunTech",
    nom: "Ceinture Oscar 2",
    type: "accessoire",
    description: "Ceinture de maintien de la pochette.",
    formules: ["achat"],
    compatibleAvec: ["EC-SUN-OSCAR2", "EC-SUN-OSCAR2-SPHYG"],
    variantes: [{ defaultCode: "EC-SUN-CEINTURE-OSC2", referenceFabricant: "98-0037-00", prixHt: 19, stock: { quantite: 25 } }],
  },
  {
    categorie: "accessoires",
    marque: "SunTech",
    nom: "Bandoulière Oscar 2",
    type: "accessoire",
    description: "Bandoulière de la pochette.",
    formules: ["achat"],
    compatibleAvec: ["EC-SUN-OSCAR2", "EC-SUN-OSCAR2-SPHYG"],
    variantes: [{ defaultCode: "EC-SUN-BANDOULIERE-OSC2", referenceFabricant: "98-0036-00", prixHt: 19, stock: { quantite: 25 } }],
  },
  {
    categorie: "accessoires",
    marque: "SunTech",
    nom: "Extension de garantie Oscar 2",
    type: "service",
    description: "Extension de la garantie du fabricant.",
    formules: ["achat"],
    compatibleAvec: ["EC-SUN-OSCAR2", "EC-SUN-OSCAR2-SPHYG"],
    variantes: [
      { defaultCode: "EC-SUN-GARANTIE-1AN", configuration: "1 an", referenceFabricant: "99-0027-00", prixHt: 190 },
      { defaultCode: "EC-SUN-GARANTIE-3ANS", configuration: "3 ans", referenceFabricant: "99-0027-03", prixHt: 490 },
    ],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Batterie rechargeable DMS 300-2W",
    type: "accessoire",
    description: "Batterie de rechange. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-3002W", "EC-DMS-3002W-CLOUD"],
    variantes: [{ defaultCode: "EC-DMS-BATTERIE-2W", prixHt: 49, stock: { quantite: 20 } }],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Chargeur pour batteries DMS 300-2W",
    type: "accessoire",
    description: "Chargeur de batteries. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-3002W", "EC-DMS-3002W-CLOUD"],
    variantes: [{ defaultCode: "EC-DMS-CHARGEUR-2W", prixHt: 69, stock: { quantite: 10 } }],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Câble patient Holter ECG",
    type: "accessoire",
    description: "Câble patient pour enregistreurs Holter ECG. Références fictives.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-3002E", "EC-DMS-3003A", "EC-DMS-3004L", "EC-DMS-3002W"],
    variantes: [
      { defaultCode: "EC-DMS-CABLE-3B", configuration: "3 brins", prixHt: 79, stock: { quantite: 15 } },
      { defaultCode: "EC-DMS-CABLE-5B", configuration: "5 brins", prixHt: 85, stock: { quantite: 15 } },
      { defaultCode: "EC-DMS-CABLE-7B", configuration: "7 brins", prixHt: 92, stock: { quantite: 10 } },
      { defaultCode: "EC-DMS-CABLE-10B", configuration: "10 brins", prixHt: 99, stock: { quantite: 8 } },
    ],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Câble de transfert USB HDMI",
    type: "accessoire",
    description: "Câble de transfert des enregistrements. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-DMS-CABLE-USB-HDMI", prixHt: 39, stock: { quantite: 20 } }],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Câble patient ECG d'effort",
    type: "accessoire",
    description: "Câble patient pour ECG d'effort. Références fictives.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-STRESS-BT", "EC-DMS-STRESS-USB"],
    variantes: [
      { defaultCode: "EC-DMS-CABLE-EFFORT-PINCES", configuration: "À pinces", prixHt: 129, stock: { quantite: 6 } },
      { defaultCode: "EC-DMS-CABLE-EFFORT-PRESSION", configuration: "À pression", prixHt: 129, stock: { quantite: 6 } },
    ],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Câble patient ECG fiche banane",
    type: "accessoire",
    description: "Câble patient pour ECG de repos. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-REPOS-BT", "EC-DMS-REPOS-USB", "EC-DMS-REPOS-TAB"],
    variantes: [{ defaultCode: "EC-DMS-CABLE-BANANE", prixHt: 99, stock: { quantite: 8 } }],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Poires et pinces ECG",
    type: "consommable",
    description: "Jeu de poires et de pinces pour ECG de repos. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    compatibleAvec: ["EC-DMS-REPOS-BT", "EC-DMS-REPOS-USB", "EC-DMS-REPOS-TAB"],
    variantes: [{ defaultCode: "EC-DMS-POIRES-PINCES", prixHt: 49, stock: { quantite: 25 } }],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Carte SD",
    type: "accessoire",
    description: "Carte mémoire pour enregistreur. Références fictives.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [
      { defaultCode: "EC-DMS-SD-4GO", configuration: "4 Go", prixHt: 19, stock: { quantite: 30 } },
      { defaultCode: "EC-DMS-SD-8GO", configuration: "8 Go", prixHt: 25, stock: { quantite: 30 } },
    ],
  },
  {
    categorie: "accessoires",
    marque: "DMS",
    nom: "Pochette d'enregistreur",
    type: "accessoire",
    description: "Pochette de transport. Références fictives.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [
      { defaultCode: "EC-DMS-POCHETTE-4L", configuration: "DMS 300-4L", prixHt: 25, stock: { quantite: 15 } },
      { defaultCode: "EC-DMS-POCHETTE-3A", configuration: "DMS300-3A", prixHt: 25, stock: { quantite: 15 } },
      { defaultCode: "EC-DMS-POCHETTE-ABP", configuration: "DMS 300-ABP", prixHt: 25, stock: { quantite: 15 } },
    ],
  },
  {
    categorie: "accessoires",
    marque: "Consommables",
    nom: "Électrodes Holter",
    type: "consommable",
    description: "Électrodes à usage unique pour Holter ECG. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [
      { defaultCode: "EC-ELEC-HOLTER-50", configuration: "Boîte de 50", prixHt: 18, stock: { quantite: 200 } },
      { defaultCode: "EC-ELEC-HOLTER-500", configuration: "Carton de 500", prixHt: 160, stock: { quantite: 40 } },
    ],
  },
  {
    categorie: "accessoires",
    marque: "Consommables",
    nom: "Kit consommables Holter (mise à disposition)",
    type: "consommable",
    description: "Kit requis à la première commande d'une mise à disposition Holter ECG. Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-KIT-HOLTER-MAD", configuration: "Kit", prixHt: 89, stock: { quantite: 30 } }],
  },
  {
    categorie: "accessoires",
    marque: "Microlife",
    nom: "Tensiomètre électronique (offre de bienvenue)",
    type: "accessoire",
    description: "Tensiomètre offert aux professionnels inscrits et abonnés à la newsletter (F02). Référence fictive.",
    formules: ["achat"],
    referenceFictive: true,
    variantes: [{ defaultCode: "EC-BIENVENUE-TENSIOMETRE", prixHt: 59, stock: { quantite: 50 } }],
  },
];

/** Barèmes de financement (coefficient mensuel en % du montant financé), inventés. */
export const BAREMES = [
  { dureeMois: 24, coefficient: 4.48 },
  { dureeMois: 36, coefficient: 3.08 },
  { dureeMois: 48, coefficient: 2.39 },
  { dureeMois: 60, coefficient: 1.98 },
];

const euros = (montant: number) => Math.round(montant * 100);
const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000);

export async function remplirCatalogue(db: PrismaClient): Promise<{ modeles: number; variantes: number }> {
  const categories = new Map<string, number>();
  for (const c of CATEGORIES) {
    const cree = await db.categorie.create({ data: c });
    categories.set(c.code, cree.id);
  }
  let variantes = 0;
  for (const m of MODELES) {
    const eligible = m.type === "consommable" || m.type === "accessoire";
    const modele = await db.modeleArticle.create({
      data: {
        nom: m.nom,
        marque: m.marque,
        categorieId: categories.get(m.categorie)!,
        type: m.type,
        description: m.description,
        formules: m.formules,
        // F06, FR-009 : seuls les consommables et accessoires donnent droit aux bons d'achat.
        eligibleBonsAchat: eligible,
        suiviNumeroSerie: m.variantes.some((v) => v.parc),
        referenceFictive: m.referenceFictive ?? false,
        compatibleAvec: m.compatibleAvec ?? [],
      },
    });
    for (const v of m.variantes) {
      variantes++;
      const data: Prisma.VarianteCreateInput = {
        modele: { connect: { id: modele.id } },
        defaultCode: v.defaultCode,
        referenceFabricant: v.referenceFabricant ?? null,
        configuration: v.configuration ?? null,
        prixHtCentimes: euros(v.prixHt),
        prixInvente: true,
      };
      if (v.stock) {
        data.stock = {
          create: {
            quantite: v.stock.quantite,
            etatHorsStock: v.stock.horsStock ?? "delai",
            delaiJours: v.stock.horsStock === "indisponible" ? null : (v.stock.delaiJours ?? 15),
          },
        };
      }
      if (v.mad) {
        data.offreMad = {
          create: {
            premierMoisCentimes: euros(v.mad.premierMois),
            moisSuivantsCentimes: euros(v.mad.moisSuivants),
            kitRequis: v.mad.kitRequis ?? null,
            valeurRemplacementCentimes: euros(v.mad.valeurRemplacement),
          },
        };
      }
      if (v.parc) {
        data.numerosSerie = {
          create: v.parc.map((n) => ({
            numero: n.numero,
            statut: n.statut,
            retourPrevu: n.retourDansJours !== undefined ? dans(n.retourDansJours) : null,
          })),
        };
      }
      await db.variante.create({ data });
    }
  }
  await db.baremeFinancement.createMany({ data: BAREMES });
  return { modeles: MODELES.length, variantes };
}
