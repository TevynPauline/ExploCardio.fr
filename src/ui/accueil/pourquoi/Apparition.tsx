"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Déclencheur des schémas (F23, D9) : marque chaque carte `data-visible` quand elle entre à
 * l'écran (40 %), une seule fois. Sans observateur disponible, toutes les cartes sont marquées.
 */
export function Apparition({ children, className }: { children: ReactNode; className?: string }) {
  const liste = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const cartes = [...(liste.current?.querySelectorAll<HTMLElement>(".pq-carte") ?? [])];
    if (!("IntersectionObserver" in window)) {
      for (const c of cartes) c.dataset.visible = "";
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.visible = "";
          observateur.unobserve(e.target);
        }
      },
      { threshold: 0.4 },
    );
    for (const c of cartes) observateur.observe(c);
    return () => observateur.disconnect();
  }, []);
  return (
    <ul ref={liste} className={className}>
      {children}
    </ul>
  );
}
