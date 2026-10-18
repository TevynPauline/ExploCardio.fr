"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Relit la page à intervalle régulier (attente d'une confirmation de paiement). */
export function Actualiser({ secondes }: { secondes: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), secondes * 1000);
    return () => window.clearInterval(id);
  }, [router, secondes]);
  return null;
}
