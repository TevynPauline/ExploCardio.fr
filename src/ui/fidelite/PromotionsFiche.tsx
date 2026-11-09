import { finLisible, promotionsDesReferences } from "@/domaine/fidelite/promotions";
import { prixTexte, prixTtc } from "@/domaine/catalogue/prix";
import { euros } from "@/lib/montants";

/** Promotions en cours sur la fiche (F06, FR-033) : prix d'origine et prix remisé TTC, HT en complément (F22), date de fin. */
export async function PromotionsFiche({ variantes }: { variantes: { defaultCode: string; configuration: string | null; tauxTva: number }[] }) {
  const promos = await promotionsDesReferences(variantes.map((v) => v.defaultCode));
  if (!promos.length) return null;
  const libelle = (code: string) => variantes.find((v) => v.defaultCode === code)?.configuration;
  const taux = (code: string) => variantes.find((v) => v.defaultCode === code)?.tauxTva ?? 20;
  return (
    <section aria-label="Promotion sur ce produit" className="ec-box--promo flex flex-col gap-2 p-4">
      {promos.map((p) => (
        <div key={p.nom} className="flex flex-col gap-1">
          <p className="font-semibold text-ink">
            {p.nom}
            {p.type === "code_promo" && p.code && !p.nom.includes(p.code) ? ` — code ${p.code}` : ""}
          </p>
          <ul className="flex list-none flex-col gap-1 p-0">
            {p.articles.map((a) => (
              <li key={a.defaultCode}>
                {variantes.length > 1 && libelle(a.defaultCode) ? `${libelle(a.defaultCode)} : ` : ""}
                <s aria-label={`Prix d’origine ${prixTexte({ ht: a.prixHt, tauxTva: taux(a.defaultCode) })}`}>{euros(prixTtc(a.prixHt, taux(a.defaultCode)))} TTC</s>{" "}
                <strong>{euros(prixTtc(a.prixRemiseHt, taux(a.defaultCode)))} TTC</strong>{" "}
                {/* Fond promo : pas de text-muted (contraste 3,87:1). */}<span className="text-small">soit {euros(a.prixRemiseHt)} HT</span>
              </li>
            ))}
          </ul>
          {p.fin ? <p className="text-small">Jusqu’au {finLisible(p.fin)}.</p> : null}
        </div>
      ))}
    </section>
  );
}
