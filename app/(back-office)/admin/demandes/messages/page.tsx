import type { Metadata } from "next";
import { compterMessages, ETATS_MESSAGE, listerMessages, type EtatMessage } from "@/domaine/demandes/suivi";
import { peut } from "@/lib/droits";
import { exigerEquipe } from "@/lib/roles";
import { Kicker, Retour } from "@/ui";
import { actionSuivreMessage } from "../actions";
import { Onglets } from "../Onglets";
import { SuiviForm } from "../SuiviForm";
import { RappelPatient } from "@/ui/admin";

export const metadata: Metadata = { title: "Messages de contact" };

type Coordonnees = { nom: string; email: string; telephone: string | null; cabinet: string | null };

// Messages du formulaire de contact (F13, US6, FR-020) : nouveau → en cours → traité, note interne.
export default async function Messages({ searchParams }: { searchParams: Promise<{ etat?: string; ok?: string; erreur?: string }> }) {
  const { etat: brut, ...r } = await searchParams;
  const etat = brut === "tous" || (brut && brut in ETATS_MESSAGE) ? (brut as EtatMessage | "tous") : "nouveau";
  const { role } = await exigerEquipe();
  const [messages, comptes] = await Promise.all([listerMessages(etat), compterMessages()]);
  const retour = `/admin/demandes/messages?etat=${etat}`;
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Messages de contact</h1>
      <Onglets chemin="/admin/demandes/messages" actif={etat} etats={ETATS_MESSAGE} comptes={comptes} />
      <Retour {...r} />
      <RappelPatient />
      {!messages.length ? <p className="text-muted">Aucun message dans cette liste.</p> : null}
      <ul className="flex list-none flex-col gap-3 p-0">
        {messages.map((m) => {
          const c = m.coordonnees as Coordonnees;
          return (
            <li key={m.id} id={`demande-${m.id}`} aria-label={`Message de ${c.email}`} className="ec-card flex scroll-mt-24 flex-col gap-1">
              <p className="font-semibold">{m.motif}</p>
              <p className="text-small text-muted">
                {m.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · {ETATS_MESSAGE[m.etat]}
                {m.traitePar ? ` · suivi par ${m.traitePar}` : ""}
              </p>
              <p className="break-all">
                {c.nom} · <a href={`mailto:${c.email}`}>{c.email}</a>
                {c.telephone ? ` · ${c.telephone}` : ""}
                {c.cabinet ? ` · ${c.cabinet}` : ""}
              </p>
              <p className="whitespace-pre-line break-words">{m.texte}</p>
              <SuiviForm action={actionSuivreMessage} id={m.id} etat={m.etat} etats={ETATS_MESSAGE} notes={m.notes} modifieLe={m.modifieLe} retour={retour} modifiable={peut(role, "demandes", "modifier")} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
