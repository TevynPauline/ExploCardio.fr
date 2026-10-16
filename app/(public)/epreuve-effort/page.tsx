import type { Metadata } from "next";
import { PageFamille } from "@/ui/PageFamille";

export const metadata: Metadata = { title: "Épreuve et écho d'effort" };

export default function Page() {
  return <PageFamille cle="epreuve-effort" />;
}
