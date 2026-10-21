import type { RoleEquipe } from "@/lib/droits";

// Catalogue des paramètres réglables (F13, US4, D3, R3) : l'écran Paramètres se construit
// depuis cette liste. Prix, remises, promotions, bons d'achat, droits d'assistance et garanties
// n'y figurent pas : ils se règlent dans Odoo (FR-017).

export type TypeParametre =
  | "heure"
  | "entier"
  | "booleen"
  | "texte"
  | "telephone"
  | "email"
  | "emails"
  | "url"
  | "iban"
  | "bic"
  | "dates"
  | "zones"
  | "liste"
  | "horaires"
  | "fermetures";

export type Theme = "livraison" | "contact" | "comptes" | "virement" | "rappels" | "cloud" | "securite" | "bienvenue";

export type DefinitionParametre = {
  cle: string;
  libelle: string;
  theme: Theme;
  type: TypeParametre;
  aide?: string;
  min?: number;
  max?: number;
  /** Valeur appliquée tant que personne ne l'a modifiée (si elle n'est pas dans PARAMETRES_PAR_DEFAUT). */
  defaut?: string;
  /** Rôles autorisés à le modifier ; administrateur seul par défaut. */
  roles?: RoleEquipe[];
};

export const THEMES: Record<Theme, { libelle: string; description: string }> = {
  livraison: { libelle: "Livraison", description: "Heure limite, jours non livrés et zones éloignées. Les tarifs de livraison se règlent dans Odoo." },
  contact: { libelle: "Contact WhatsApp et horaires", description: "Ligne WhatsApp Business, horaires de réponse (jours fériés pris en compte automatiquement) et fermetures exceptionnelles." },
  comptes: { libelle: "Comptes", description: "Validation des comptes professionnels et spécialités proposées à l'inscription." },
  virement: { libelle: "Virement", description: "Coordonnées bancaires indiquées aux clients qui paient par virement. Le virement n'est pas proposé tant que l'IBAN est vide." },
  rappels: { libelle: "Fidélité et rappels", description: "Utilisation des bons au panier et délais des rappels envoyés aux clients. Les règles du programme de fidélité se règlent dans Odoo." },
  cloud: { libelle: "Accès Cloud", description: "Plateforme Cloud, délai de grâce et rappels. Les durées incluses et les prix se règlent dans Odoo." },
  securite: { libelle: "Sécurité et alertes", description: "Fermeture des sessions de l'équipe et alertes en cas de panne." },
  bienvenue: { libelle: "Offre de bienvenue", description: "L'article offert et son stock sont gérés dans Odoo. Les professionnels déjà bénéficiaires gardent leur droit." },
};

const ADMIN_COMMERCIAL: RoleEquipe[] = ["admin", "commercial"];

export const PARAMETRES: DefinitionParametre[] = [
  { cle: "commande.heure_limite_express", libelle: "Heure limite d'expédition", theme: "livraison", type: "heure", defaut: "14:00", aide: "Après cette heure, la livraison express et la livraison au lendemain d'une mise à disposition partent le jour ouvré suivant." },
  { cle: "livraison.jours_non_livres", libelle: "Jours non livrés", theme: "livraison", type: "dates", aide: "Une date par ligne (AAAA-MM-JJ), en plus des week-ends et des jours fériés." },
  { cle: "livraison.zones_sans_lendemain", libelle: "Zones sans livraison au lendemain", theme: "livraison", type: "zones", aide: "Débuts de codes postaux, séparés par des virgules ; 20 = Corse." },
  { cle: "livraison.delai_zones_jours", libelle: "Délai supplémentaire de ces zones (jours ouvrés)", theme: "livraison", type: "entier", min: 0, max: 10 },

  { cle: "contact.whatsapp", libelle: "Numéro WhatsApp", theme: "contact", type: "telephone", aide: "Format international, par exemple +33 6 12 34 56 78. Vide : aucun bouton WhatsApp, le formulaire de contact est proposé." },
  { cle: "contact.horaires", libelle: "Horaires de réponse", theme: "contact", type: "horaires", aide: "Par jour, par exemple 09:00-12:00, 14:00-18:00 ; vide : fermé." },
  { cle: "contact.fermetures", libelle: "Fermetures exceptionnelles", theme: "contact", type: "fermetures", aide: "Une par ligne : AAAA-MM-JJ AAAA-MM-JJ motif ; par exemple 2026-12-24 2027-01-03 Congés." },
  { cle: "contact.destinataire_messages", libelle: "Adresse qui reçoit les messages de contact", theme: "contact", type: "email", aide: "En démonstration, les messages arrivent dans la boîte de démonstration." },

  { cle: "comptes.validation_auto", libelle: "Valider automatiquement un compte dès la confirmation de son email", theme: "comptes", type: "booleen", defaut: "false", aide: "Le contrôle du format du numéro RPPS ou SIRET ne prouve pas qu'il appartient au demandeur." },
  { cle: "comptes.specialites", libelle: "Spécialités proposées à l'inscription", theme: "comptes", type: "liste", defaut: "[]", aide: "Une par ligne, sans doublon." },

  { cle: "virement.titulaire", libelle: "Titulaire du compte", theme: "virement", type: "texte", max: 100 },
  { cle: "virement.iban", libelle: "IBAN", theme: "virement", type: "iban" },
  { cle: "virement.bic", libelle: "BIC", theme: "virement", type: "bic" },

  { cle: "location.rappel_echeance_jours", libelle: "Rappel avant une échéance de location (jours)", theme: "rappels", type: "entier", min: 1, max: 15 },
  { cle: "location.rappel_retour_jours", libelle: "Rappel de retour en retard, tous les (jours)", theme: "rappels", type: "entier", min: 1, max: 15 },
  { cle: "fidelite.bons_au_panier", libelle: "Bons d'achat utilisables au panier", theme: "rappels", type: "booleen", aide: "Non : les bons ne peuvent pas être déduits des commandes en ligne. Leurs montants et règles se gèrent dans Odoo." },
  { cle: "fidelite.rappel_droits_jours", libelle: "Rappel avant la fin des droits d'assistance (jours)", theme: "rappels", type: "entier", min: 1, max: 60 },
  { cle: "fidelite.rappel_expiration_jours", libelle: "Rappel avant l'expiration de bons d'achat (jours)", theme: "rappels", type: "entier", min: 1, max: 120 },

  { cle: "cloud.url_plateforme", libelle: "Adresse de la plateforme Cloud", theme: "cloud", type: "url", aide: "Adresse https:// de la plateforme, ou chemin du site (page simulée en démonstration)." },
  { cle: "cloud.delai_grace_jours", libelle: "Délai de grâce après la fin d'un accès (jours)", theme: "cloud", type: "entier", min: 0, max: 180, aide: "Le médecin peut seulement consulter et récupérer ses données." },
  { cle: "cloud.rappel_periode_jours", libelle: "Rappel avant la fin d'une période incluse (jours)", theme: "cloud", type: "entier", min: 1, max: 120 },
  { cle: "cloud.rappel_fin_jours", libelle: "Rappel avant la fin d'un accès (jours)", theme: "cloud", type: "entier", min: 1, max: 60 },

  { cle: "securite.inactivite_minutes", libelle: "Fermeture d'une session de l'équipe inactive (minutes)", theme: "securite", type: "entier", min: 5, max: 240 },
  { cle: "connecteurs.seuil_alerte", libelle: "Erreurs successives d'un connecteur avant alerte", theme: "securite", type: "entier", min: 1, max: 50 },
  { cle: "file_attente.seuil_alerte", libelle: "Échecs successifs d'une tâche avant alerte", theme: "securite", type: "entier", min: 1, max: 50 },
  { cle: "alertes.destinataires", libelle: "Adresses qui reçoivent les alertes", theme: "securite", type: "emails", aide: "Séparées par des virgules. Vide : l'adresse qui reçoit les messages de contact." },

  { cle: "bienvenue.active", libelle: "Offre de bienvenue active", theme: "bienvenue", type: "booleen", defaut: "true", roles: ADMIN_COMMERCIAL },
  { cle: "accueil.offre_bienvenue", libelle: "Texte de l'offre de bienvenue (accueil)", theme: "bienvenue", type: "texte", max: 300, roles: ADMIN_COMMERCIAL },
];

export function definition(cle: string): DefinitionParametre | undefined {
  return PARAMETRES.find((p) => p.cle === cle);
}

export function rolesAutorises(p: DefinitionParametre): RoleEquipe[] {
  return p.roles ?? ["admin"];
}
