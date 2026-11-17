import { modeDuSite } from "@/lib/config";

/**
 * Bandeau permanent du site de démonstration (FR-036) : affiché sur toutes les pages, sans
 * possibilité de le masquer, distinct du bandeau promotionnel. Posé par chaque mise en page
 * (site public, back-office, pages /demo, page introuvable) ; la page d'attente de F17 n'en a
 * pas : elle n'appartient pas à la démonstration.
 */
export function BandeauDemo() {
  const mode = modeDuSite();
  if (mode === "prod") return null;
  if (mode === "recette") {
    // F14 (recette) : site fermé, produits réels d'Odoo, aucune écriture possible dans Odoo.
    return (
      <div role="region" aria-label="Avertissement" className="bg-dark px-4 py-2 text-center text-small text-white">
        <strong className="font-semibold">Site de recette — réservé à l’équipe.</strong>{" "}
        Produits réels d’Odoo ; aucune commande, aucun paiement ni aucun message n’est réel.
      </div>
    );
  }
  return (
    <div role="region" aria-label="Avertissement" className="bg-dark px-4 py-2 text-center text-small text-white">
      <strong className="font-semibold">Version de démonstration — données fictives.</strong>{" "}
      Aucune commande, aucun paiement ni aucun message n’est réel.
    </div>
  );
}
