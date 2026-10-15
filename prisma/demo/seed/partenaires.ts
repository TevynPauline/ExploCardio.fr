import type { PrismaClient } from "@generated/demo/client";

// Médecins et cabinets FICTIFS (T042, FR-014, FR-016). Les noms sont inventés ; les numéros
// RPPS commencent par 99 et les SIRET par 000999, plages qui ne correspondent à aucun
// professionnel réel. Les adresses email sont sur un domaine réservé aux tests (.test).

type Fiche = {
  cle: string;
  nom: string;
  rpps?: string;
  siret?: string;
  ville: string;
  codePostal: string;
  rue: string;
};

export const PARTENAIRES: Fiche[] = [
  { cle: "valdrin", nom: "Dr Claire Valdrin", rpps: "99000000101", ville: "Lyon", codePostal: "69003", rue: "14 rue des Tilleuls" },
  { cle: "loubrac", nom: "Dr Marc Loubrac", rpps: "99000000102", ville: "Nantes", codePostal: "44000", rue: "3 place des Érables" },
  { cle: "parc", nom: "Cabinet de cardiologie du Parc (fictif)", siret: "00099900000011", ville: "Bordeaux", codePostal: "33000", rue: "21 allée du Parc" },
  { cle: "castagnier", nom: "Dr Sophie Castagnier", rpps: "99000000104", ville: "Lille", codePostal: "59000", rue: "8 rue des Peupliers" },
  { cle: "morvelle", nom: "Dr Antoine Morvelle", rpps: "99000000105", ville: "Toulouse", codePostal: "31000", rue: "42 boulevard des Platanes" },
  { cle: "perignac", nom: "Dr Hélène Pérignac", rpps: "99000000106", ville: "Rennes", codePostal: "35000", rue: "5 rue des Saules" },
  { cle: "delvaux", nom: "Dr Julien Delvaux-Arnoux", rpps: "99000000107", ville: "Strasbourg", codePostal: "67000", rue: "17 quai des Bouleaux" },
  { cle: "brissac", nom: "Dr Nadia Brissaguet", rpps: "99000000108", ville: "Montpellier", codePostal: "34000", rue: "9 impasse des Oliviers" },
  { cle: "tessier", nom: "Dr Paul Tesserand", rpps: "99000000109", ville: "Dijon", codePostal: "21000", rue: "30 rue des Charmes" },
  { cle: "lavandes", nom: "Centre cardiologique des Lavandes (fictif)", siret: "00099900000022", ville: "Marseille", codePostal: "13008", rue: "2 avenue des Lavandes" },
  { cle: "orvault", nom: "Dr Isabelle Orvalène", rpps: "99000000111", ville: "Tours", codePostal: "37000", rue: "11 rue des Acacias" },
  { cle: "guerande", nom: "Dr Thomas Guérandel", rpps: "99000000112", ville: "Angers", codePostal: "49000", rue: "6 rue des Mimosas" },
  { cle: "fontaines", nom: "Cabinet médical des Fontaines (fictif)", siret: "00099900000033", ville: "Grenoble", codePostal: "38000", rue: "25 rue des Fontaines" },
  { cle: "aubrac", nom: "Dr Léa Aubracin", rpps: "99000000114", ville: "Clermont-Ferrand", codePostal: "63000", rue: "4 rue des Noisetiers" },
  { cle: "verdier", nom: "Dr Hugo Verdières", rpps: "99000000115", ville: "Reims", codePostal: "51100", rue: "19 rue des Cèdres" },
];

export function emailFictif(cle: string): string {
  return `${cle}@demo.explocardio.test`;
}

/** Crée les partenaires dans l'ordre : leurs références (FICT-P-00001…) sont donc stables. */
export async function remplirPartenaires(db: PrismaClient): Promise<Map<string, { id: number; ref: string }>> {
  const resultat = new Map<string, { id: number; ref: string }>();
  let n = 0;
  for (const p of PARTENAIRES) {
    n++;
    const ref = `FICT-P-${String(n).padStart(5, "0")}`;
    const adresse = { ligne1: p.rue, codePostal: p.codePostal, ville: p.ville };
    const cree = await db.partenaire.create({
      data: {
        ref,
        nom: p.nom,
        estSociete: Boolean(p.siret),
        email: emailFictif(p.cle),
        telephone: `+33 6 00 00 ${String(10 + n).padStart(2, "0")} ${String(20 + n).padStart(2, "0")}`,
        rpps: p.rpps ?? null,
        siret: p.siret ?? null,
        adresses: [
          { type: "cabinet", ...adresse },
          { type: "livraison", ...adresse },
          { type: "facturation", ...adresse },
        ],
      },
    });
    resultat.set(p.cle, { id: cree.id, ref });
  }
  await db.sequence.upsert({ where: { code: "P" }, create: { code: "P", valeur: n }, update: { valeur: n } });
  return resultat;
}
