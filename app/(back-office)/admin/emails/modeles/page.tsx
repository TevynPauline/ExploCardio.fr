import type { Metadata } from "next";
import Link from "next/link";
import { CATALOGUE, type EntreeCatalogue } from "@/domaine/emailing/catalogue";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Card, Kicker } from "@/ui";
import { dateCourte } from "../campagnes/etats";
import { NavEmails } from "../NavEmails";

export const metadata: Metadata = { title: "Modèles d’emails" };

const FAMILLES = [
  { famille: "transactionnel", titre: "Toujours envoyés", texte: "Liés à une action du client ou à un engagement en cours ; aucune promotion." },
  { famille: "service", titre: "Emails de service", texte: "Utiles au client, désactivables dans ses préférences." },
] as const;

// Modèles d'emails (F10, US8, FR-026, FR-038) : liste par famille ; chaque modèle se modifie,
// se prévisualise et se teste avant publication. Les campagnes s'écrivent dans « Campagnes ».
export default async function Modeles() {
  await exigerAdministrateur();
  const modifies = new Map((await dbSite().modeleEmail.findMany({ where: { textesPublies: { not: undefined } } })).map((m) => [m.code, m]));
  const entrees = Object.entries(CATALOGUE as Record<string, EntreeCatalogue>).filter(([code]) => code !== "campagne");
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Emails</Kicker>
      <h1 className="text-h2 font-light">Modèles d’emails</h1>
      <NavEmails actif="/admin/emails/modeles" />
      <p className="text-muted">Objet, aperçu et paragraphes de chaque email sont modifiables. La mise en page, les tableaux et les boutons restent ceux de la charte.</p>
      {FAMILLES.map((f) => (
        <Card key={f.famille} className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold">{f.titre}</h2>
          <p className="text-small text-muted">{f.texte}</p>
          <ul className="grid list-none gap-1 p-0 sm:grid-cols-2">
            {entrees
              .filter(([, e]) => e.famille === f.famille)
              .map(([code, e]) => {
                const m = modifies.get(code);
                return (
                  <li key={code}>
                    <Link href={`/admin/emails/modeles/${code}`} className="inline-flex min-h-11 items-center">{e.libelle}</Link>
                    <span className="text-small text-muted">
                      {" "}· {e.module}
                      {m?.publieLe ? ` · modifié le ${dateCourte(m.publieLe)}` : ""}
                      {m?.textesBrouillon ? " · brouillon en cours" : ""}
                    </span>
                  </li>
                );
              })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
