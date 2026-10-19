import { afterAll, beforeAll, expect, it } from "vitest";
import { dbDemo } from "@/lib/db/demo";
import { cleDeTest, suiteDeContrat } from "../harness";
import { nouveauPartenaire, REF } from "./outils";

/** Démonstration seulement : rend au parc les appareils pris par les clients de test des contrats. */
async function rendreParcDesContrats() {
  const db = dbDemo();
  const locations = await db.abonnement.findMany({
    where: { partenaire: { email: { startsWith: "contrat-" } }, etat: { notIn: ["terminee", "annulee"] }, numeroSerieId: { not: null } },
  });
  await db.abonnement.updateMany({ where: { id: { in: locations.map((l) => l.id) } }, data: { etat: "terminee" } });
  await db.numeroSerie.updateMany({ where: { id: { in: locations.map((l) => l.numeroSerieId!) }, statut: "loue" }, data: { statut: "disponible" } });
  for (const r of await db.reservationAppareil.findMany({ where: { etat: "active", cle: { startsWith: "test-" } } })) {
    await db.reservationAppareil.update({ where: { id: r.id }, data: { etat: "liberee" } });
    await db.numeroSerie.updateMany({ where: { id: r.numeroSerieId, statut: "loue" }, data: { statut: r.statutAvant } });
  }
}

suiteDeContrat("odoo", "location et abonnements (contracts/odoo.md §6)", ({ registre, mode }) => {
  const location = () => registre.odoo().location;
  if (mode === "demo") {
    beforeAll(rendreParcDesContrats);
    afterAll(rendreParcDesContrats);
  }

  it("crée un abonnement logiciel une seule fois par clé, le résilie puis annule la résiliation", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const cle = cleDeTest("abonnement");
    const demande = { partenaireRef, objet: "logiciel" as const, defaultCode: REF.logiciel, debut: new Date() };
    const a = await location().creerAbonnement(demande, cle);
    const b = await location().creerAbonnement(demande, cle);
    expect(b.ref).toBe(a.ref);

    // Fin fixée par Odoo au terme du mois payé (F05) ; pas de retour d'appareil pour un logiciel.
    const r = await location().resilier(a.ref, new Date());
    expect(r.fin.getTime()).toBeGreaterThan(Date.now());
    expect(r.dateLimiteRetour).toBeNull();
    let liste = await location().listerLocations(partenaireRef);
    expect(liste.find((l) => l.ref === a.ref)?.etat).toBe("resiliation_prevue");

    expect(await location().annulerResiliation(a.ref)).toEqual({ fin: null });
    liste = await location().listerLocations(partenaireRef);
    expect(liste.find((l) => l.ref === a.ref)).toMatchObject({ etat: "en_cours", fin: null, objet: "logiciel" });
  });

  it("liste les locations d'un client avec numéros de série et échéances", async () => {
    const liste = await location().listerLocations(REF.partenaireDroitsActifs);
    const mad = liste.find((l) => l.objet === "mise_a_disposition");
    expect(mad?.numeroSerie).toBeTruthy();
    expect(mad?.prochaineEcheance).toBeInstanceOf(Date);
  });

  // ------------------------------------------------------------------ F05

  const MAD = "EC-DMS-ABP-KIT";
  const demain = () => new Date(Date.now() + 86_400_000);

  /** Réserve tous les appareils libres de MAD ; renvoie les clés (à libérer en fin de test). */
  async function reserverTout(): Promise<string[]> {
    const cles: string[] = [];
    for (let i = 0; i < 50; i++) {
      const cle = cleDeTest("parc");
      try {
        await registre.odoo().stock.reserverAppareil(MAD, demain(), cle);
        cles.push(cle);
      } catch (e) {
        expect(e).toMatchObject({ code: "OUT_OF_STOCK" });
        return cles;
      }
    }
    return cles;
  }

  it("réserve un appareil avant le paiement, de façon idempotente, puis le libère", async () => {
    const cle = cleDeTest("parc");
    const a = await registre.odoo().stock.reserverAppareil(MAD, demain(), cle);
    const b = await registre.odoo().stock.reserverAppareil(MAD, demain(), cle);
    expect(b.numeroSerie).toBe(a.numeroSerie);
    await registre.odoo().stock.libererAppareil(cle);
    await registre.odoo().stock.libererAppareil(cle);
  });

  it("dernier appareil : deux réservations simultanées, une seule réussit (SC-005)", async () => {
    const cles = await reserverTout();
    expect(cles.length).toBeGreaterThan(0);
    await registre.odoo().stock.libererAppareil(cles.pop()!);
    const course = [cleDeTest("course"), cleDeTest("course")];
    const resultats = await Promise.allSettled(course.map((c) => registre.odoo().stock.reserverAppareil(MAD, demain(), c)));
    cles.push(...course);
    expect(resultats.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultats.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "OUT_OF_STOCK" } });
    // Plus aucun appareil : la première date de livraison n'est pas demain.
    const { premiereDate } = await registre.odoo().stock.lireDisponibiliteParc(MAD, demain());
    expect(premiereDate.getTime()).toBeGreaterThan(demain().getTime());
    for (const cle of cles) await registre.odoo().stock.libererAppareil(cle);
  });

  it("location commandée à une date de livraison, réservation consommée, puis annulée avant expédition", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const reservationCle = cleDeTest("parc");
    await registre.odoo().stock.reserverAppareil(MAD, demain(), reservationCle);
    const { ref } = await location().creerAbonnement(
      { partenaireRef, objet: "mise_a_disposition", defaultCode: MAD, debut: new Date(), dateLivraison: demain(), reservationCle },
      cleDeTest("location"),
    );
    // La réservation est consommée : la libérer ne rend pas l'appareil.
    await registre.odoo().stock.libererAppareil(reservationCle);
    const [l] = await location().listerLocations(partenaireRef);
    expect(l).toMatchObject({ ref, etat: "commandee", numeroSerie: null, expeditionBloquee: false });
    expect(l!.dateLivraison).toBeInstanceOf(Date);
    expect(l!.prochaineEcheance!.getTime()).toBeGreaterThan(l!.dateLivraison!.getTime());
    await expect(location().resilier(ref, new Date())).rejects.toMatchObject({ code: "OPERATION_REFUSED" });

    await location().facturerEcheance({ abonnementRefs: [ref], montantTtc: 4_680, paiementRef: null, libelle: "Mise à disposition — premier mois", mois: "premier" }, cleDeTest("echeance"));
    const cle = cleDeTest("annulation");
    const annulation = await location().annulerCommande(ref, "Compte refusé", cle);
    expect(annulation.montantTtc).toBeGreaterThan(0);
    expect(annulation.avoir).toBeTruthy();
    expect(await location().annulerCommande(ref, "Compte refusé", cle)).toEqual(annulation);
    expect((await location().listerLocations(partenaireRef))[0]!.etat).toBe("annulee");
  });

  it("résiliation : fin au terme du mois payé, date limite de retour, étiquette, prolongation", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const { ref } = await location().creerAbonnement({ partenaireRef, objet: "mise_a_disposition", defaultCode: MAD, debut: new Date() }, cleDeTest("location"));
    await expect(location().etiquetteRetour(ref)).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    const depuis = new Date(Date.now() - 1000);
    const r = await location().resilier(ref, new Date());
    const [l] = await location().listerLocations(partenaireRef);
    expect(r.fin.getTime()).toBe(l!.prochaineEcheance!.getTime());
    expect(r.dateLimiteRetour!.getTime()).toBeGreaterThan(r.fin.getTime());
    expect(l!.etat).toBe("resiliation_prevue");
    expect((await location().listerChangements(depuis)).some((c) => c.ref === ref && c.partenaireRef === partenaireRef)).toBe(true);
    const pdf = await location().etiquetteRetour(ref);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    await location().annulerResiliation(ref);
    expect((await location().listerLocations(partenaireRef))[0]).toMatchObject({ etat: "en_cours", fin: null, dateLimiteRetour: null });
    await expect(location().annulerResiliation(ref)).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    // Le jour de l'échéance ou après : le mois entamé reste dû.
    const apres = new Date(l!.prochaineEcheance!.getTime() + 3_600_000);
    const tardive = await location().resilier(ref, apres);
    expect(tardive.fin.getTime()).toBeGreaterThan(l!.prochaineEcheance!.getTime());
  });

  it("kits possédés : aucun pour un nouveau client, le kit acheté et payé ensuite", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    expect(await location().kitsPossedes(partenaireRef)).toEqual([]);
    await registre.odoo().commandes.creerCommandePayee(
      {
        partenaireRef,
        lignes: [{ defaultCode: "EC-KIT-HOLTER-MAD", quantite: 1 }],
        livraison: { adresse: "1 rue du Test", codePostal: "75001", ville: "Paris", fraisPortHt: 0 },
        paiement: { mode: "carte", reference: cleDeTest("pi") },
      },
      cleDeTest("commande"),
    );
    expect(await location().kitsPossedes(partenaireRef)).toEqual(["EC-KIT-HOLTER-MAD"]);
  });

  it("lit les règles de location fixées dans Odoo", async () => {
    const regles = await location().lireRegles();
    expect(regles.delaiRetourJoursOuvres).toBeGreaterThan(0);
    expect(regles.delaiNonRetourJours).toBeGreaterThan(regles.toleranceRetardJours);
  });

  it("lève NotFound pour un abonnement inconnu", async () => {
    await expect(location().resilier("FICT-SUB-INCONNU", new Date())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
