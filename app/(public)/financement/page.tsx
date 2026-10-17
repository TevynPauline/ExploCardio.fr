import type { Metadata } from "next";
import { AppelContact } from "@/ui/AppelContact";
import { TarifService } from "@/ui/catalogue/TarifService";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Financement" };

// Le parcours de demande de financement arrive avec F04 : en attendant, formulaire de contact.
export default function Financement() {
  return <PagePresentation texte="financement" surtitre="Services" apres={
        <>
          <TarifService cle="financement" />
          <AppelContact motif="Financement" libelle="Demander mon financement" />
        </>
      } />;
}
