import { TEXTES_GENERAUX } from "./modeles";
import { TEXTES_CLOUD } from "./modeles-cloud";
import { TEXTES_COMMANDES } from "./modeles-commandes";
import { TEXTES_COMPTES } from "./modeles-comptes";
import { TEXTES_EMAILING } from "./modeles-emailing";
import { TEXTES_FIDELITE } from "./modeles-fidelite";
import { TEXTES_LOCATIONS } from "./modeles-locations";
import type { TextesModele } from "./textes";

// Textes par défaut de tous les modèles (F10, D2) : référence du back-office (« revenir au texte
// d'origine »), des variables autorisées et du contrôle automatique des emails.

export const TEXTES_PAR_DEFAUT: Record<string, TextesModele> = {
  ...TEXTES_GENERAUX,
  ...TEXTES_COMPTES,
  ...TEXTES_COMMANDES,
  ...TEXTES_LOCATIONS,
  ...TEXTES_FIDELITE,
  ...TEXTES_CLOUD,
  ...TEXTES_EMAILING,
};
