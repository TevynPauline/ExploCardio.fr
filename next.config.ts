import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aucune ressource externe : polices et logos sont servis par le site (FR-042).
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: false,
  // Images du back-office : 2 Mo ; documents PDF des produits : 10 Mo (src/lib/stockage.ts).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // Site de démonstration : aucune réponse indexable, fichiers statiques compris (FR-035).
  async headers() {
    if (process.env.SITE_MODE === "prod") return [];
    return [{ source: "/:chemin*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
