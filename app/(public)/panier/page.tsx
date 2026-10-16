import type { Metadata } from "next";
import Link from "next/link";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Panier" };

// Le panier arrive avec F04.
export default function Panier() {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
      <Kicker>Panier</Kicker>
      <h1 className="text-display font-light">Votre panier est vide</h1>
      <p><Link href="/catalogue" className="ec-btn ec-btn--primary">Découvrir le catalogue</Link></p>
    </div>
  );
}
