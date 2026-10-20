import type { Metadata } from "next";
import { TarifService } from "@/ui/catalogue/TarifService";
import { ContactWhatsApp } from "@/ui/contact/ContactWhatsApp";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Assistance et service" };

export default async function Assistance() {
  return (
    <PagePresentation
      texte="assistance"
      surtitre="Services"
      apres={
        <>
          <TarifService cle="assistance" />
          <ContactWhatsApp titre="Une question ?" />
        </>
      }
    />
  );
}
