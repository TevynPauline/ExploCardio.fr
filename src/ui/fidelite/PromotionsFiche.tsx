import { finLisible, promotionsDesReferences } from "@/domaine/fidelite/promotions";
import { euros } from "@/lib/montants";

/** Promotions en cours sur la fiche (F06, FR-033) : prix d'origine, prix remisé HT, date de fin. */
export async function PromotionsFiche({ variantes }: { variantes: { defaultCode: string; configuration: string | null }[] }) {
  const promos = await promotionsDesReferences(variantes.map((v) => v.defaultCode));
  if (!promos.length) return null;
  const libelle = (code: string) => variantes.find((v) => v.defaultCode === code)?.configuration;
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
                <s aria-label={`Prix d’origine ${euros(a.prixHt)} HT`}>{euros(a.prixHt)} HT</s> <strong>{euros(a.prixRemiseHt)} HT</strong>
              </li>
            ))}
          </ul>
          {p.fin ? <p className="text-small">Jusqu’au {finLisible(p.fin)}.</p> : null}
        </div>
      ))}
    </section>
  );
}
