import { redirect } from "next/navigation";

// Ancienne adresse (F02) : la liste des comptes est dans la rubrique « Clients » (F13, D6).
export default async function Comptes({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  const { statut, q } = await searchParams;
  const p = new URLSearchParams({ ...(statut ? { statut } : {}), ...(q ? { q } : {}) });
  redirect(`/admin/clients${p.size ? `?${p.toString()}` : ""}`);
}
