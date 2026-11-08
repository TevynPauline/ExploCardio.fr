import { expect, test, type APIRequestContext } from "@playwright/test";

// F21 — lot 1, US1 (SC-001) : la démonstration reste fermée aux moteurs de recherche ; la page
// d'attente (127.0.0.1, déclarée dans DOMAINES_PAGE_ATTENTE comme pour F17) est indexable.

test.describe.configure({ timeout: 120_000 });

const attente = (baseURL: string | undefined) => {
  const url = new URL(baseURL ?? "http://localhost:3000");
  url.hostname = "127.0.0.1";
  return url.origin;
};

const demonstration = (baseURL: string | undefined) => {
  const url = new URL(baseURL ?? "http://localhost:3000");
  url.hostname = "localhost";
  return url.origin;
};

async function texte(requete: APIRequestContext, url: string) {
  const r = await requete.get(url, { maxRedirects: 0 });
  return { statut: r.status(), entetes: r.headers(), corps: await r.text() };
}

test("démonstration : tout est fermé aux robots", async ({ request, baseURL }) => {
  const o = demonstration(baseURL);
  for (const chemin of ["/", "/catalogue", "/demo/acces"]) {
    const r = await request.get(`${o}${chemin}`, { maxRedirects: 0 });
    expect(r.headers()["x-robots-tag"], chemin).toContain("noindex");
  }
  const robots = await texte(request, `${o}/robots.txt`);
  expect(robots.corps).toMatch(/Disallow: \/\s*$/m);
  expect(robots.corps).not.toContain("Sitemap:");
  const plan = await texte(request, `${o}/sitemap.xml`);
  expect(plan.corps).not.toContain("<loc>");
});

test("page d'attente : indexable, canonique, carte d'identité, robots.txt et plan du site", async ({ page, request, baseURL }) => {
  const o = attente(baseURL);
  const reponse = await page.goto(`${o}/`);
  expect(reponse?.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^index, follow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https:\/\/[^/]+\/?$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /ExploCardio\.fr/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /explorations fonctionnelles cardiaques/);

  const blocs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const organisation = blocs.map((b) => JSON.parse(b)).find((d) => d["@type"] === "Organization");
  expect(organisation).toMatchObject({ name: "ExploCardio.fr", vatID: "FR46132194101", address: { addressLocality: "Fuveau" } });

  const robots = await texte(request, `${o}/robots.txt`);
  expect(robots.statut).toBe(200);
  expect(robots.corps).toContain("Allow: /");
  expect(robots.corps).toContain("Disallow: /admin");
  expect(robots.corps).toMatch(/Sitemap: https:\/\/.+\/sitemap\.xml/);

  const plan = await texte(request, `${o}/sitemap.xml`);
  expect(plan.statut).toBe(200);
  expect(plan.corps.match(/<loc>/g)).toHaveLength(1);

  for (const chemin of ["/catalogue", "/bientot", "/admin"]) {
    const r = await texte(request, `${o}${chemin}`);
    expect(r.statut, chemin).toBe(308);
    expect(r.entetes["location"], chemin).toMatch(/\/$/);
    expect(r.entetes["x-robots-tag"], chemin).toContain("noindex");
  }
});
