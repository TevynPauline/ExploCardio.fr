import { dbSite } from "@/lib/db/site";
import { NotFound } from "../../erreurs";
import { fluxDe, verifierChemin, verifierPlage } from "../chemins";
import type { ConnecteurStockage } from "../interfaces";

// Mode démonstration du stockage (F26, R4) : la table fichier_stocke de la base du site, comme
// avant F26. Ces fichiers sont des contenus du back-office, réels dès la phase 1 (principe III).

export function creerStockageDemo(): ConnecteurStockage {
  return {
    async deposer(chemin, type, octets) {
      verifierChemin(chemin);
      const donnees = { type, octets: new Uint8Array(octets), taille: octets.length };
      await dbSite().fichierStocke.upsert({ where: { chemin }, create: { chemin, ...donnees }, update: donnees });
    },

    async lire(chemin, plage) {
      verifierChemin(chemin);
      const f = await dbSite().fichierStocke.findUnique({ where: { chemin } });
      if (!f) throw new NotFound("Fichier", chemin);
      const octets = new Uint8Array(f.octets);
      if (!plage) return { taille: octets.length, plage: null, corps: fluxDe(octets) };
      const p = verifierPlage(plage, octets.length);
      return { taille: octets.length, plage: p, corps: fluxDe(octets.subarray(p.debut, p.fin + 1)) };
    },

    async existe(chemin) {
      verifierChemin(chemin);
      // Taille seule : l'empreinte n'est calculée qu'à la demande (inutile pour lire une plage).
      const f = await dbSite().fichierStocke.findUnique({ where: { chemin }, select: { taille: true } });
      return f ? { taille: f.taille, md5: null } : null;
    },
  };
}
