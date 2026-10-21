import { redirect } from "next/navigation";

// Ancienne adresse (F02) : la fiche du compte est la fiche client de la rubrique « Clients » (F13, D6).
export default async function FicheCompte({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/clients/${encodeURIComponent(id)}`);
}
