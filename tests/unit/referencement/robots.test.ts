import { describe, expect, it } from "vitest";
import { consignesRobots } from "@/lib/referencement/robots";

const O = "https://www.explocardio.fr";

describe("consignesRobots (contrats § 1)", () => {
  it("ferme : tout interdit, pas de plan du site", () => {
    expect(consignesRobots("ferme", O)).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
  });

  it.each(["attente", "ouvert"] as const)("%s : autorise, ferme /admin /api /demo, pointe le plan du site", (politique) => {
    expect(consignesRobots(politique, O)).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/demo"] }],
      sitemap: `${O}/sitemap.xml`,
    });
  });
});
