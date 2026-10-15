import type { Metadata } from "next";
import Link from "next/link";
import { dbSite } from "@/lib/db/site";
import { Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Boîte de démonstration" };

// Boîte de démonstration (T069, FR-029, SC-007) : tous les emails aux clients et toutes les
// notifications d'équipe qui auraient été envoyés, séparés et filtrables, avec leur rendu.
// Aucun n'a été réellement envoyé.

const TYPES = {
  email_client: "Email client",
  notification_equipe_email: "Notification d'équipe (email)",
  notification_equipe_sms: "Notification d'équipe (SMS)",
} as const;
type Type = keyof typeof TYPES;

type Filtres = { onglet?: string; destinataire?: string; type?: string; du?: string; au?: string; message?: string };

export default async function Boite({ searchParams }: { searchParams: Promise<Filtres> }) {
  const f = await searchParams;
  const onglet = f.onglet === "equipe" ? "equipe" : "clients";
  const types: Type[] =
    onglet === "clients" ? ["email_client"] : ["notification_equipe_email", "notification_equipe_sms"];
  const typeFiltre = f.type && (types as string[]).includes(f.type) ? [f.type as Type] : types;
  const messages = await dbSite().messageDemonstration.findMany({
    where: {
      type: { in: typeFiltre },
      ...(f.destinataire ? { destinataire: { contains: f.destinataire, mode: "insensitive" } } : {}),
      ...(f.du || f.au
        ? { date: { ...(f.du ? { gte: new Date(f.du) } : {}), ...(f.au ? { lte: new Date(`${f.au}T23:59:59`) } : {}) } }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 200,
  });
  const choisi = f.message ? await dbSite().messageDemonstration.findUnique({ where: { id: f.message } }) : null;
  const lien = (extra: Record<string, string>) => `?${new URLSearchParams({ ...f, onglet, ...extra } as Record<string, string>).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Boîte de démonstration</h1>
      <p className="text-muted">Messages qui auraient été envoyés. Aucun n’a quitté le site.</p>

      <nav aria-label="Catégories de messages">
        <ul className="flex gap-2">
          {[
            ["clients", "Emails aux clients"],
            ["equipe", "Notifications d'équipe"],
          ].map(([valeur, libelle]) => (
            <li key={valeur}>
              <Link
                href={`?onglet=${valeur}`}
                aria-current={onglet === valeur ? "page" : undefined}
                className={`ec-btn ${onglet === valeur ? "ec-btn--primary" : "ec-btn--secondary"}`}
              >
                {libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="onglet" value={onglet} />
        <label className="flex flex-col gap-1 text-small font-medium">
          Destinataire
          <input name="destinataire" defaultValue={f.destinataire ?? ""} className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal" />
        </label>
        {onglet === "equipe" ? (
          <label className="flex flex-col gap-1 text-small font-medium">
            Type
            <select name="type" defaultValue={f.type ?? ""} className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal">
              <option value="">Tous</option>
              <option value="notification_equipe_email">Email</option>
              <option value="notification_equipe_sms">SMS</option>
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-small font-medium">
          Du
          <input type="date" name="du" defaultValue={f.du ?? ""} className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-small font-medium">
          Au
          <input type="date" name="au" defaultValue={f.au ?? ""} className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal" />
        </label>
        <button type="submit" className="ec-btn ec-btn--secondary">Filtrer</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <h2 className="text-h3 font-semibold">{messages.length} message{messages.length > 1 ? "s" : ""}</h2>
          {messages.length === 0 ? (
            <p className="mt-2 text-muted">Aucun message pour ces critères.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-line">
              {messages.map((m) => (
                <li key={m.id}>
                  <Link href={lien({ message: m.id })} aria-current={choisi?.id === m.id ? "true" : undefined} className="block py-3 no-underline">
                    <span className="block font-medium text-ink">{m.objet}</span>
                    <span className="block text-small text-muted">
                      {TYPES[m.type]} · {m.destinataire} · {m.date.toLocaleString("fr-FR")}
                      {m.etatRemise === "rejete" ? " · rejeté (simulé)" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          {choisi ? (
            <article aria-labelledby="titre-message">
              <h2 id="titre-message" className="text-h3 font-semibold">{choisi.objet}</h2>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 text-small">
                <dt className="text-muted">Type</dt>
                <dd>{TYPES[choisi.type]}</dd>
                <dt className="text-muted">Destinataire</dt>
                <dd>{choisi.destinataire}</dd>
                <dt className="text-muted">Déclencheur</dt>
                <dd>{choisi.declencheur}</dd>
                <dt className="text-muted">Remise</dt>
                <dd>{choisi.etatRemise === "rejete" ? "rejetée (simulée)" : "remis (simulé)"}</dd>
              </dl>
              {choisi.type === "notification_equipe_sms" ? (
                <p className="mt-4 whitespace-pre-wrap rounded-sm bg-pale p-3">{choisi.rendu}</p>
              ) : (
                <iframe
                  title={`Rendu de l'email : ${choisi.objet}`}
                  srcDoc={choisi.rendu}
                  sandbox=""
                  className="mt-4 h-[640px] w-full rounded-sm border border-line bg-surface"
                />
              )}
            </article>
          ) : (
            <p className="text-muted">Choisissez un message pour afficher son rendu.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
