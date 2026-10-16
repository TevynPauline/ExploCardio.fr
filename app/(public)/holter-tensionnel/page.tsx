import type { Metadata } from "next";
import { PageFamille } from "@/ui/PageFamille";

export const metadata: Metadata = { title: "Holter tensionnel \/ MAPA" };

export default function Page() {
  return <PageFamille cle="holter-tensionnel" />;
}
