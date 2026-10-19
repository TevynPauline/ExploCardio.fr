import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locationsDemo, pagePaiementDemoDisponible } from "@/connecteurs/demonstration";
import { euros } from "@/lib/montants";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { avancer, colisNonLivre, echouerPrelevement, enregistrerKit, enregistrerRetour, expedier, livrer, regulariser, signalerDefectueux } from "./actions";

export const metadata: Metadata = { title: "Locations de démonstration" };

const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";
const date = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—");

// Cycle des locations (F05) : ce que l'équipe fera dans Odoo (préparer et expédier, livrer,
// enregistrer un retour, un kit, un impayé) et les actions planifiées d'Odoo, simulées à une date.
export default async function Locations({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  if (!pagePaiementDemoDisponible()) notFound();
  const { ok, erreur } = await searchParams;
  const locations = await locationsDemo.lister();
  const disponibles = new Map<string, string[]>();
  for (const l of locations.filter((x) => x.etat === "commandee")) {
    const code = l.variante.defaultCode;
    if (!disponibles.has(code)) disponibles.set(code, (await locationsDemo.appareilsDisponibles(code)).map((a) => a.numero));
  }
  const aujourdhui = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Locations</h1>
      <p className="text-muted">Ce que l’équipe fera dans Odoo. Le site suit chaque changement aussitôt (en temps normal : toutes les 5 minutes).</p>
      <Retour ok={ok} erreur={erreur} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Avancer la date</h2>
        <p className="text-small text-muted">Exécute les actions planifiées d’Odoo à cette date : échéances prélevées, nouvelles tentatives, suspension, retards, facturations ; puis les rappels du site.</p>
        <form action={avancer} className="flex flex-wrap items-end gap-3">
          <div className="w-56"><Champ id="date-avance" name="date" type="date" libelle="Date simulée" defaultValue={aujourdhui} /></div>
          <Button type="submit" variante="secondaire">Exécuter les actions planifiées</Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Enregistrer un kit possédé</h2>
        <form action={enregistrerKit} className="flex flex-wrap items-end gap-3">
          <div className="w-56"><Champ id="kit-partenaire" name="partenaire" libelle="Client (référence Odoo)" placeholder="FICT-P-00001" /></div>
          <div className="w-56"><Champ id="kit-code" name="kit" libelle="Kit" defaultValue="EC-KIT-HOLTER-MAD" /></div>
          <Button type="submit" variante="secondaire">Enregistrer le kit</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-h3 font-semibold">Locations récentes</h2>
        {!locations.length ? <p className="mt-2 text-muted">Aucune location.</p> : null}
        <ul className="mt-3 flex list-none flex-col gap-4 p-0">
          {locations.map((l) => {
            const id = l.ref.replace(/[^A-Za-z0-9]/g, "");
            return (
              <li key={l.ref} className="flex flex-col gap-2 border-b border-line pb-4" aria-label={`Location ${l.ref}`}>
                <p>
                  <strong>{l.ref}</strong> · {l.partenaire.nom} ({l.partenaire.ref}) · {l.variante.modele.marque} {l.variante.modele.nom} · {euros(l.montantMensuelCentimes)} HT / mois ·
                  état : <strong>{l.etat}</strong>
                  {l.expeditionBloquee ? " · expédition bloquée (compte non validé)" : ""}
                  {l.impayeDepuis ? ` · impayé depuis le ${date(l.impayeDepuis)}` : ""}
                </p>
                <p className="text-small text-muted">
                  Livraison {date(l.dateLivraison)} · prochaine échéance {date(l.prochaineEcheance)} · fin {date(l.fin)} · retour avant {date(l.dateLimiteRetour)} · appareil{" "}
                  {l.numeroSerie?.numero ?? "—"}
                </p>
                {l.etat === "commandee" && !l.expedieLe ? (
                  <>
                    <form action={expedier} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="location" value={l.ref} />
                      <label className="flex flex-col gap-1 text-small font-medium">
                        Appareil ({l.ref})
                        <select name="appareil" className={select} defaultValue="">
                          <option value="">{l.numeroSerie ? `Réservé : ${l.numeroSerie.numero}` : "Premier disponible"}</option>
                          {(disponibles.get(l.variante.defaultCode) ?? []).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <Champ id={`transporteur-${id}`} name="transporteur" libelle={`Transporteur (${l.ref})`} defaultValue="Colissimo" />
                      <Champ id={`suivi-${id}`} name="suivi" libelle={`Numéro de suivi (${l.ref})`} defaultValue={`FICT-COLIS-${id.slice(-6)}`} />
                      <Button type="submit" variante="secondaire">Préparer et expédier</Button>
                    </form>
                    <form action={signalerDefectueux}>
                      <input type="hidden" name="location" value={l.ref} />
                      <Button type="submit" variante="secondaire">Appareil défectueux ({l.ref})</Button>
                    </form>
                  </>
                ) : null}
                {l.etat === "commandee" && l.expedieLe ? (
                  <div className="flex flex-wrap gap-2">
                    <form action={livrer}>
                      <input type="hidden" name="location" value={l.ref} />
                      <Button type="submit" variante="secondaire">Marquer livrée ({l.ref})</Button>
                    </form>
                    <form action={colisNonLivre}>
                      <input type="hidden" name="location" value={l.ref} />
                      <Button type="submit" variante="secondaire">Colis non livré ({l.ref})</Button>
                    </form>
                  </div>
                ) : null}
                {["en_cours", "resiliation_prevue"].includes(l.etat) && !l.impayeDepuis ? (
                  <form action={echouerPrelevement}>
                    <input type="hidden" name="location" value={l.ref} />
                    <Button type="submit" variante="secondaire">Prélèvement échoué ({l.ref})</Button>
                  </form>
                ) : null}
                {l.impayeDepuis ? (
                  <form action={regulariser}>
                    <input type="hidden" name="location" value={l.ref} />
                    <Button type="submit" variante="secondaire">Régulariser ({l.ref})</Button>
                  </form>
                ) : null}
                {["resiliation_prevue", "en_retard_retour", "suspendue_impaye", "en_cours"].includes(l.etat) ? (
                  <form action={enregistrerRetour} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="location" value={l.ref} />
                    <label className="flex flex-col gap-1 text-small font-medium">
                      État constaté ({l.ref})
                      <select name="etat" className={select} defaultValue="complet">
                        <option value="complet">Complet</option>
                        <option value="degrade">Dégradé</option>
                        <option value="perdu">Perdu (non rendu)</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-small font-medium">
                      Appareil remis ({l.ref})
                      <select name="appareil" className={select} defaultValue="disponible">
                        <option value="disponible">Disponible</option>
                        <option value="en_maintenance">En maintenance</option>
                      </select>
                    </label>
                    <Champ id={`degradation-${id}`} name="degradation" libelle={`Dégradation HT (${l.ref})`} inputMode="decimal" placeholder="0,00" />
                    <Button type="submit" variante="secondaire">Enregistrer le retour</Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
