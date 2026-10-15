import type { Metadata } from "next";
import type { ReactNode } from "react";
import { modeDuSite } from "@/lib/config";
import { BandeauDemo } from "@/ui/BandeauDemo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ExploCardio.fr", template: "%s — ExploCardio.fr" },
  description: "Le spécialiste des explorations fonctionnelles cardiaques (hors imagerie).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const demonstration = modeDuSite() === "demo";
  return (
    <html lang="fr">
      <head>
        {/* Police hébergée par le site (styles/fonts.css), aucun appel à Google Fonts */}
        <link rel="preload" href="/fonts/inter/inter-latin-300-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter/inter-latin-600-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {demonstration ? <BandeauDemo /> : null}
        {children}
      </body>
    </html>
  );
}
