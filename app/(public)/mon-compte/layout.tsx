import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: { default: "Mon compte", template: "%s — Mon compte" }, robots: { index: false } };
export const dynamic = "force-dynamic";

// Espace client (F02, US5). La session est vérifiée par chaque page (compteCourant).
export default function MiseEnPageMonCompte({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">{children}</div>;
}
