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
    const [, , , modele, methode, a, kw] = appel.args as [string, number, string, string, string, unknown[], Record<string, unknown>?];
    const lignes = (donnees[modele] ??= []);
    const ctx = (kw?.context ?? {}) as Record<string, unknown>;
    if (methode === "search_read") {
      let res = filtrer(lignes, (a[0] ?? []) as unknown[]);
      if (ctx.active_test !== false) res = res.filter((l) => l.active !== false);
      if (typeof kw?.limit === "number") res = res.slice(0, kw.limit);
      return reponseJson({ jsonrpc: "2.0", id: 1, result: res });
    }
    if (methode === "create") {
      const id = Math.max(1000, ...lignes.map((l) => Number(l.id))) + 1;
      const valeurs = { ...(a[0] as Record<string, unknown>) };
      for (const [k, v] of Object.entries(valeurs)) {
        // many2one envoyé en identifiant → relu comme [id, libellé] ; commandes x2many simplifiées.
        if (k.endsWith("_id") && typeof v === "number") valeurs[k] = [v, ""];
        if (k.endsWith("_ids") && Array.isArray(v)) valeurs[k] = v.map((c) => (Array.isArray(c) ? c[1] : c));
      }
      const parent = Array.isArray(valeurs.parent_id) ? valeurs.parent_id[0] : null;
      lignes.push({ active: true, ...valeurs, id, commercial_partner_id: [parent ?? id, ""] });
      return reponseJson({ jsonrpc: "2.0", id: 1, result: id });
    }
    if (methode === "write") {
      const [ids, valeurs] = a as [number[], Record<string, unknown>];
      for (const l of lignes) if (ids.includes(Number(l.id))) Object.assign(l, valeurs);
      return reponseJson({ jsonrpc: "2.0", id: 1, result: true });
    }
    if (methode === "read") return reponseJson({ jsonrpc: "2.0", id: 1, result: lignes.filter((l) => (a[0] as number[]).includes(l.id as number)) });
    if (methode === "search_count") return reponseJson({ jsonrpc: "2.0", id: 1, result: lignes.length });
    return reponseJson({ jsonrpc: "2.0", id: 1, error: { message: "Odoo Server Error", data: { name: "odoo.exceptions.UserError", message: `méthode ${methode} non simulée` } } });
  }) as unknown as typeof fetch;
  return { fetch: fetchSimule, appels };
}

/**
 * Filtre des domaines Odoo : notation préfixée (`&`, `|`, `!`), opérateurs `=`, `!=`, `in`,
 * `=ilike`, `=like` (préfixe `%`), `>`, `<` ; `child_of` comme `=`. Champ absent du jeu :
 * condition ignorée.
 */
function filtrer(lignes: Record<string, unknown>[], domaine: unknown[]) {
  return lignes.filter((l) => evaluer(l, domaine));
}

function condition(l: Record<string, unknown>, c: [string, string, unknown]): boolean {
  const [champ, op, valeur] = c;
  if (!(champ in l)) return true;
  const brut = l[champ];
  const v = Array.isArray(brut) && typeof brut[0] === "number" && op !== "in" ? brut[0] : brut;
  switch (op) {
    case "in":
      return (valeur as unknown[]).includes(Array.isArray(v) ? v[0] : v);
    case "=":
    case "child_of":
      return v === valeur;
    case "!=":
      return v !== valeur;
    case "=ilike":
      return typeof v === "string" && v.toLowerCase() === String(valeur).toLowerCase();
    case "=like":
      return typeof v === "string" && (String(valeur).endsWith("%") ? v.startsWith(String(valeur).slice(0, -1)) : v === valeur);
    case ">":
      return String(v) > String(valeur);
    case "<":
      return String(v) < String(valeur);
    default:
      return true;
  }
}

function evaluer(l: Record<string, unknown>, domaine: unknown[]): boolean {
  let pos = 0;
  const terme = (): boolean => {
    const t = domaine[pos++];
    if (t === "&") return [terme(), terme()].every(Boolean);
    if (t === "|") {
      const a = terme();
      const b = terme();
      return a || b;
    }
    if (t === "!") return !terme();
    return Array.isArray(t) ? condition(l, t as [string, string, unknown]) : true;
  };
  let ok = true;
  while (pos < domaine.length) ok = terme() && ok;
  return ok;
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
