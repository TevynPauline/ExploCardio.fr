import { CONNECTEURS, modeDuConnecteur, type NomConnecteur } from "@/lib/config";

// Garde réseau (FR-017, SC-003, SC-014) : dès qu'un connecteur est en mode démonstration,
// aucune requête sortante vers le domaine de ce service n'est autorisée côté serveur.
// Les polices ne sont jamais chargées depuis Google Fonts, quel que soit le mode (FR-042).

const DOMAINES_PAR_CONNECTEUR: Record<NomConnecteur, string[]> = {
  odoo: ["odoo.com"],
  stripe: ["stripe.com", "stripe.network"],
  // Domaine de la plateforme Cloud : connu par PCA_API_URL (à fournir par Nelson, décision D8).
  pca: [],
  emailing: ["brevo.com", "sendinblue.com", "sendgrid.net", "mailjet.com"],
};

const VARIABLES_URL: Partial<Record<NomConnecteur, string>> = {
  odoo: "ODOO_URL",
  pca: "PCA_API_URL",
};

export const DOMAINES_POLICES_EXTERNES = ["fonts.googleapis.com", "fonts.gstatic.com"];

type Env = Record<string, string | undefined>;

/** Domaines interdits pour la configuration donnée. */
export function domainesInterdits(env: Env = process.env): { domaine: string; motif: string }[] {
  const liste = DOMAINES_POLICES_EXTERNES.map((domaine) => ({ domaine, motif: "polices externes (FR-042)" }));
  for (const nom of CONNECTEURS) {
    if (modeDuConnecteur(nom, env) !== "demo") continue;
    const domaines = [...DOMAINES_PAR_CONNECTEUR[nom]];
    const variable = VARIABLES_URL[nom];
    const url = variable ? env[variable] : undefined;
    if (url) {
      try {
        domaines.push(new URL(url).hostname);
      } catch {
        /* adresse invalide : ignorée */
      }
    }
    liste.push(...domaines.map((domaine) => ({ domaine, motif: `connecteur ${nom} en mode démonstration` })));
  }
  return liste;
}

export class RequeteSortanteBloquee extends Error {
  constructor(
    readonly hote: string,
    readonly motif: string,
  ) {
    super(`Requête sortante bloquée vers ${hote} : ${motif}.`);
    this.name = "RequeteSortanteBloquee";
  }
}

/** Renvoie le motif du blocage si l'adresse vise un domaine interdit, sinon null. */
export function motifDeBlocage(adresse: string | URL, env: Env = process.env): { hote: string; motif: string } | null {
  let hote: string;
  try {
    hote = new URL(adresse).hostname.toLowerCase();
  } catch {
    return null;
  }
  const regle = domainesInterdits(env).find((d) => hote === d.domaine || hote.endsWith(`.${d.domaine}`));
  return regle ? { hote, motif: regle.motif } : null;
}

type Fetch = typeof fetch;
const globale = globalThis as unknown as { __gardeReseauActive?: boolean; __fetchOrigine?: Fetch };

/** Installe la garde sur `fetch`, utilisé par le serveur et par les SDK modernes. */
export function activerGardeReseau(env: Env = process.env) {
  if (globale.__gardeReseauActive) return;
  globale.__gardeReseauActive = true;
  const origine = globalThis.fetch;
  globale.__fetchOrigine = origine;
  globalThis.fetch = (async (entree: Parameters<Fetch>[0], init?: Parameters<Fetch>[1]) => {
    const adresse = typeof entree === "string" || entree instanceof URL ? entree : entree.url;
    const blocage = motifDeBlocage(adresse, env);
    if (blocage) {
      console.error(`[garde réseau] ${blocage.hote} bloqué : ${blocage.motif}`);
      throw new RequeteSortanteBloquee(blocage.hote, blocage.motif);
    }
    return origine(entree, init);
  }) as Fetch;
}

/** Retire la garde (tests uniquement). */
export function desactiverGardeReseau() {
  if (globale.__fetchOrigine) globalThis.fetch = globale.__fetchOrigine;
  globale.__gardeReseauActive = false;
}
