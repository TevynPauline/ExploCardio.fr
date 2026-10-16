// Libellés des statuts et décisions, pour l'équipe et pour le client.

export const LIBELLES_STATUT: Record<string, string> = {
  email_a_confirmer: "Email à confirmer",
  en_attente: "En attente de validation",
  valide: "Validé",
  refuse: "Refusé",
  suspendu: "Suspendu",
  supprime: "Supprimé",
};

export const LIBELLES_DECISION: Record<string, string> = {
  validation: "Validation",
  refus: "Refus",
  suspension: "Suspension",
  retablissement: "Rétablissement",
};
