import { afterAll, describe, expect, it } from "vitest";
import { construireEvenement } from "@/connecteurs/stripe/demo/emission";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbSite } from "@/lib/db/site";

// T010 (F24, FR-024) : une contestation alerte l'équipe et se journalise, une seule fois.

const ids: string[] = [];

afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { cle: { startsWith: "contestation:FICT-evt-" } } });
  await dbSite().journalAction.deleteMany({ where: { action: "paiement.contestation", objet: "FICT-SO-CONTESTE" } });
  await dbSite().evenementPaiementTraite.deleteMany({ where: { id: { in: ids } } });
});

describe("contestation d'un paiement", () => {
  it("alerte l'équipe avec le montant et les références, journalise, une seule fois", async () => {
    enregistrerEffetsCommande();
    const evt = construireEvenement("contestation", { montantTtc: 14_400, commandeRef: "FICT-SO-CONTESTE", paiementRef: "FICT-pi-conteste" });
    ids.push(evt.id);
    expect(await traiterEvenementPaiement(evt)).toEqual({ traite: true, deja: false });
    expect(await traiterEvenementPaiement(evt)).toEqual({ traite: false, deja: true });
    const alertes = await dbSite().envoi.findMany({ where: { cle: { startsWith: `contestation:${evt.id}` } } });
    expect(alertes).toHaveLength(1);
    expect(alertes[0]).toMatchObject({ famille: "equipe", objet: "Contestation d'un paiement" });
    expect(JSON.stringify(alertes[0]!.variables)).toContain("144,00 €");
    expect(await dbSite().journalAction.count({ where: { action: "paiement.contestation", objet: "FICT-SO-CONTESTE" } })).toBe(1);
  });
});
