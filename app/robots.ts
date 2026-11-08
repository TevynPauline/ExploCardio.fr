import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { origineCanonique, politiqueIndexation } from "@/lib/referencement/politique";
import { consignesRobots } from "@/lib/referencement/robots";

// robots.txt (F21, contrats § 1) : selon l'adresse appelée. Démonstration : tout interdit ;
// page d'attente et production : autorisé, avec le plan du site.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const politique = politiqueIndexation((await headers()).get("host"));
  return consignesRobots(politique, origineCanonique(politique));
}
