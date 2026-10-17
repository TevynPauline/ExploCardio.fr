import type { Metadata } from "next";
import { liensContact } from "@/lib/contact-whatsapp";
import { TarifService } from "@/ui/catalogue/TarifService";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Assistance et service" };

export default async function Assistance() {
  const liens = await liensContact();
  return (
    <PagePresentation
      texte="assistance"
      surtitre="Services"
      apres={
        <>
        <TarifService cle="assistance" />
        <div className="flex flex-wrap gap-3">
          <a href={liens.appeler} className="ec-btn ec-btn--primary">Appeler</a>
          <a href={liens.ecrire} className="ec-btn ec-btn--secondary">Écrire sur WhatsApp</a>
        </div>
        </>
      }
    />
  );
}
