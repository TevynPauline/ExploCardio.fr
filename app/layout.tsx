import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// F21 (R5, R8) : adresse de référence, aperçus de partage par défaut. Hors production, toute page
// est déclarée non indexable (double sûreté avec l'en-tête du proxy) ; la page d'attente, seule
// exception, déclare elle-même son indexation.
const enProduction = process.env.SITE_MODE === "prod";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "ExploCardio.fr", template: "%s — ExploCardio.fr" },
  description: "Le spécialiste des explorations fonctionnelles cardiaques.",
  openGraph: { siteName: "ExploCardio.fr", locale: "fr_FR", type: "website" },
  twitter: { card: "summary_large_image" },
  ...(enProduction ? {} : { robots: { index: false, follow: false } }),
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
