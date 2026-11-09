import type { ReactNode } from "react";
import { cx } from "../cx";
import { Kicker } from "../Kicker";

/**
 * Section de l'accueil : surtitre facultatif, titre, contenu ; repérée par data-section pour les
 * tests. Sans surtitre (F20, FR-023), les trois points du logo précèdent directement le titre.
 */
export function Section({
  id,
  surtitre,
  titre,
  children,
  className,
}: {
  id: string;
  surtitre?: string;
  titre: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} data-section={id} aria-labelledby={`titre-${id}`} className={cx("scroll-mt-32", surtitre ? "py-14" : "pb-14 pt-8", className)}>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4">
        <div className="flex flex-col gap-2">
          {surtitre && <Kicker>{surtitre}</Kicker>}
          <h2 id={`titre-${id}`} className="flex items-baseline gap-3 text-h2 font-light">
            {!surtitre && (
              <span aria-hidden="true" className="inline-flex shrink-0 items-end gap-1">
                <i className="block size-2.5 rounded-full bg-euca" />
                <i className="block size-3.5 rounded-full bg-sage" />
                <i className="block size-[1.125rem] rounded-full bg-blue" />
              </span>
            )}
            <span>{titre}</span>
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}
