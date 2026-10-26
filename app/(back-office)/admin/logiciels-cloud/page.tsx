import type { Metadata } from "next";
import { registre } from "@/connecteurs/registre";
import { journalDesAcces, rechercherClientsCloud, tachesAFaire } from "@/domaine/cloud/equipe";
import { sousModePlateformeDemo } from "@/connecteurs/demonstration";
import { modeDuConnecteur, sousModePcaReel } from "@/lib/config";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import type { EtatAccesLogiciel } from "@generated/site/client";
import { actionConfirmerTache, actionFermer, actionOuvrir, actionRetablir, actionSuspendre } from "./actions";

export const metadata: Metadata = { title: "Logiciels Cloud" };

const ETATS: Record<EtatAccesLogiciel, string> = { en_ouverture: "En cours d’ouverture", actif: "Actif", grace: "Délai de grâce", suspendu: "Suspendu", ferme: "Fermé" };
const ORIGINES = { periode_incluse: "période incluse à l’achat", location: "location", abonnement: "abonnement", manuel: "ouverture manuelle" } as const;
const date = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—");
const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";

async function logiciels() {
  try {
    return (await registre.odoo().catalogue.listerReferences()).filter((r) => r.type === "logiciel");
  } catch {
    return [];
  }
}

// Logiciels Cloud (F12, US4, US5) : tâches de l'équipe quand la plateforme n'est pas automatisée,
// accès d'un client, actions avec motif (ouvrir, suspendre, rétablir, fermer), journal.
export default async function LogicielsCloud({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string; erreur?: string }> }) {
  const { q = "", ok, erreur } = await searchParams;
  const [taches, clients, references] = await Promise.all([tachesAFaire(), rechercherClientsCloud(q), logiciels()]);
  const journal = await journalDesAcces(clients.flatMap((c) => c.accesLogiciels.map((a) => a.id)));
  const sousMode = modeDuConnecteur("pca") === "demo" ? await sousModePlateformeDemo() : sousModePcaReel();
  const motif = (id: string) => <Champ id={`motif-${id}`} name="motif" libelle="Motif (obligatoire)" required minLength={3} />;
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Logiciels Cloud</Kicker>
      <h1 className="text-h2 font-light">Accès à la plateforme Cloud</h1>
      <p className="text-muted">
        Plateforme {sousMode === "manual" ? "non automatisée : chaque ouverture et fermeture est une tâche à réaliser sur la plateforme, puis à confirmer ici" : "automatisée : les accès s’ouvrent et se ferment sans intervention"}.
      </p>
      <Retour ok={ok} erreur={erreur} />

      <section aria-labelledby="taches" className="flex flex-col gap-3">
        <h2 id="taches" className="text-h3 font-semibold">Tâches à faire ({taches.length})</h2>
        {!taches.length ? <p className="text-muted">Aucune tâche en attente.</p> : null}
        <ul className="flex list-none flex-col gap-3 p-0">
          {taches.map((t) => {
            const c = t.acces.compte;
            return (
              <li key={t.id} aria-label={`Tâche ${t.action} ${t.acces.libelle} ${c.utilisateur.email}`} className="ec-card flex flex-col gap-2">
                <p className="font-semibold">
                  {t.action === "ouvrir" ? "Ouvrir" : t.action === "fermer" ? "Fermer" : t.action === "suspendre" ? "Suspendre" : "Rétablir"} l’accès à {t.acces.libelle} — avant le {date(t.echeance)}
                  {t.echeance < new Date() ? " (en retard)" : ""}
                </p>
                <p className="text-small break-all">
                  {c.utilisateur.name} · {c.nomCabinet ?? "cabinet non renseigné"} · {c.utilisateur.email}
                  {c.rpps ? ` · RPPS ${c.rpps}` : ""}
                  {c.siret ? ` · SIRET ${c.siret}` : ""}
                </p>
                <form action={actionConfirmerTache}>
                  <input type="hidden" name="tache" value={t.id} />
                  <input type="hidden" name="q" value={q} />
                  <Button type="submit" variante="secondaire">Confirmer la tâche réalisée</Button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <form role="search" className="flex max-w-2xl flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Champ id="recherche" name="q" libelle="Nom, cabinet, email, SIRET ou SIREN" defaultValue={q} autoComplete="off" />
        </div>
        <Button type="submit">Rechercher</Button>
      </form>
      {q.trim().length >= 2 && !clients.length ? <p role="status">Aucun client ne correspond à « {q} ».</p> : null}

      {clients.map((c) => (
        <section key={c.id} aria-label={`Client ${c.utilisateur.email}`} className="ec-card flex flex-col gap-4">
          <h2 className="text-h3 font-semibold">
            {c.utilisateur.name}
            {c.nomCabinet ? ` · ${c.nomCabinet}` : ""}
          </h2>
          <p className="text-small text-muted break-all">{c.utilisateur.email}</p>
          {!c.accesLogiciels.length ? <p>Aucun accès Cloud.</p> : null}
          <ul className="flex list-none flex-col gap-3 p-0">
            {c.accesLogiciels.map((a) => (
              <li key={a.id} aria-label={`Accès ${a.libelle}`} className="flex flex-col gap-2 border-t border-line pt-3">
                <p>
                  <strong>{a.libelle}</strong> — {ETATS[a.etat]} · {ORIGINES[a.origine]}
                  {a.sourceRef && !a.sourceRef.startsWith("manuel:") ? ` (${a.sourceRef})` : ""} · depuis le {date(a.debut)}
                  {a.finPrevue ? ` · fin le ${date(a.finPrevue)}` : ""}
                  {a.finGrace ? ` · fermeture le ${date(a.finGrace)}` : ""}
                </p>
                {a.etat !== "ferme" ? (
                  <div className="flex flex-wrap items-end gap-3">
                    {a.etat === "suspendu" ? (
                      <form action={actionRetablir} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="acces" value={a.id} />
                        <input type="hidden" name="q" value={q} />
                        {motif(`retablir-${a.id}`)}
                        <Button type="submit" variante="secondaire">Rétablir</Button>
                      </form>
                    ) : (
                      <form action={actionSuspendre} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="acces" value={a.id} />
                        <input type="hidden" name="q" value={q} />
                        {motif(`suspendre-${a.id}`)}
                        <Button type="submit" variante="secondaire">Suspendre</Button>
                      </form>
                    )}
                    <form action={actionFermer} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="acces" value={a.id} />
                      <input type="hidden" name="q" value={q} />
                      {motif(`fermer-${a.id}`)}
                      <Button type="submit" variante="secondaire">Fermer l’accès</Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <form action={actionOuvrir} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="compte" value={c.id} />
            <input type="hidden" name="q" value={q} />
            <label className="flex flex-col gap-1 text-small font-medium">
              Logiciel
              <select name="logiciel" className={select}>
                {references.map((r) => (
                  <option key={r.defaultCode} value={r.defaultCode}>{r.nom}</option>
                ))}
              </select>
            </label>
            {motif(`ouvrir-${c.id}`)}
            <Button type="submit" variante="secondaire">Ouvrir un accès</Button>
          </form>
        </section>
      ))}

      {journal.length ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Journal des accès</h2>
          <ul className="flex list-none flex-col gap-1 p-0 text-small">
            {journal.map((j) => (
              <li key={j.id}>
                {j.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} — {j.action.replace("cloud.", "")} — {j.auteur}
                {(j.detail as { motif?: string } | null)?.motif ? ` — ${(j.detail as { motif: string }).motif}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
