import type { ReactNode } from "react";
import { cx } from "../cx";
import { Kicker } from "../Kicker";

/** Section de l'accueil : surtitre, titre, contenu ; repérée par data-section pour les tests. */
export function Section({
  id,
  surtitre,
  titre,
  children,
  className,
}: {
  id: string;
  surtitre: string;
  titre: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section data-section={id} aria-labelledby={`titre-${id}`} className={cx("py-14", className)}>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4">
        <div className="flex flex-col gap-2">
          <Kicker>{surtitre}</Kicker>
          <h2 id={`titre-${id}`} className="text-h2 font-light">
            {titre}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}
