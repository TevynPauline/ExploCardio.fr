import type { PrismaClient } from "@generated/demo/client";
import { creerCommande } from "@/connecteurs/odoo/demo/commandes";
import { fideliteDemo, PALIERS_PAR_DEFAUT } from "@/connecteurs/odoo/demo/fidelite";
import type { NouvelleCommande } from "@/connecteurs/odoo/interfaces";

// Historiques et cas utiles (T043, FR-014, FR-015) : commandes, factures, locations, bons
// d'achat, droits d'assistance, accès Cloud, opportunités, listes de prix et promotions.
// Les commandes passent par le connecteur de démonstration lui-même : elles suivent donc les
// mêmes règles (prix, TVA, factures FICTIVES, bons d'achat) que pendant une séance.

type Partenaires = Map<string, { id: number; ref: string }>;

const ilYa = (jours: number) => new Date(Date.now() - jours * 86_400_000);
const dans = (jours: number) => new Date(Date.now() + jours * 86_400_000);

/** Règles commerciales de démonstration (valeurs inventées, sauf les paliers de F06). */
export const REGLES_DEMO = {
  validiteBonsMois: 12,
  seuilDroitsCentimes: 30_000, // 300 € HT de consommables par commande
  dureeDroitsJours: 90,
  plafondDroitsJours: 365,
  prixAssistanceActeCentimes: 15_000,
};

export async function remplirRegles(db: PrismaClient) {
  await db.programmeFidelite.create({
    data: { paliers: PALIERS_PAR_DEFAUT, validiteMois: REGLES_DEMO.validiteBonsMois },
  });
  await db.regleAssistance.create({
    data: {
      seuilCentimes: REGLES_DEMO.seuilDroitsCentimes,
      dureeJours: REGLES_DEMO.dureeDroitsJours,
      prolongation: "cumul",
      plafondJours: REGLES_DEMO.plafondDroitsJours,
      prixActeCentimes: REGLES_DEMO.prixAssistanceActeCentimes,
    },
  });
}

function livraison(fraisPortHt = 1500): NouvelleCommande["livraison"] {
  return { adresse: "Adresse du cabinet (fictive)", codePostal: "00000", ville: "Démonstration", fraisPortHt };
}

export async function remplirHistoriques(db: PrismaClient, p: Partenaires) {
  const ref = (cle: string) => p.get(cle)!.ref;
  const commandes: { cle: string; partenaire: string; jours: number; lignes: NouvelleCommande["lignes"]; mode?: NouvelleCommande["paiement"]["mode"] }[] = [
    // Client aux droits actifs (Dr Valdrin) : consommables récents au-delà du seuil
    { cle: "seed-valdrin-1", partenaire: "valdrin", jours: 200, lignes: [{ defaultCode: "EC-DMS-3004L", quantite: 1 }] },
    { cle: "seed-valdrin-2", partenaire: "valdrin", jours: 20, lignes: [
      { defaultCode: "EC-ELEC-HOLTER-50", quantite: 20 },
      { defaultCode: "EC-SUN-ORBIT-M", quantite: 10 },
      { defaultCode: "EC-DMS-CABLE-5B", quantite: 5 },
    ] },
    // Client sans droits (Dr Loubrac) : achats anciens, droits expirés
    { cle: "seed-loubrac-1", partenaire: "loubrac", jours: 400, lignes: [{ defaultCode: "EC-SUN-OSCAR2", quantite: 1 }] },
    { cle: "seed-loubrac-2", partenaire: "loubrac", jours: 220, lignes: [{ defaultCode: "EC-SUN-ORBIT-L", quantite: 6 }] },
    // Bénéficiaire de l'offre de bienvenue (Dr Castagnier) : tensiomètre offert à la 1re commande
    { cle: "seed-castagnier-1", partenaire: "castagnier", jours: 5, lignes: [
      { defaultCode: "EC-ELEC-HOLTER-50", quantite: 4 },
      { defaultCode: "EC-BIENVENUE-TENSIOMETRE", quantite: 1, offerte: true },
    ] },
    // Autres historiques
    { cle: "seed-parc-1", partenaire: "parc", jours: 90, lignes: [{ defaultCode: "EC-DMS-STRESS-BT", quantite: 1 }], mode: "financement" },
    { cle: "seed-morvelle-1", partenaire: "morvelle", jours: 60, lignes: [{ defaultCode: "EC-ELEC-HOLTER-500", quantite: 2 }, { defaultCode: "EC-DMS-SD-8GO", quantite: 4 }] },
    { cle: "seed-perignac-1", partenaire: "perignac", jours: 35, lignes: [{ defaultCode: "EC-DMS-REPOS-USB", quantite: 1 }, { defaultCode: "EC-DMS-POIRES-PINCES", quantite: 2 }] },
    { cle: "seed-delvaux-1", partenaire: "delvaux", jours: 120, lignes: [{ defaultCode: "EC-SUN-ORBIT-S", quantite: 4 }, { defaultCode: "EC-SUN-ORBIT-M", quantite: 6 }] },
    { cle: "seed-brissac-1", partenaire: "brissac", jours: 15, lignes: [{ defaultCode: "EC-DMS-CABLE-3B", quantite: 2 }] },
    { cle: "seed-tessier-1", partenaire: "tessier", jours: 300, lignes: [{ defaultCode: "EC-DMS-ABP-KIT", quantite: 1 }] },
    { cle: "seed-lavandes-1", partenaire: "lavandes", jours: 45, lignes: [{ defaultCode: "EC-KOCH-PURE", quantite: 1 }, { defaultCode: "EC-ENV-CHARIOT", quantite: 1 }] },
    { cle: "seed-lavandes-2", partenaire: "lavandes", jours: 10, lignes: [{ defaultCode: "EC-ELEC-HOLTER-500", quantite: 3 }, { defaultCode: "EC-DMS-CABLE-EFFORT-PINCES", quantite: 2 }] },
    { cle: "seed-orvault-1", partenaire: "orvault", jours: 75, lignes: [{ defaultCode: "EC-SUN-POCHETTE-OSC2", quantite: 2 }, { defaultCode: "EC-SUN-CEINTURE-OSC2", quantite: 2 }] },
    { cle: "seed-fontaines-1", partenaire: "fontaines", jours: 25, lignes: [{ defaultCode: "EC-DMS-3002W-CLOUD", quantite: 1 }, { defaultCode: "EC-DMS-BATTERIE-2W", quantite: 2 }] },
    { cle: "seed-verdier-1", partenaire: "verdier", jours: 8, lignes: [{ defaultCode: "EC-ELEC-HOLTER-50", quantite: 10 }, { defaultCode: "EC-KIT-HOLTER-MAD", quantite: 1 }] },
  ];

  const refsCommandes: string[] = [];
  for (const c of commandes) {
    const { ref: refCommande } = await db.$transaction((tx) =>
      creerCommande(
        tx,
        {
          partenaireRef: ref(c.partenaire),
          lignes: c.lignes,
          livraison: livraison(),
          paiement: { mode: c.mode ?? "carte", reference: `FICT-PAY-${c.cle}` },
        },
        c.cle,
        ilYa(c.jours),
      ),
    );
    await db.commandeVente.update({
      where: { ref: refCommande },
      data: { statut: c.jours > 7 ? "livree" : "expediee", suivi: `FICT-COLIS-${c.cle.toUpperCase()}` },
    });
    refsCommandes.push(refCommande);
  }
  // Bons d'achat et droits d'assistance selon les règles de F06
  for (const r of refsCommandes) await fideliteDemo.appliquerRegles(r);

  // Locations et abonnements : chaque appareil « loué » du parc a son abonnement
  const variante = async (code: string) => db.variante.findUniqueOrThrow({ where: { defaultCode: code }, include: { offreMad: true } });
  const serie = async (numero: string) => db.numeroSerie.findUniqueOrThrow({ where: { numero } });
  const locations: { partenaire: string; code: string; numero: string; debut: number; etat?: "en_cours" | "terminee" | "en_retard_retour" | "resiliation_prevue"; finIlYa?: number }[] = [
    { partenaire: "valdrin", code: "EC-DMS-3004L-CLOUD", numero: "FICT-SN-3004L-002", debut: 95 }, // location en cours
    { partenaire: "parc", code: "EC-SUN-OSCAR2", numero: "FICT-SN-OSC2-003", debut: 70, etat: "en_retard_retour", finIlYa: 10 }, // retard de retour
    { partenaire: "morvelle", code: "EC-DMS-3002E-CLOUD", numero: "FICT-SN-3002E-002", debut: 40, etat: "resiliation_prevue" }, // résiliation programmée
    { partenaire: "perignac", code: "EC-DMS-3003A-CLOUD", numero: "FICT-SN-3003A-001", debut: 150 },
    { partenaire: "delvaux", code: "EC-DMS-3004L-CLOUD", numero: "FICT-SN-3004L-003", debut: 18 },
    { partenaire: "brissac", code: "EC-DMS-ABP-KIT", numero: "FICT-SN-ABP-002", debut: 55 },
    { partenaire: "tessier", code: "EC-DMS-3003A-CLOUD", numero: "FICT-SN-3003A-002", debut: 200, etat: "terminee", finIlYa: 3 },
  ];
  let n = 0;
  for (const l of locations) {
    n++;
    const v = await variante(l.code);
    const s = await serie(l.numero);
    const debut = ilYa(l.debut);
    const prochaine = new Date(debut);
    while (prochaine < new Date()) prochaine.setMonth(prochaine.getMonth() + 1);
    await db.abonnement.create({
      data: {
        ref: `FICT-SUB-${String(n).padStart(5, "0")}`,
        partenaireId: p.get(l.partenaire)!.id,
        objet: "mise_a_disposition",
        varianteId: v.id,
        numeroSerieId: s.id,
        montantMensuelCentimes: v.offreMad!.moisSuivantsCentimes,
        debut,
        fin: l.finIlYa !== undefined ? ilYa(l.finIlYa) : l.etat === "resiliation_prevue" ? prochaine : null,
        prochaineEcheance: !l.etat || l.etat === "resiliation_prevue" ? prochaine : null,
        dateLivraison: debut,
        expedieLe: debut,
        transporteur: "Colissimo",
        suivi: `FICT-COLIS-${String(n).padStart(4, "0")}`,
        dateLimiteRetour: l.finIlYa !== undefined ? ilYa(l.finIlYa - 7) : null,
        etatRetour: l.etat === "terminee" ? "complet" : null,
        etat: l.etat ?? "en_cours",
      },
    });
  }
  // Abonnement logiciel Cloud (Dr Valdrin) et son accès Cloud
  const logiciel = await variante("EC-DMS-CS-HOLTER-CLOUD");
  n++;
  await db.abonnement.create({
    data: {
      ref: `FICT-SUB-${String(n).padStart(5, "0")}`,
      partenaireId: p.get("valdrin")!.id,
      objet: "logiciel",
      varianteId: logiciel.id,
      montantMensuelCentimes: logiciel.prixHtCentimes,
      debut: ilYa(95),
      prochaineEcheance: dans(5),
    },
  });
  await db.sequence.upsert({ where: { code: "SUB" }, create: { code: "SUB", valeur: n }, update: { valeur: n } });

  const acces: { partenaire: string; logiciel: string; etat: "actif" | "grace" | "ferme" | "a_ouvrir"; debut: number; fin?: number }[] = [
    { partenaire: "valdrin", logiciel: "EC-DMS-CS-HOLTER-CLOUD", etat: "actif", debut: 95 },
    { partenaire: "morvelle", logiciel: "EC-DMS-CS-HOLTER-CLOUD", etat: "actif", debut: 40 },
    { partenaire: "tessier", logiciel: "EC-DMS-CS-HOLTER-CLOUD", etat: "grace", debut: 200, fin: -3 },
    { partenaire: "orvault", logiciel: "EC-DMS-CARDIOVISION-CLOUD", etat: "ferme", debut: 300, fin: -60 },
    { partenaire: "delvaux", logiciel: "EC-DMS-CS-HOLTER-CLOUD", etat: "a_ouvrir", debut: 0 },
  ];
  let a = 0;
  for (const x of acces) {
    a++;
    // F12 : un seul compte par médecin sur la plateforme simulée (FR-003).
    const partenaire = await db.partenaire.findUniqueOrThrow({ where: { id: p.get(x.partenaire)!.id } });
    const compte = await db.compteCloud.upsert({
      where: { partenaireId: partenaire.id },
      create: { ref: `FICT-PCA-C-${String(partenaire.id).padStart(5, "0")}`, partenaireId: partenaire.id, email: partenaire.email ?? "", cabinet: null },
      update: {},
    });
    await db.accesCloud.create({
      data: {
        ref: `FICT-PCA-${String(a).padStart(5, "0")}`,
        compteId: compte.id,
        partenaireId: p.get(x.partenaire)!.id,
        logiciel: x.logiciel,
        etat: x.etat,
        debut: ilYa(x.debut),
        finPrevue: x.fin !== undefined ? dans(x.fin) : null,
      },
    });
  }

  // Liste de prix publique (F03) : prix dégressifs et mensualités de financement forcées pour tous
  await db.listePrix.create({
    data: {
      nom: "Liste de prix publique",
      regles: [
        { defaultCode: "EC-ELEC-HOLTER-50", quantiteMin: 5, prixHtCentimes: 1650 },
        { defaultCode: "EC-ELEC-HOLTER-50", quantiteMin: 10, prixHtCentimes: 1500 },
        { defaultCode: "EC-SUN-ORBIT-M", quantiteMin: 3, prixHtCentimes: 5500 },
        { defaultCode: "EC-SUN-ORBIT-L", quantiteMin: 3, prixHtCentimes: 5900 },
        { defaultCode: "EC-SUN-OSCAR2", dureeMois: 36, mensualiteCentimes: 5500 },
      ],
    },
  });

  // Listes de prix : remise client et mensualité de financement forcée (F03)
  await db.listePrix.create({
    data: {
      nom: "Remise consommables — Centre des Lavandes",
      partenaireId: p.get("lavandes")!.id,
      regles: [{ defaultCode: "EC-ELEC-HOLTER-500", remisePourcent: 10 }],
    },
  });
  await db.listePrix.create({
    data: {
      nom: "Mensualité négociée — Dr Delvaux-Arnoux",
      partenaireId: p.get("delvaux")!.id,
      regles: [{ defaultCode: "EC-DMS-3004L-CLOUD", dureeMois: 48, mensualiteCentimes: 7900 }],
    },
  });

  // Promotions : code promo et vente flash (F06)
  await db.promotion.create({
    data: { code: "DEMO10", nom: "Code promo de démonstration (−10 %)", type: "code_promo", remisePourcent: 10, debut: ilYa(30), fin: dans(60) },
  });
  await db.promotion.create({
    data: {
      nom: "Vente flash brassards Orbit (−15 %)",
      type: "vente_flash",
      cible: { defaultCodes: ["EC-SUN-ORBIT-S", "EC-SUN-ORBIT-M", "EC-SUN-ORBIT-L", "EC-SUN-ORBIT-XL"] },
      remisePourcent: 15,
      debut: ilYa(1),
      fin: dans(6),
    },
  });

  // F06 : remise automatique en cours et code promo « à annoncer » (D6).
  await db.promotion.create({
    data: { nom: "Pochettes DMS : −10 %", type: "remise_automatique", cible: { defaultCodes: ["EC-DMS-POCHETTE-4L"] }, remisePourcent: 10, debut: ilYa(3), fin: dans(20) },
  });
  await db.promotion.create({
    data: {
      code: "FIDELITE5",
      nom: "Code FIDELITE5 : −5 % sur votre commande",
      type: "code_promo",
      remisePourcent: 5,
      debut: ilYa(2),
      fin: dans(30),
      annoncee: true,
      limites: { parClient: 1, montantMinimumCentimes: 10_000 },
    },
  });

  // Programme « cadeau de bienvenue » (F02) : l'article offert est défini dans Odoo.
  await db.promotion.create({
    data: { nom: "Cadeau de bienvenue : tensiomètre électronique", type: "bienvenue", cible: { defaultCode: "EC-BIENVENUE-TENSIOMETRE" } },
  });

  // Opportunités : copies de demandes de financement et de devis
  await db.opportunite.create({
    data: {
      ref: "FICT-CRM-00001",
      cle: "seed-crm-1",
      type: "financement",
      partenaireId: p.get("loubrac")!.id,
      referenceDemande: "demande-financement-exemple",
      contenu: { equipements: ["EC-KOCH-ULTRA"], dureeMois: 60 },
    },
  });
  await db.opportunite.create({
    data: {
      ref: "FICT-CRM-00002",
      cle: "seed-crm-2",
      type: "devis",
      partenaireId: p.get("fontaines")!.id,
      referenceDemande: "demande-devis-exemple",
      contenu: { objet: "ECG de repos pour un second cabinet" },
    },
  });
  await db.sequence.upsert({ where: { code: "CRM" }, create: { code: "CRM", valeur: 2 }, update: { valeur: 2 } });

  return { commandes: refsCommandes.length, locations: locations.length + 1, acces: acces.length };
}
