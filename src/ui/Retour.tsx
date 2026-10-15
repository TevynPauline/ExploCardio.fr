/** Message de résultat d'une action (succès annoncé poliment, erreur en alerte). */
export function Retour({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (erreur) {
    return (
      <p role="alert" className="ec-box--promo p-4 font-medium text-ink">
        {erreur}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="ec-box--info p-4 text-ink">
        {ok}
      </p>
    );
  }
  return null;
}
