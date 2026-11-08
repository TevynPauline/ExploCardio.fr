import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { adressesPlanDuSite } from "@/lib/referencement/plan-du-site";
import { origineCanonique, politiqueIndexation } from "@/lib/referencement/politique";

// Plan du site (F21, contrats § 2) : vide sur la démonstration, la seule page d'accueil sur la
// page d'attente ; les pages du site ouvert s'ajoutent avec la seconde livraison (US2).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const politique = politiqueIndexation((await headers()).get("host"));
  return adressesPlanDuSite(politique, origineCanonique(politique));
}
