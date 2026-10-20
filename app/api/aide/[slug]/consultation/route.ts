import { headers } from "next/headers";
import { compterConsultation } from "@/domaine/aide/lecture";
import { adresseVisiteur, autoriserEnvoi } from "@/domaine/limites";

// Compteur anonyme d'ouverture d'une question de FAQ (F09, D5) : aucune donnée personnelle
// enregistrée ; une ouverture par visiteur et par heure au plus (empreinte de l'adresse).
export async function POST(_requete: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return new Response(null, { status: 404 });
  if (await autoriserEnvoi(`aide:${slug}`, adresseVisiteur(await headers()), "anonyme", new Date(), 1)) await compterConsultation(slug);
  return new Response(null, { status: 204 });
}
