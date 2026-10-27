import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ExploCardio.fr", template: "%s — ExploCardio.fr" },
  description: "Le spécialiste des explorations fonctionnelles cardiaques.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Police hébergée par le site (styles/fonts.css), aucun appel à Google Fonts */}
        <link rel="preload" href="/fonts/inter/inter-latin-300-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/inter/inter-latin-600-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Choix de cookies déjà fait : le panneau rendu par le serveur est masqué dès le premier
            affichage, avant le chargement du JavaScript (aucun clignotement). */}
        <script
          dangerouslySetInnerHTML={{
            __html: 'document.documentElement.dataset.consentement=/(?:^|;\\s*)ec_consentement=/.test(document.cookie)?"oui":"non"',
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
