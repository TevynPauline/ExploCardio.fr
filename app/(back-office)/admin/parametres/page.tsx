import type { Metadata } from "next";
import { THEMES, type Theme } from "@/domaine/parametres";
import { EcranParametres } from "./Theme";

export const metadata: Metadata = { title: "Paramètres" };

export default async function Parametres({ searchParams }: { searchParams: Promise<{ theme?: string; ok?: string; erreur?: string }> }) {
  const { theme, ...r } = await searchParams;
  return <EcranParametres theme={theme && theme in THEMES ? (theme as Theme) : "livraison"} r={r} />;
}
