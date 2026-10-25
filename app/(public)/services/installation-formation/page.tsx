import type { Metadata } from "next";
import { AppelContact } from "@/ui/AppelContact";
import { TarifService } from "@/ui/catalogue/TarifService";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Installation et formation" };

// Installation et formation (F03, US8, FR-002, FR-034).
export default function InstallationFormation() {
  return (
    <PagePresentation
      parents={[{ libelle: "Services", href: "/services" }]}
      texte="installation-formation"
      surtitre="Services"
      apres={
        <>
          <TarifService cle="installation" />
          <AppelContact motif="Information produit" libelle="Planifier une installation" />
        </>
      }
    />
  );
}
