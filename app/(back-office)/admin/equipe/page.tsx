import type { Metadata } from "next";
import { listerEquipe, ROLES_EQUIPE_LIBELLES } from "@/domaine/equipe";
import type { RoleEquipe } from "@/lib/droits";
import { exigerDroit } from "@/lib/droits";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { actionDesactiver, actionInviter, actionReactiver, actionRenvoyer, actionRole } from "./actions";

export const metadata: Metadata = { title: "Équipe" };

const select = "min-h-11 rounded-sm border border-muted bg-surface px-2";
const date = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—");
const ROLES = Object.entries(ROLES_EQUIPE_LIBELLES) as [RoleEquipe, string][];

// Équipe du back-office (F13, US9, FR-023, D4) : inviter, changer de rôle, désactiver, réactiver.
export default async function Equipe({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { user } = await exigerDroit("equipe", "voir");
  const r = await searchParams;
  const membres = await listerEquipe();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Équipe</Kicker>
      <h1 className="text-h2 font-light">Équipe du back-office</h1>
      <p className="max-w-prose text-muted">
        Administrateur : toutes les fonctions. Commercial : clients, demandes, catalogue, contenus et offre de bienvenue. Support : consultation des
        clients et de leurs droits, ouverture et fermeture des accès Cloud. La double authentification est exigée pour tous.
      </p>
      <Retour {...r} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Inviter une personne</h2>
        <form action={actionInviter} className="grid gap-3 sm:grid-cols-3">
          <Champ id="equipe-nom" name="nom" libelle="Nom" required maxLength={80} />
          <Champ id="equipe-email" name="email" type="email" libelle="Email professionnel" required />
          <label className="flex flex-col gap-1 text-small font-medium text-ink">
            Rôle
            <select name="role" className={select} defaultValue="support">
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-3"><Button type="submit">Envoyer l’invitation</Button></div>
        </form>
      </Card>

      <Card>
        <h2 className="text-h3 font-semibold">Membres</h2>
        <ul className="mt-3 flex list-none flex-col gap-3 p-0">
          {membres.map((m) => (
            <li key={m.id} aria-label={`Membre ${m.email}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{m.name}{m.id === user.id ? " (vous)" : ""}</p>
                <p className="break-all text-small text-muted">{m.email}</p>
                <p className="text-small">
                  {m.desactiveLe ? `Désactivé le ${date(m.desactiveLe)}` : m.twoFactorEnabled ? "Actif, double authentification activée" : m.inviteLe ? `Invité le ${date(m.inviteLe)}, pas encore connecté` : "Actif"}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <form action={actionRole} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <label className="flex flex-col gap-1 text-small font-medium text-ink">
                    Rôle
                    <select name="role" className={select} defaultValue={m.role}>
                      {ROLES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" variante="secondaire">Changer<span className="sr-only"> le rôle de {m.email}</span></Button>
                </form>
                {!m.desactiveLe && !m.twoFactorEnabled ? (
                  <form action={actionRenvoyer}>
                    <input type="hidden" name="id" value={m.id} />
                    <Button type="submit" variante="secondaire">Renvoyer l’invitation<span className="sr-only"> à {m.email}</span></Button>
                  </form>
                ) : null}
                <form action={m.desactiveLe ? actionReactiver : actionDesactiver}>
                  <input type="hidden" name="id" value={m.id} />
                  <Button type="submit" variante="secondaire">{m.desactiveLe ? "Réactiver" : "Désactiver"}<span className="sr-only"> {m.email}</span></Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
