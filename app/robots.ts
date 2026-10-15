import type { MetadataRoute } from "next";

// robots.txt (FR-035) : le site de démonstration interdit toute indexation.
// En production, F01 précisera les règles de référencement.
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_MODE !== "prod") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/demo"] }] };
}
