import type { EtatCampagne } from "@generated/site/client";

export const ETATS_CAMPAGNE: Record<EtatCampagne, string> = {
  brouillon: "Brouillon",
  programmee: "Programmée",
  en_cours: "En cours d’envoi",
  envoyee: "Envoyée",
  annulee: "Annulée",
};

export const dateCourte = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }) : "—");
