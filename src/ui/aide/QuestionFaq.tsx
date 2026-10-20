"use client";

import { useRef } from "react";

/**
 * Question de FAQ dépliable (F09) : à la première ouverture, le compteur anonyme est prévenu
 * (questions les plus consultées en tête, D5).
 */
export function QuestionFaq({ slug, titre, html }: { slug: string; titre: string; html: string }) {
  const compte = useRef(false);
  return (
    <details
      className="ec-card group"
      onToggle={(e) => {
        if (!(e.currentTarget as HTMLDetailsElement).open || compte.current) return;
        compte.current = true;
        void fetch(`/api/aide/${encodeURIComponent(slug)}/consultation`, { method: "POST" }).catch(() => undefined);
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">{titre}</summary>
      <div className="texte-riche mt-3" dangerouslySetInnerHTML={{ __html: html }} />
    </details>
  );
}
