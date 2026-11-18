// Écritures du mode réel d'Odoo faites une seule fois par clé (F14 lots 2-3, D1, FR-011).
// La trace est gardée dans la base du site, par base Odoo : une clé vue sur la copie de recette
// n'est jamais rejouée sur la base réelle. Si la trace manque (coupure entre l'écriture dans
// Odoo et son enregistrement), chaque opération sait aussi retrouver son objet dans Odoo.

export type StockageEcritures = {
  lire(base: string, cle: string): Promise<unknown | undefined>;
  enregistrer(base: string, cle: string, operation: string, resultat: unknown): Promise<void>;
};

export function stockageSite(): StockageEcritures {
  const db = async () => (await import("@/lib/db/site")).dbSite();
  return {
    async lire(base, cle) {
      const e = await (await db()).ecritureOdoo.findUnique({ where: { base_cle: { base, cle } } });
      return e ? e.resultat : undefined;
    },
    async enregistrer(base, cle, operation, resultat) {
      const json = JSON.parse(JSON.stringify(resultat));
      await (await db()).ecritureOdoo.upsert({
        where: { base_cle: { base, cle } },
        create: { base, cle, operation, resultat: json },
        update: {},
      });
    },
  };
}

/** Stockage en mémoire, pour les tests. */
export function stockageMemoire(): StockageEcritures & { contenu: Map<string, unknown> } {
  const contenu = new Map<string, unknown>();
  return {
    contenu,
    async lire(base, cle) {
      return contenu.get(`${base}|${cle}`);
    },
    async enregistrer(base, cle, _operation, resultat) {
      if (!contenu.has(`${base}|${cle}`)) contenu.set(`${base}|${cle}`, JSON.parse(JSON.stringify(resultat)));
    },
  };
}

export type Ecritures = {
  /** Renvoie le résultat déjà enregistré pour cette clé, sinon exécute `faire` et l'enregistre. */
  uneFois<T>(cle: string, operation: string, faire: () => Promise<T>): Promise<{ resultat: T; deja: boolean }>;
};

export function creerEcritures(base: string, stockage: StockageEcritures = stockageSite()): Ecritures {
  return {
    async uneFois<T>(cle: string, operation: string, faire: () => Promise<T>) {
      const deja = await stockage.lire(base, cle);
      if (deja !== undefined) return { resultat: deja as T, deja: true };
      const resultat = await faire();
      await stockage.enregistrer(base, cle, operation, resultat);
      return { resultat, deja: false };
    },
  };
}
