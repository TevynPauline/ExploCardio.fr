import type { ReactNode } from "react";
import { Dots } from "./Dots";

/** Surtitre en capitales précédé des trois points (.ec-kicker). */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="ec-kicker">
      <Dots />
      {children}
    </p>
  );
}
