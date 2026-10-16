import type { Metadata } from "next";
import { PageFamille } from "@/ui/PageFamille";

export const metadata: Metadata = { title: "Accessoires et consommables" };

export default function Page() {
  return <PageFamille cle="accessoires-consommables" />;
}
