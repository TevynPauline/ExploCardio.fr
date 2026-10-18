import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { creerRegistre } from "@/connecteurs/registre";
import { ajouterAuPanier } from "@/domaine/catalogue/panier";
import { dbSite } from "@/lib/db/site";
import type { EvenementPaiement, TypeEvenementPaiement } from "@/connecteurs/stripe/interfaces";

// Outils des tests de F04 : compte client validé avec sa fiche fictive, ses adresses et son panier.

export const comptesCrees: string[] = [];

export async function compteValide(options: { statut?: "valide" | "en_attente" | "suspendu"; adresse?: string } = {}) {
  const rpps = `99${String(randomInt(0, 1e9)).padStart(9, "0")}`;
  const id = `test-${randomBytes(6).toString("hex")}`;
  const email = `commande-${rpps}@demo.explocardio.test`;
  const u = await dbSite().utilisateur.create({ data: { id, name: "Dr Test Commande", email, emailVerified: true, role: "client" } });
  comptesCrees.push(u.id);
  const { ref } = await creerRegistre(process.env).odoo().clients.creerOuRetrouverPartenaire(
    { nom: "Dr Test Commande", email, rpps, adresses: [{ type: "facturation", ligne1: "1 rue du Test", codePostal: "69003", ville: "Lyon" }] },
    `test:${id}`,
  );
  const c = await dbSite().compteClient.create({
    data: {
      utilisateurId: u.id,
      type: "medecin",
      rpps,
      statut: options.statut ?? "valide",
      odooPartnerRef: ref,
      adresses: {
        create: [
          { type: "cabinet", ligne1: "1 rue du Test", codePostal: options.adresse ?? "69003", ville: "Lyon" },
        ],
      },
    },
  });
  return { compteId: c.id, email, partenaireRef: ref, utilisateurId: u.id };
}

export async function remplirPanier(compteId: string, lignes: { defaultCode: string; formule: "achat" | "mise_a_disposition"; quantite: number }[]) {
  for (const l of lignes) {
    const r = await ajouterAuPanier({ compteId }, l);
    if (!r.ok) throw new Error(`${l.defaultCode} : ${r.message}`);
  }
}

export function evenement(type: TypeEvenementPaiement, champs: Partial<EvenementPaiement>): EvenementPaiement {
  return {
    id: `evt-test-${randomUUID()}`,
    type,
    date: new Date(),
    sessionId: null,
    commandeRef: null,
    abonnementRef: null,
    paiementRef: `FICT-pi-${randomUUID()}`,
    montantTtc: 0,
    moyen: "carte",
    carte: "amex",
    ...champs,
  };
}

export async function nettoyer() {
  for (const id of comptesCrees.splice(0)) await dbSite().utilisateur.delete({ where: { id } }).catch(() => undefined);
}
