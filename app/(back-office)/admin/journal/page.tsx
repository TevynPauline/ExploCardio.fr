import type { Metadata } from "next";
import Link from "next/link";
import { FAMILLES_ACTIONS, lireJournalActions, lireJournalConnecteurs } from "@/domaine/journal";
import { CONNECTEURS } from "@/lib/config";
import { Kicker } from "@/ui";
import { classeChamp } from "@/ui/admin";

export const metadata: Metadata = { title: "Journal" };

type Params = { onglet?: string; connecteur?: string; resultat?: string; action?: string; auteur?: string; du?: string; au?: string; q?: string; page?: string };

const RESULTATS: Record<string, string> = { erreur: "Erreurs", succes: "Succès", alerte: "Alertes" };
const date = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" });

function lien(p: Params, changements: Partial<Params>) {
  const q = new URLSearchParams(Object.entries({ ...p, ...changements }).filter(([, v]) => v) as [string, string][]);
  return `/admin/journal?${q.toString()}`;
}

function Pagination({ p, page, pages, total }: { p: Params; page: number; pages: number; total: number }) {
  return (
    <nav aria-label="Pages du journal" className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-small text-muted">{total} ligne{total > 1 ? "s" : ""} · page {page} sur {pages}</p>
      {page > 1 ? <Link href={lien(p, { page: String(page - 1) })} className="ec-btn ec-btn--secondary">Page précédente</Link> : null}
      {page < pages ? <Link href={lien(p, { page: String(page + 1) })} className="ec-btn ec-btn--secondary">Page suivante</Link> : null}
    </nav>
  );
}

function Champ({ id, libelle, children }: { id: string; libelle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium">{libelle}</label>
      {children}
    </div>
  );
}

// Journal (F13, US7, FR-031 à FR-033) : appels aux connecteurs et actions de l'équipe.
export default async function Journal({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const onglet = p.onglet === "actions" ? "actions" : "connecteurs";
  const page = Number(p.page ?? "1");
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Journal</Kicker>
      <h1 className="text-h2 font-light">Journal</h1>
      <nav aria-label="Journaux">
        <ul className="flex flex-wrap gap-2">
          <li><Link href="/admin/journal" aria-current={onglet === "connecteurs" ? "page" : undefined} className={`ec-btn ${onglet === "connecteurs" ? "ec-btn--primary" : "ec-btn--secondary"}`}>Connecteurs</Link></li>
          <li><Link href="/admin/journal?onglet=actions" aria-current={onglet === "actions" ? "page" : undefined} className={`ec-btn ${onglet === "actions" ? "ec-btn--primary" : "ec-btn--secondary"}`}>Actions de l’équipe</Link></li>
        </ul>
      </nav>
      {onglet === "connecteurs" ? <Connecteurs p={p} page={page} /> : <Actions p={p} page={page} />}
    </div>
  );
}

async function Connecteurs({ p, page }: { p: Params; page: number }) {
  const j = await lireJournalConnecteurs(p, page);
  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Champ id="f-connecteur" libelle="Connecteur">
          <select id="f-connecteur" name="connecteur" defaultValue={p.connecteur ?? ""} className={classeChamp}>
            <option value="">Tous</option>
            {CONNECTEURS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Champ>
        <Champ id="f-resultat" libelle="Résultat">
          <select id="f-resultat" name="resultat" defaultValue={p.resultat ?? ""} className={classeChamp}>
            <option value="">Tous</option>
            {Object.entries(RESULTATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Champ>
        <Champ id="f-du" libelle="Du"><input id="f-du" name="du" type="date" defaultValue={p.du} className={classeChamp} /></Champ>
        <Champ id="f-au" libelle="Au"><input id="f-au" name="au" type="date" defaultValue={p.au} className={classeChamp} /></Champ>
        <Champ id="f-q" libelle="Opération, objet ou motif"><input id="f-q" name="q" defaultValue={p.q} className={classeChamp} /></Champ>
        <button type="submit" className="ec-btn ec-btn--secondary">Filtrer</button>
      </form>
      <Pagination p={p} page={j.page} pages={j.pages} total={j.total} />
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Appels aux connecteurs">
        <table className="w-full border-collapse text-left text-small">
          <caption className="sr-only">Appels aux connecteurs, du plus récent au plus ancien</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Date</th>
              <th scope="col" className="py-2 pr-3 font-medium">Connecteur</th>
              <th scope="col" className="py-2 pr-3 font-medium">Opération</th>
              <th scope="col" className="py-2 pr-3 font-medium">Objet</th>
              <th scope="col" className="py-2 pr-3 font-medium">Résultat</th>
              <th scope="col" className="py-2 font-medium">Durée</th>
            </tr>
          </thead>
          <tbody>
            {j.lignes.map((l) => (
              <tr key={l.id} className="border-b border-line align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{date(l.date)}</td>
                <td className="py-2 pr-3">{l.connecteur} <span className="text-muted">({l.mode === "demo" ? "démonstration" : "réel"})</span></td>
                <td className="py-2 pr-3 break-all">{l.operation}</td>
                <td className="py-2 pr-3 break-all">{l.objet ?? "—"}</td>
                <td className="py-2 pr-3">{l.resultat === "succes" ? "Succès" : <strong className="font-semibold">{l.resultat === "alerte" ? "Alerte" : "Erreur"}{l.motifErreur ? ` : ${l.motifErreur}` : ""}</strong>}</td>
                <td className="py-2">{l.dureeMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function Actions({ p, page }: { p: Params; page: number }) {
  const j = await lireJournalActions(p, page);
  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="onglet" value="actions" />
        <Champ id="f-action" libelle="Type d’action">
          <select id="f-action" name="action" defaultValue={p.action ?? ""} className={classeChamp}>
            <option value="">Toutes</option>
            {Object.entries(FAMILLES_ACTIONS).map(([v, l]) => <option key={v} value={`${v}.`}>{l}</option>)}
          </select>
        </Champ>
        <Champ id="f-auteur" libelle="Auteur"><input id="f-auteur" name="auteur" defaultValue={p.auteur} className={classeChamp} /></Champ>
        <Champ id="f-du" libelle="Du"><input id="f-du" name="du" type="date" defaultValue={p.du} className={classeChamp} /></Champ>
        <Champ id="f-au" libelle="Au"><input id="f-au" name="au" type="date" defaultValue={p.au} className={classeChamp} /></Champ>
        <Champ id="f-q" libelle="Action ou objet"><input id="f-q" name="q" defaultValue={p.q} className={classeChamp} /></Champ>
        <button type="submit" className="ec-btn ec-btn--secondary">Filtrer</button>
      </form>
      <Pagination p={{ ...p, onglet: "actions" }} page={j.page} pages={j.pages} total={j.total} />
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Actions de l’équipe">
        <table className="w-full border-collapse text-left text-small">
          <caption className="sr-only">Actions de l’équipe, de la plus récente à la plus ancienne</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Date</th>
              <th scope="col" className="py-2 pr-3 font-medium">Auteur</th>
              <th scope="col" className="py-2 pr-3 font-medium">Action</th>
              <th scope="col" className="py-2 font-medium">Objet</th>
            </tr>
          </thead>
          <tbody>
            {j.lignes.map((l) => (
              <tr key={l.id} className="border-b border-line align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{date(l.date)}</td>
                <td className="py-2 pr-3 break-all">{l.auteur}</td>
                <td className="py-2 pr-3 break-all">{l.action}</td>
                <td className="py-2 break-all">{l.objet ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
