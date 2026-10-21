import { redirect } from "next/navigation";

// Ancienne page « Assistance » (F06) : la recherche d'un client et ses droits sont dans la
// rubrique « Clients » (F13, D6).
export default async function Assistance({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/admin/clients?statut=tous&q=${encodeURIComponent(q)}` : "/admin/clients?statut=tous");
}
