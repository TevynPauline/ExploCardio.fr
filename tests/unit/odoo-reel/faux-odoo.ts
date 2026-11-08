import { ClientOdoo, type OptionsClient } from "@/connecteurs/odoo/real/client";

// Faux serveur Odoo pour les tests du mode réel : aucune requête réseau. Les réponses
// imitent celles d'Odoo 20 enregistrées sur la copie de test (F14, T002).

export const CLE_TEST = "cle-secrete-de-test-0123456789";

type Appel = { service: string; methode: string; args: unknown[] };
type Repondeur = (appel: Appel) => unknown;

export function reponseJson(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });
}

/** `donnees[modele]` : enregistrements renvoyés par search_read (domaine ignoré sauf `id in`). */
export function fauxOdoo(donnees: Record<string, Record<string, unknown>[]>, surcharge?: Repondeur) {
  const appels: Appel[] = [];
  const fetchSimule = (async (_url: string, init?: RequestInit) => {
    const { params } = JSON.parse(String(init?.body)) as { params: { service: string; method: string; args: unknown[] } };
    const appel = { service: params.service, methode: params.method, args: params.args };
    appels.push(appel);
    const special = surcharge?.(appel);
    if (special instanceof Response) return special;
    if (special !== undefined) return reponseJson({ jsonrpc: "2.0", id: 1, result: special });
    if (appel.service === "common" && appel.methode === "authenticate") return reponseJson({ jsonrpc: "2.0", id: 1, result: 2 });
    const [, , , modele, methode, a] = appel.args as [string, number, string, string, string, unknown[]];
    const lignes = donnees[modele] ?? [];
    if (methode === "search_read") return reponseJson({ jsonrpc: "2.0", id: 1, result: filtrer(lignes, (a[0] ?? []) as unknown[]) });
    if (methode === "read") return reponseJson({ jsonrpc: "2.0", id: 1, result: lignes.filter((l) => (a[0] as number[]).includes(l.id as number)) });
    if (methode === "search_count") return reponseJson({ jsonrpc: "2.0", id: 1, result: lignes.length });
    return reponseJson({ jsonrpc: "2.0", id: 1, error: { message: "Odoo Server Error", data: { name: "odoo.exceptions.UserError", message: `méthode ${methode} non simulée` } } });
  }) as unknown as typeof fetch;
  return { fetch: fetchSimule, appels };
}

/** Filtre minimal : conditions `[champ, "in" | "=", valeur]` ; autres opérateurs et champs absents ignorés. */
function filtrer(lignes: Record<string, unknown>[], domaine: unknown[]) {
  return lignes.filter((l) =>
    domaine.every((c) => {
      if (!Array.isArray(c)) return true;
      const [champ, op, valeur] = c as [string, string, unknown];
      if (!(champ in l)) return true; // champ non enregistré dans le jeu : condition ignorée
      const v = Array.isArray(l[champ]) && typeof (l[champ] as unknown[])[0] === "number" && op !== "in" ? (l[champ] as unknown[])[0] : l[champ];
      if (op === "in") return (valeur as unknown[]).includes(Array.isArray(v) ? v[0] : v);
      if (op === "=") return v === valeur;
      return true;
    }),
  );
}

export function clientDeTest(fetchSimule: typeof fetch, o: Partial<OptionsClient> = {}) {
  return new ClientOdoo({
    url: "https://odoo.test",
    base: "base-test",
    utilisateur: "site@test",
    cle: CLE_TEST,
    fetch: fetchSimule,
    attendre: async () => {},
    ...o,
  });
}
