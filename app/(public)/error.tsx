"use client";

import Link from "next/link";

// Erreur inattendue (R12) : message sobre, sans détail technique pour le visiteur.
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-16">
      <h1 className="text-display font-light">Un incident est survenu</h1>
      <p>Cette page n’a pas pu s’afficher. Réessayez dans un instant ; si le problème persiste, contactez-nous.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="ec-btn ec-btn--primary">Réessayer</button>
        <Link href="/" className="ec-btn ec-btn--secondary">Accueil</Link>
        <Link href="/qui-sommes-nous#contact" className="ec-btn ec-btn--secondary">Nous contacter</Link>
      </div>
    </div>
  );
}
