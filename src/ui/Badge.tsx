import type { ReactNode } from "react";

/** Pastille de la charte (.ec-badge). */
export function Badge({ children }: { children: ReactNode }) {
  return <span className="ec-badge">{children}</span>;
}
