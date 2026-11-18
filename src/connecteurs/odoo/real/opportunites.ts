import type { CopieDemande, OpportunitesOdoo } from "../interfaces";
import type { ClientOdoo } from "./client";
import type { Ecritures } from "./ecritures";
import { idDeRefPartenaire } from "./partenaires";

// Domaine « Opportunités » en mode réel (F14 lot 2, plan-lots-2-3.md D3) : chaque demande de
// devis ou de financement du site est copiée en opportunité du CRM d'Odoo, étiquetée « Site ».
// La demande elle-même reste gérée par le site. Aucune donnée patient (le site n'en recueille pas).

const ETIQUETTE = "Site";

const LIBELLES: Record<string, string> = {
  objet: "Objet",
  nom: "Nom",
  email: "Email",
  telephone: "Téléphone",
  cabinet: "Cabinet",
  besoin: "Besoin",
  message: "Message",
  equipements: "Équipements",
  dureeMois: "Durée (mois)",
  mensualiteIndicativeHt: "Mensualité indicative HT (centimes)",
  siret: "SIRET",
  adresse: "Adresse",
  praticiens: "Praticiens",
  quantite: "Quantité",
  reference: "Référence",
  defaultCode: "Référence",
};

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Contenu de la demande en HTML simple pour les notes de l'opportunité. */
export function notesDeLaDemande(contenu: Record<string, unknown>): string {
  const rendre = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return `<ul>${v.map((x) => `<li>${rendre(x)}</li>`).join("")}</ul>`;
    if (typeof v === "object") {
      return Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x !== null && x !== undefined && x !== "")
        .map(([k, x]) => `${echapper(LIBELLES[k] ?? k)} : ${rendre(x)}`)
        .join(", ");
    }
    return echapper(String(v));
  };
  const lignes = Object.entries(contenu)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `<li><strong>${echapper(LIBELLES[k] ?? k)}</strong> : ${rendre(v)}</li>`);
  return `<p>Demande reçue sur le site explocardio.fr.</p><ul>${lignes.join("")}</ul>`;
}

function texte(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function creerOpportunitesReelles(client: ClientOdoo, ecritures: Ecritures): OpportunitesOdoo {
  let etiquette: Promise<number> | null = null;
  const idEtiquette = () =>
    (etiquette ??= (async () => {
      const [t] = await client.searchRead("crm.tag", [["name", "=", ETIQUETTE]], ["id"], { limite: 1 });
      return t ? t.id : ((await client.appeler("crm.tag", "create", [{ name: ETIQUETTE }])) as number);
    })().catch((e: unknown) => {
      etiquette = null;
      throw e;
    }));

  return {
    async copierDemande(demande: CopieDemande, cle) {
      const { resultat } = await ecritures.uneFois(`opportunite:${cle}`, "opportunites.copierDemande", async () => {
        const c = demande.contenu;
        const partenaireId = demande.partenaireRef ? idDeRefPartenaire(demande.partenaireRef) : null;
        const cabinet = typeof c.cabinet === "object" && c.cabinet ? texte((c.cabinet as Record<string, unknown>).nom) : texte(c.cabinet);
        const fiche = partenaireId !== null ? (await client.searchRead("res.partner", [["id", "=", partenaireId]], ["name"], { limite: 1 }))[0] : undefined;
        const qui = cabinet ?? texte(fiche?.name) ?? texte(c.nom) ?? "client du site";
        const [equipe] = await client.searchRead("crm.team", [], ["id"], { limite: 1, ordre: "sequence, id" });
        const valeurs: Record<string, unknown> = {
          type: "opportunity",
          name: `${demande.type === "financement" ? "Demande de financement" : "Demande de devis"} — ${qui}`,
          description: notesDeLaDemande(c),
          tag_ids: [[4, await idEtiquette()]],
          ...(equipe ? { team_id: equipe.id } : {}),
        };
        if (partenaireId !== null) valeurs.partner_id = partenaireId;
        else {
          if (texte(c.nom)) valeurs.contact_name = texte(c.nom);
          if (cabinet) valeurs.partner_name = cabinet;
          if (texte(c.email)) valeurs.email_from = texte(c.email);
          if (texte(c.telephone)) valeurs.phone = texte(c.telephone);
        }
        const id = (await client.appeler("crm.lead", "create", [valeurs])) as number;
        return { ref: `O${id}` };
      });
      return resultat;
    },
  };
}

