import Link from "next/link";

// Périmètre de livraison (F16, US8, FR-028) : la commande en ligne est réservée à la France
// métropolitaine ; l'outre-mer et l'étranger passent par l'équipe.
export function MentionMetropole() {
  return (
    <p className="text-small text-muted">
      Livraison en France métropolitaine (Corse comprise). Outre-mer et étranger :{" "}
      <Link href="/qui-sommes-nous?motif=hors-metropole#contact" className="inline-flex min-h-11 items-center">contactez-nous</Link>.
    </p>
  );
}
