import type { Metadata } from "next";
import { AppelContact } from "@/ui/AppelContact";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Financement" };

// Le parcours de demande de financement arrive avec F04 : en attendant, formulaire de contact.
export default function Financement() {
  return <PagePresentation texte="financement" surtitre="Services" apres={<AppelContact motif="Financement" libelle="Demander mon financement" />} />;
}
