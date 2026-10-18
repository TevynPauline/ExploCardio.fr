import Link from "next/link";
import { Kicker } from "../Kicker";

/** Accès au tunnel refusé (compte non validé, panier vide) : explication, panier conservé (US2-7). */
export function RefusTunnel({ message, lien }: { message: string; lien: string }) {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
      <Kicker>Commande</Kicker>
      <h1 className="text-display font-light">Commande impossible pour le moment</h1>
      <p role="alert" className="ec-box--promo p-4 font-medium">{message}</p>
      <p>Votre panier est conservé.</p>
      <p>
        <Link href={lien} className="ec-btn ec-btn--primary">{lien === "/catalogue" ? "Découvrir le catalogue" : "Revenir au panier"}</Link>
      </p>
    </div>
  );
}
