import Link from "next/link";

/** Bouton vers le formulaire de contact avec un motif présélectionné. */
export function AppelContact({ motif, libelle }: { motif: string; libelle: string }) {
  return (
    <p>
      <Link href={`/qui-sommes-nous?motif=${encodeURIComponent(motif)}#contact`} className="ec-btn ec-btn--primary">
        {libelle}
      </Link>
    </p>
  );
}
