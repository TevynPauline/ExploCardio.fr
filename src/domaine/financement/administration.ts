import { registre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";
import { emailsCommandes } from "@/emails/modeles-commandes";
import type { StatutDemandeFinancement } from "@generated/site/client";
import { envoyer } from "../commande/notifications";
import { LIBELLES_STATUT_FINANCEMENT } from "./demande";

// Traitement des demandes de financement par l'équipe (F04, US8, FR-036, FR-038, FR-039) :
// statut (le client est prévenu à chaque changement), notes internes jamais visibles du
// client, journal, et création de la commande « financée » dans Odoo (sans facture au client).

export type Auteur = { id: string; libelle: string };

export class ActionRefusee extends Error {}

export const STATUTS_FINANCEMENT = ["recue", "en_etude", "accordee", "refusee"] as const satisfies readonly StatutDemandeFinancement[];

async function journal(a: Auteur, action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteurId: a.id, auteur: a.libelle, action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

export async function listerDemandes(statut: StatutDemandeFinancement) {
  return dbSite().demandeFinancement.findMany({
    where: { statut },
    include: { compte: { include: { utilisateur: true } } },
    orderBy: { creeLe: statut === "recue" ? "asc" : "desc" },
    take: 200,
  });
}

export async function compterDemandes() {
  const lignes = await dbSite().demandeFinancement.groupBy({ by: ["statut"], _count: true });
  return Object.fromEntries(STATUTS_FINANCEMENT.map((s) => [s, lignes.find((l) => l.statut === s)?._count ?? 0])) as Record<StatutDemandeFinancement, number>;
}

export async function lireDemande(id: string) {
  const demande = await dbSite().demandeFinancement.findUnique({ where: { id }, include: { compte: { include: { utilisateur: true, adresses: true } } } });
  if (!demande) return null;
  const historique = await dbSite().journalAction.findMany({ where: { objet: id }, orderBy: { date: "desc" }, take: 50 });
  return { demande, historique };
}

export async function changerStatut(id: string, statut: StatutDemandeFinancement, a: Auteur) {
  if (!STATUTS_FINANCEMENT.includes(statut)) throw new ActionRefusee("Statut inconnu.");
  const avant = await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id }, include: { compte: { include: { utilisateur: true } } } });
  if (avant.statut === statut) return false;
  if (avant.commandeRef) throw new ActionRefusee("La commande financée est déjà créée : le statut ne peut plus changer.");
  await dbSite().demandeFinancement.update({ where: { id }, data: { statut } });
  await journal(a, "financement.statut", id, { avant: avant.statut, apres: statut });
  const libelle = LIBELLES_STATUT_FINANCEMENT[statut].toLowerCase();
  await envoyer(avant.compte.utilisateur.email, await emailsCommandes.statutFinancement({ statut: libelle }), "statut du financement", `financement-statut:${id}:${statut}`);
  return true;
}

export async function ajouterNote(id: string, note: string, a: Auteur) {
  const texte = note.trim();
  if (!texte) throw new ActionRefusee("La note est vide.");
  if (texte.length > 2000) throw new ActionRefusee("La note dépasse 2 000 caractères.");
  const d = await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id } });
  const entree = `${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} — ${a.libelle} : ${texte}`;
  await dbSite().demandeFinancement.update({ where: { id }, data: { notesInternes: d.notesInternes ? `${entree}\n${d.notesInternes}` : entree } });
  await journal(a, "financement.note", id, {});
}

/** Commande « financée » dans Odoo (FR-038, FR-047) : stock décompté, aucune facture au client. */
export async function creerCommandeFinancee(id: string, a: Auteur): Promise<string> {
  const d = await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id }, include: { compte: { include: { adresses: true } } } });
  if (d.commandeRef) return d.commandeRef;
  if (d.statut !== "accordee") throw new ActionRefusee("La commande financée ne peut être créée qu'une fois le financement accordé.");
  if (!d.compte.odooPartnerRef) throw new ActionRefusee("Le compte du client n'a pas encore de fiche dans Odoo : validez-le d'abord.");
  const adresse = d.compte.adresses.find((x) => x.type === "livraison") ?? d.compte.adresses.find((x) => x.type === "cabinet") ?? d.compte.adresses[0];
  if (!adresse) throw new ActionRefusee("Le client n'a aucune adresse : complétez son compte avant de créer la commande.");
  const equipements = d.equipements as { defaultCode: string; quantite: number }[];
  const { ref } = await registre.odoo().commandes.creerCommandePayee(
    {
      partenaireRef: d.compte.odooPartnerRef,
      lignes: equipements.map((e) => ({ defaultCode: e.defaultCode, quantite: e.quantite })),
      livraison: { adresse: [adresse.ligne1, adresse.ligne2].filter(Boolean).join(", "), codePostal: adresse.codePostal, ville: adresse.ville, fraisPortHt: 0 },
      paiement: { mode: "financement", reference: `FIN-${d.id}` },
    },
    `commande-financee:${d.id}`,
  );
  await dbSite().demandeFinancement.update({ where: { id }, data: { commandeRef: ref } });
  await journal(a, "financement.commande_creee", id, { commande: ref });
  return ref;
}
