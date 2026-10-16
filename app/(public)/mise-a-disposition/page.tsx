import type { Metadata } from "next";
import { AppelContact } from "@/ui/AppelContact";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Mise à disposition" };

// Le parcours de mise à disposition arrive avec F05 : en attendant, formulaire de contact
// avec ce motif présélectionné (hypothèse confirmée de la spec).
export default function MiseADisposition() {
  return <PagePresentation texte="mise-a-disposition" surtitre="Services" apres={<AppelContact motif="Mise à disposition" libelle="Demander une mise à disposition" />} />;
}
