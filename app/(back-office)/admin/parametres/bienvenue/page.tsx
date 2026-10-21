import type { Metadata } from "next";
import { exigerDroit } from "@/lib/droits";
import { EcranParametres } from "../Theme";

export const metadata: Metadata = { title: "Offre de bienvenue" };

// Offre de bienvenue (F13, D3) : modifiable par l'administrateur et le commercial.
export default async function Bienvenue({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerDroit("parametres.bienvenue", "voir");
  return <EcranParametres theme="bienvenue" r={await searchParams} />;
}
