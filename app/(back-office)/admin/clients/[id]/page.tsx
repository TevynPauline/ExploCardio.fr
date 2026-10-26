import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { EtatAccesLogiciel } from "@generated/site/client";
import { ficheClient } from "@/domaine/clients";
import { paliersEnClair } from "@/domaine/fidelite/droits";
import { reglesEnVigueur } from "@/domaine/fidelite/equipe";
import { LIBELLES_LOCATION, LIBELLES_STATUT as LIBELLES_COMMANDE } from "@/domaine/commande/mon-compte";
import { exigerDroit, peut } from "@/lib/droits";
import { euros } from "@/lib/montants";
import { Button, Card, Kicker, Retour } from "@/ui";
import { LIBELLES_DECISION, LIBELLES_STATUT } from "@/ui/comptes/libelles";
import { decider } from "../../comptes/actions";
import { RappelPatient } from "@/ui/admin";

export const metadata: Metadata = { title: "Fiche client" };

const LIBELLES_NUMERO: Record<"a_verifier" | "verifie" | "refuse", string> = { a_verifier: "à vérifier", verifie: "vérifié", refuse: "refusé" };
const ETATS_ACCES: Record<EtatAccesLogiciel, string> = { en_ouverture: "En cours d’ouverture", actif: "Actif", grace: "Délai de grâce", suspendu: "Suspendu", ferme: "Fermé" };
const date = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—");
const zone = "rounded-sm border border-muted bg-surface p-2";

function Indisponible() {
  return <p role="status" className="text-small text-muted">Odoo est momentanément injoignable : ces informations ne peuvent pas être affichées.</p>;
}

// Fiche client (F13, US1, US5, D6) : identité, coordonnées, statut et décisions selon le rôle ;
// en lecture seule, droits d'assistance, locations, accès Cloud, commandes et factures (Odoo).
export default async function FicheClient({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { role } = await exigerDroit("clients", "voir");
  const { id } = await params;
  const r = await searchParams;
  const [f, regles] = await Promise.all([ficheClient(id), reglesEnVigueur()]);
  if (!f) notFound();
  const c = f.compte;
  const u = c.utilisateur;
  // Annuaire des entreprises : fiche de l'établissement (SIRET) ou de l'entreprise (SIREN).
  const annuaire = `https://annuaire-entreprises.data.gouv.fr/${(c.siret ?? "").length === 9 ? "entreprise" : "etablissement"}/${encodeURIComponent(c.siret ?? "")}`;
  const peutValider = peut(role, "comptes.valider", "modifier");
  const peutSuspendre = peut(role, "comptes.suspendre", "modifier");
  const indispo = (b: string) => f.indisponibles.includes(b);
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Kicker>Clients</Kicker>
      <h1 className="text-h2 font-light">{u.civilite ? `${u.civilite} ` : ""}{u.name}</h1>
      <p className="flex flex-wrap gap-2">
        <span className="ec-badge">{LIBELLES_STATUT[c.statut]}</span>
        {f.prioritaire ? <span className="ec-badge">Prioritaire : commande payée en attente de validation</span> : null}
      </p>
      <Retour {...r} />
      <RappelPatient />

      <Card>
        <h2 className="text-h3 font-semibold">Identité et coordonnées</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Email</dt><dd className="break-all">{u.email}</dd>
          <dt className="font-medium">Téléphone</dt><dd>{u.telephone ?? "—"}</dd>
          <dt className="font-medium">Spécialité</dt><dd>{u.specialite ?? "—"}</dd>
          <dt className="font-medium">SIRET ou SIREN</dt>
          <dd>
            {c.siret ?? "non renseigné"}
            {c.siret ? <> · {LIBELLES_NUMERO[c.numeroVerification ?? "a_verifier"]}{c.numeroVerifiePar ? ` (${c.numeroVerifiePar})` : ""}{" "}</> : " "}
            {c.siret ? (
              <a href={annuaire} target="_blank" rel="noopener noreferrer">
                Vérifier dans l’annuaire des entreprises<span className="sr-only"> (nouvel onglet)</span>
              </a>
            ) : null}
          </dd>
          {c.rpps ? (<><dt className="font-medium">RPPS (ancien)</dt><dd>{c.rpps}</dd></>) : null}
          {c.motifRefusNumero ? (<><dt className="font-medium">Motif du refus du numéro</dt><dd>{c.motifRefusNumero}</dd></>) : null}
          <dt className="font-medium">Cabinet</dt><dd>{c.nomCabinet ?? "—"}</dd>
          <dt className="font-medium">Inscription</dt><dd>{c.creeLe.toLocaleString("fr-FR")}</dd>
          {c.valideLe ? (<><dt className="font-medium">Validation</dt><dd>{c.valideLe.toLocaleString("fr-FR")}</dd></>) : null}
          {c.odooPartnerRef ? (<><dt className="font-medium">Fiche client Odoo</dt><dd>{c.odooPartnerRef}</dd></>) : null}
          {c.motifRefus ? (<><dt className="font-medium">Motif du refus</dt><dd>{c.motifRefus}</dd></>) : null}
        </dl>
        <h3 className="mt-4 font-semibold">Adresses</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {c.adresses.map((a) => (
            <li key={a.id} className="text-small">
              <span className="block font-medium capitalize">{a.type}</span>
              {a.ligne1}{a.ligne2 ? `, ${a.ligne2}` : ""}<br />{a.codePostal} {a.ville}
            </li>
          ))}
        </ul>
      </Card>

      {/* F16 (FR-026) : vérification du numéro d'entreprise, après coup. */}
      {c.siret && c.numeroVerification === "a_verifier" && peutValider ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 font-semibold">Numéro à vérifier</h2>
          <p className="text-small text-muted">Vérifiez que le numéro correspond à une entreprise en activité et à un professionnel de santé (cabinet, centre, établissement).</p>
          <form action={decider}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="numero_verifie" />
            <Button type="submit">Numéro vérifié</Button>
          </form>
          <form action={decider} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="numero_refuse" />
            <label htmlFor="motif-numero" className="text-small font-medium">Motif du refus (envoyé au client)</label>
            <textarea id="motif-numero" name="motif" rows={2} required className={zone} />
            <div><Button type="submit" variante="secondaire">Numéro refusé</Button></div>
          </form>
        </Card>
      ) : null}
      {c.statut === "en_attente" && peutValider ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 font-semibold">Décision</h2>
          <form action={decider}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="valider" />
            <Button type="submit">Valider le compte</Button>
          </form>
          <form action={decider} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="refuser" />
            <label htmlFor="motif-refus" className="text-small font-medium">Motif du refus</label>
            <textarea id="motif-refus" name="motif" rows={2} required className={zone} />
            <div><Button type="submit" variante="secondaire">Refuser le compte</Button></div>
          </form>
        </Card>
      ) : null}
      {c.statut === "valide" && peutSuspendre ? (
        <Card>
          <form action={decider} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="suspendre" />
            <label htmlFor="motif-suspension" className="text-small font-medium">Motif de la suspension</label>
            <textarea id="motif-suspension" name="motif" rows={2} required className={zone} />
            <div><Button type="submit" variante="secondaire">Suspendre le compte</Button></div>
          </form>
        </Card>
      ) : null}
      {c.statut === "suspendu" && peutSuspendre ? (
        <Card>
          <form action={decider}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="retablir" />
            <Button type="submit">Rétablir le compte</Button>
          </form>
        </Card>
      ) : null}

      {c.odooPartnerRef ? (
        <>
          <Card>
            <h2 className="text-h3 font-semibold">Droits d’assistance</h2>
            {indispo("droits") ? (
              <Indisponible />
            ) : f.droits?.statut === "actif" ? (
              <p className="mt-2"><strong>Droits actifs</strong> jusqu’au {date(f.droits.fin)} (commande {f.droits.origine}).</p>
            ) : (
              <p className="mt-2">
                <strong>Pas de droits actifs</strong>{f.droits?.fin ? ` — fin le ${date(f.droits.fin)}` : ""}. Assistance possible à l’acte (payante), ou à nouveau gratuite après une commande de consommables.
              </p>
            )}
            {/* F06 (SC-007) : ajustements manuels faits dans Odoo, avec leur motif. */}
            {f.droits?.historique.filter((e) => e.type === "ajustement").map((e, i) => (
              <p key={i} className="mt-1 text-small">Ajustement du {date(e.date)} : jusqu’au {date(e.fin)}{e.motif ? ` — ${e.motif}` : ""}</p>
            ))}
            {f.interventions?.length ? (
              <p className="mt-1 text-small">
                Interventions payées : {f.interventions.filter((i) => i.etat === "disponible").length} disponible(s), {f.interventions.filter((i) => i.etat === "consommee").length} réalisée(s).
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold">Locations en cours</h2>
            {indispo("locations") ? (
              <Indisponible />
            ) : f.locations?.length ? (
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {f.locations.map((l) => (
                  <li key={l.ref}>{l.libelle} — {LIBELLES_LOCATION[l.etat]} · depuis le {date(l.debut)} · {euros(l.montantMensuelHt)} HT par mois{l.impaye ? " · impayé" : ""}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Aucune location en cours.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold">Commandes récentes</h2>
            {indispo("commandes") ? (
              <Indisponible />
            ) : f.commandes?.length ? (
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {f.commandes.map((o) => (
                  <li key={o.ref}>
                    {o.ref} du {date(o.date)} — {LIBELLES_COMMANDE[o.statut]} · {euros(o.montantTtc)} TTC
                    {o.suivi ? ` · suivi ${o.transporteur ?? ""} ${o.suivi}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Aucune commande.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-h3 font-semibold">Factures</h2>
            {indispo("factures") ? (
              <Indisponible />
            ) : f.factures?.length ? (
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {f.factures.map((x) => (
                  <li key={x.numero}>
                    {x.type === "avoir" ? "Avoir" : "Facture"} {x.numero} du {date(x.date)} — {euros(x.montantTtc)} TTC · {x.etatPaiement === "paye" ? "payée" : x.etatPaiement === "rembourse" ? "remboursée" : "en attente"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Aucune facture.</p>
            )}
            <p className="mt-2 text-small text-muted">Détail complet (bons d’achat, historique) : dans Odoo.</p>
          </Card>
        </>
      ) : (
        <Card><p className="text-muted">Pas encore de fiche client dans Odoo : elle est créée à la validation du compte.</p></Card>
      )}

      <Card>
        <h2 className="text-h3 font-semibold">Accès aux logiciels Cloud</h2>
        {f.acces.length ? (
          <ul className="mt-2 flex list-none flex-col gap-1 p-0">
            {f.acces.map((a) => (
              <li key={a.id}>{a.libelle} — {ETATS_ACCES[a.etat]}{a.finPrevue ? ` · jusqu’au ${date(a.finPrevue)}` : ""}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted">Aucun accès.</p>
        )}
        {peut(role, "cloud.agir", "modifier") ? <p className="mt-2"><Link href={`/admin/logiciels-cloud?q=${encodeURIComponent(u.email)}`}>Gérer les accès Cloud</Link></p> : null}
      </Card>

      {regles ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Règles en vigueur</h2>
          <p className="text-small text-muted">Elles se règlent dans Odoo.</p>
          <ul className="list-disc pl-6">
            <li>Bons d’achat : {paliersEnClair(regles).join(" ; ")} — valables {regles.validiteMois} mois.</li>
            <li>
              Droits d’assistance : commande d’au moins {euros(regles.seuilDroitsHt)} HT de consommables ou d’accessoires → {regles.dureeDroitsJours} jours (
              {regles.prolongation === "cumul" ? "cumulés" : "remis à zéro"}, plafond {regles.plafondDroitsJours} jours).
            </li>
            <li>Assistance à l’acte : {euros(regles.prixAssistanceActeHt)} HT l’intervention.</li>
          </ul>
        </Card>
      ) : null}

      {c.decisions.length ? (
        <Card>
          <h2 className="text-h3 font-semibold">Historique des décisions</h2>
          <ul className="mt-2 flex flex-col gap-1 text-small">
            {c.decisions.map((d) => (
              <li key={d.id}>
                {d.date.toLocaleString("fr-FR")} — {LIBELLES_DECISION[d.decision]}
                {d.auteurId ? "" : " (automatique)"}
                {d.motif ? ` : ${d.motif}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <p><Link href="/admin/clients">Retour à la liste</Link></p>
    </div>
  );
}
