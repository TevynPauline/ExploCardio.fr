// Taille des groupes de connexions PostgreSQL (une base Scalingo de petite taille n'accepte que
// quelques dizaines de connexions). Pendant `next build`, plusieurs processus pré-rendent les pages
// en parallèle : 2 connexions chacun suffisent. Réglable par DB_POOL_MAX.

export function tailleDuGroupe(): number {
  const reglee = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
  if (Number.isInteger(reglee) && reglee > 0) return reglee;
  return process.env.NEXT_PHASE === "phase-production-build" ? 2 : 5;
}
