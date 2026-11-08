import type { MetadataRoute } from "next";
import type { PolitiqueIndexation } from "./politique";

// Consignes aux robots (F21, contrats § 1). Les pages privées ne sont pas interdites ici :
// elles portent « noindex », que les robots ne liraient pas si elles leur étaient fermées.

export const CHEMINS_INTERDITS = ["/admin", "/api", "/demo"] as const;

export function consignesRobots(politique: PolitiqueIndexation, origine: string): MetadataRoute.Robots {
  if (politique === "ferme") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...CHEMINS_INTERDITS] }],
    sitemap: `${origine}/sitemap.xml`,
  };
}
