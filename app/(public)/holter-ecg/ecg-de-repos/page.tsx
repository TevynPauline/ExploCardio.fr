import type { Metadata } from "next";
import { PageFamille } from "@/ui/PageFamille";

export const metadata: Metadata = { title: "ECG de repos" };

export default function Page() {
  return <PageFamille cle="ecg-de-repos" />;
}
