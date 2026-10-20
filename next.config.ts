import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aucune ressource externe : polices et logos sont servis par le site (FR-042).
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  // Images du back-office : 2 Mo ; documents PDF : 10 Mo ; vidéos du centre d'aide : 50 Mo
  // (src/lib/stockage.ts). Actions réservées à l'équipe pour les gros fichiers.
  // Construction : 2 processus pour le pré-rendu (limite de connexions de la base, voir src/lib/db/pool.ts).
  experimental: { serverActions: { bodySizeLimit: "52mb" }, cpus: 2 },
  // Site de démonstration : aucune réponse indexable, fichiers statiques compris (FR-035).
  async headers() {
    if (process.env.SITE_MODE === "prod") return [];
    return [{ source: "/:chemin*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
