/**
 * Bandeau permanent du site de démonstration (FR-036) : affiché sur toutes les pages, sans
 * possibilité de le masquer, distinct du bandeau promotionnel.
 */
export function BandeauDemo() {
  return (
    <div role="region" aria-label="Avertissement" className="bg-dark px-4 py-2 text-center text-small text-white">
      <strong className="font-semibold">Version de démonstration — données fictives.</strong>{" "}
      Aucune commande, aucun paiement ni aucun message n’est réel.
    </div>
  );
}
