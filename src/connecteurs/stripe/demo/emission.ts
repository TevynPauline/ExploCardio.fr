import { randomUUID } from "node:crypto";
import { dbDemo } from "@/lib/db/demo";
import { envoyerTache } from "@/file-attente";
import { NotFound } from "../../erreurs";
import { PREFIXE_REFERENCE_FICTIVE } from "../../garde-donnees-fictives";
import type { EvenementPaiement, MoyenPaiement, TypeCarte, TypeEvenementPaiement } from "../interfaces";
import { signer } from "./signature";

// Émission des événements de paiement de démonstration (FR-028) : la page de paiement et
// l'écran de démonstration produisent les MÊMES événements que Stripe, envoyés au MÊME
// gestionnaire (/api/evenements/paiement), signés par la signature de démonstration.
// Options de test : confirmation répétée (même événement deux fois) et tardive (différée).

export const CHEMIN_GESTIONNAIRE = "/api/evenements/paiement";
export const ENTETE_SIGNATURE_DEMO = "x-demo-signature";
export const FILE_CONFIRMATIONS_TARDIVES = "paiement-demo-tardif";
export const DELAI_CONFIRMATION_TARDIVE_S = 20;

export type Issue = "accepte" | "refuse" | "authentification";

export function construireEvenement(
  type: TypeEvenementPaiement,
  champs: Partial<Omit<EvenementPaiement, "id" | "type" | "date">> & { montantTtc: number },
): EvenementPaiement {
  return {
    id: `${PREFIXE_REFERENCE_FICTIVE}evt-${randomUUID()}`,
    type,
    date: new Date(),
    sessionId: null,
    commandeRef: null,
    abonnementRef: null,
    paiementRef: null,
    moyen: null,
    carte: null,
    ...champs,
  };
}

export function serialiser(evt: EvenementPaiement): { contenu: string; signature: string } {
  const contenu = JSON.stringify(evt);
  return { contenu, signature: signer(contenu) };
}

/** Envoie l'événement signé au gestionnaire, comme le ferait Stripe. */
export async function envoyerAuGestionnaire(contenu: string, signature: string): Promise<number> {
  const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const r = await fetch(`${base}${CHEMIN_GESTIONNAIRE}`, {
    method: "POST",
    headers: { "content-type": "application/json", [ENTETE_SIGNATURE_DEMO]: signature },
    body: contenu,
  });
  return r.status;
}

export async function emettre(
  evt: EvenementPaiement,
  options: { repete?: boolean; tardif?: boolean } = {},
): Promise<void> {
  const { contenu, signature } = serialiser(evt);
  if (options.tardif) {
    await envoyerTache(FILE_CONFIRMATIONS_TARDIVES, { contenu, signature }, evt.id, {
      demarrerApresSecondes: DELAI_CONFIRMATION_TARDIVE_S,
    });
  } else {
    await envoyerAuGestionnaire(contenu, signature);
  }
  if (options.repete) await envoyerAuGestionnaire(contenu, signature);
}

/** Lecture d'une session pour la page de paiement de démonstration. */
export async function lireSession(id: string) {
  const s = await dbDemo().sessionPaiementDemo.findUnique({ where: { id } });
  if (!s) throw new NotFound("Session de paiement", id);
  return s;
}

/** Enregistre l'issue choisie sur la page de démonstration et émet l'événement correspondant. */
export async function choisirIssue(
  sessionId: string,
  choix: { issue: Issue; moyen: MoyenPaiement; carte: TypeCarte | null; repete: boolean; tardif: boolean },
): Promise<{ redirection: string; etat: string }> {
  const s = await lireSession(sessionId);
  const paiementRef = `${PREFIXE_REFERENCE_FICTIVE}pi-${randomUUID()}`;
  const commun = {
    sessionId: s.id,
    commandeRef: s.commandeRef,
    abonnementRef: s.abonnementRef,
    montantTtc: s.montantTtcCentimes,
    moyen: choix.moyen,
    carte: choix.moyen === "carte" ? choix.carte : null,
  };
  if (choix.issue === "authentification") {
    await dbDemo().sessionPaiementDemo.update({ where: { id: s.id }, data: { etat: "authentification" } });
    await emettre(construireEvenement("authentification_requise", commun), choix);
    return { redirection: `/demo/paiement?session=${encodeURIComponent(s.id)}&etape=authentification`, etat: "authentification" };
  }
  const reussi = choix.issue === "accepte";
  await dbDemo().sessionPaiementDemo.update({
    where: { id: s.id },
    data: { etat: reussi ? "payee" : "refusee", paiementRef: reussi ? paiementRef : null },
  });
  await emettre(
    construireEvenement(reussi ? "paiement_reussi" : "paiement_refuse", { ...commun, paiementRef: reussi ? paiementRef : null }),
    choix,
  );
  const cible = reussi ? s.urlRetour : s.urlAnnulation;
  const separateur = cible.includes("?") ? "&" : "?";
  return { redirection: `${cible}${separateur}paiement=${reussi ? "accepte" : "refuse"}`, etat: reussi ? "payee" : "refusee" };
}

/** Échéance mensuelle d'un abonnement, payée ou refusée (US7). */
export async function simulerEcheance(abonnementRef: string, montantTtc: number, payee: boolean) {
  await emettre(
    construireEvenement(payee ? "echeance_payee" : "echeance_refusee", {
      abonnementRef,
      montantTtc,
      moyen: "sepa",
      paiementRef: payee ? `${PREFIXE_REFERENCE_FICTIVE}pi-${randomUUID()}` : null,
    }),
  );
}

/** Remboursement d'un paiement accepté (US7). */
export async function simulerRemboursement(paiementRef: string, montantTtc: number, motif: string, rembourser: (cle: string) => Promise<unknown>) {
  const session = await dbDemo().sessionPaiementDemo.findFirst({ where: { paiementRef } });
  if (!session) throw new NotFound("Paiement", paiementRef);
  await rembourser(`remboursement:${paiementRef}:${montantTtc}:${motif}`);
  await emettre(
    construireEvenement("remboursement", {
      sessionId: session.id,
      commandeRef: session.commandeRef,
      paiementRef,
      montantTtc,
    }),
  );
}

export async function listerPaiementsAcceptes() {
  return dbDemo().sessionPaiementDemo.findMany({
    where: { etat: "payee", paiementRef: { not: null } },
    orderBy: { creeLe: "desc" },
    take: 20,
  });
}
