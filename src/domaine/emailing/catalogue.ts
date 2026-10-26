import type { FamilleEmail, ScenarioEmail } from "@generated/site/client";

// Catalogue des modèles d'emails (F10, FR-001, D3) : la famille de chaque modèle décide qui le
// reçoit et s'il peut être désactivé. Tous les modèles existants sont transactionnels, sauf les
// alertes de fin des droits et d'expiration des bons (F06), devenues des emails de service.

export type VariableModele = { nom: string; description: string; exemple: string; obligatoire: boolean };

export type EntreeCatalogue = {
  famille: Exclude<FamilleEmail, "equipe">;
  /** Variables des modèles rendus au moment de l'envoi (scénarios) ; contrôlées avant l'envoi. */
  variables?: VariableModele[];
  libelle: string;
  module: string;
  scenario?: ScenarioEmail;
  /** Pourquoi il est toujours envoyé (préférences, FR-022), pour les transactionnels. */
  justification?: string;
};

const T = (libelle: string, module: string, justification: string): EntreeCatalogue => ({ famille: "transactionnel", libelle, module, justification });

const COMPTE = "sécurité et suivi de votre compte";
const COMMANDE = "suivi de vos commandes et de vos paiements";
const LOCATION = "suivi de vos mises à disposition en cours";
const CLOUD = "accès à vos logiciels Cloud";
const FIDELITE = "état de vos bons d’achat et droits d’assistance";

export const CATALOGUE = {
  essai: T("Message d’essai", "F11", "message de vérification de l’affichage"),
  // F02 — comptes
  confirmation_adresse: T("Confirmation de l’adresse email", "F02", COMPTE),
  reinitialisation_mot_de_passe: T("Réinitialisation du mot de passe", "F02", COMPTE),
  confirmation_newsletter: T("Confirmation d’inscription à la newsletter", "F01", "confirmation de votre consentement"),
  compte_valide: T("Compte validé", "F02", COMPTE),
  compte_refuse: T("Compte refusé", "F02", COMPTE),
  compte_suspendu: T("Compte suspendu", "F02", COMPTE),
  compte_retabli: T("Compte rétabli", "F02", COMPTE),
  compte_bloque: T("Compte bloqué après des échecs de connexion", "F02", COMPTE),
  compte_supprime: T("Compte supprimé", "F02", COMPTE),
  mot_de_passe_modifie: T("Mot de passe modifié", "F02", COMPTE),
  confirmer_nouvel_email: T("Confirmation d’une nouvelle adresse", "F02", COMPTE),
  email_change: T("Ancienne adresse prévenue d’un changement", "F02", COMPTE),
  double_authentification: T("Double authentification activée ou désactivée", "F02", COMPTE),
  invitation_equipe: T("Invitation au back-office", "F13", COMPTE),
  numero_refuse: T("Numéro d'entreprise refusé", "F16", COMPTE),
  cadeau_en_attente: T("Cadeau de bienvenue en attente", "F02", COMMANDE),
  // F04 — commandes, paiements, financement
  commande_confirmee: T("Confirmation de commande", "F04", COMMANDE),
  devis_envoye: T("Devis envoyé", "F16", COMMANDE),
  commande_annulee: T("Commande annulée", "F04", COMMANDE),
  virement_recu: T("Virement reçu, facture disponible", "F04", COMMANDE),
  commande_expediee: T("Commande expédiée", "F04", COMMANDE),
  remboursement: T("Remboursement et avoir", "F04", COMMANDE),
  abonnement_souscrit: T("Mise à disposition souscrite", "F04", LOCATION),
  abonnement_logiciel_souscrit: T("Abonnement logiciel souscrit", "F12", CLOUD),
  echeance_payee: T("Échéance prélevée, facture disponible", "F04", COMMANDE),
  financement_recu: T("Demande de financement reçue", "F04", "suivi de votre demande de financement"),
  financement_statut: T("Évolution de la demande de financement", "F04", "suivi de votre demande de financement"),
  relance_impaye: {
    famille: "transactionnel",
    libelle: "Relance de paiement",
    module: "F10",
    scenario: "impaye",
    justification: "règlement d’une somme due",
    variables: [
      { nom: "objet", description: "Ce qui est dû (commande, location)", exemple: "commande FICT-SO-00042", obligatoire: true },
      { nom: "montant", description: "Montant TTC dû, en centimes", exemple: "19200", obligatoire: true },
      { nom: "consequence", description: "Conséquence à l'échéance", exemple: "annulation de la commande", obligatoire: true },
      { nom: "dateConsequence", description: "Date de la conséquence", exemple: "2026-11-02", obligatoire: true },
      { nom: "niveau", description: "Niveau de relance (1 à 3)", exemple: "1", obligatoire: true },
    ],
  },
  // F05 — mises à disposition
  location_expediee: T("Appareil expédié", "F05", LOCATION),
  location_appareil_defectueux: T("Appareil défectueux", "F05", LOCATION),
  location_date_recalculee: T("Date de livraison recalculée", "F05", LOCATION),
  location_annulee_remboursee: T("Mise à disposition annulée et remboursée", "F05", LOCATION),
  location_rappel_echeance: T("Prochaine échéance", "F05", LOCATION),
  location_prelevement_echoue: T("Prélèvement refusé", "F05", LOCATION),
  location_suspendue: T("Mise à disposition suspendue", "F05", LOCATION),
  location_resiliee: T("Résiliation enregistrée", "F05", LOCATION),
  location_prolongee: T("Mise à disposition prolongée", "F05", LOCATION),
  location_rappel_retour: T("Rappel de retour de l’appareil", "F05", LOCATION),
  location_prelevement_ponctuel: T("Prélèvement ponctuel", "F05", LOCATION),
  location_retour_recu: T("Appareil retourné", "F05", LOCATION),
  location_inviter_resiliation: T("Invitation à résilier", "F05", LOCATION),
  // F06 — fidélité
  fidelite_credit: T("Bons d’achat crédités", "F06", FIDELITE),
  fidelite_retrait: T("Bons d’achat retirés", "F06", FIDELITE),
  fidelite_restitution: T("Bons d’achat restitués", "F06", FIDELITE),
  fidelite_ajustement: T("Ajustement de bons d’achat", "F06", FIDELITE),
  droits_ouverture: T("Droits d’assistance ouverts", "F06", FIDELITE),
  droits_prolongation: T("Droits d’assistance prolongés", "F06", FIDELITE),
  droits_retrait: T("Droits d’assistance réduits", "F06", FIDELITE),
  droits_ajustement: T("Droits d’assistance ajustés", "F06", FIDELITE),
  intervention_cloturee: T("Intervention d’assistance clôturée", "F06", FIDELITE),
  droits_rappel_fin: { famille: "service", libelle: "Alerte de fin des droits d’assistance", module: "F06", scenario: "alerte_droits" },
  bons_rappel_expiration: { famille: "service", libelle: "Alerte d’expiration des bons d’achat", module: "F06", scenario: "alerte_bons" },
  // F12 — accès Cloud
  cloud_ouverture: T("Accès Cloud ouvert", "F12", CLOUD),
  cloud_rappel_periode: T("Fin prochaine de la période incluse", "F12", CLOUD),
  cloud_rappel_fin: T("Fin prochaine de l’accès Cloud", "F12", CLOUD),
  cloud_grace: T("Délai de récupération des données", "F12", CLOUD),
  cloud_fermeture: T("Accès Cloud fermé", "F12", CLOUD),
  cloud_suspension: T("Accès Cloud suspendu", "F12", CLOUD),
  cloud_retablissement: T("Accès Cloud rétabli", "F12", CLOUD),
  // F10 — scénarios et campagnes
  relance_reapprovisionnement: {
    famille: "service",
    libelle: "Relance de réapprovisionnement",
    module: "F10",
    scenario: "reapprovisionnement",
    variables: [{ nom: "articles", description: "Consommables dus : référence, quantité habituelle, date prévue", exemple: "[]", obligatoire: true }],
  },
  panier_abandonne: {
    famille: "service",
    libelle: "Panier en attente",
    module: "F10",
    scenario: "panier_abandonne",
    variables: [{ nom: "panierId", description: "Panier concerné", exemple: "—", obligatoire: true }],
  },
  campagne: {
    famille: "commercial",
    libelle: "Newsletter : promotion, vente flash, nouveauté",
    module: "F10",
    scenario: "campagne",
    variables: [{ nom: "campagneId", description: "Campagne envoyée", exemple: "—", obligatoire: true }],
  },
} satisfies Record<string, EntreeCatalogue>;

export type CodeModele = keyof typeof CATALOGUE;

export function entreeDuModele(code: string): EntreeCatalogue {
  const e = (CATALOGUE as Record<string, EntreeCatalogue>)[code];
  if (!e) throw new Error(`Modèle d'email inconnu : ${code}`);
  return e;
}

/** Libellés des types facultatifs proposés dans les préférences (FR-022). */
export const TYPES_FACULTATIFS = [
  { cle: "reapprovisionnement", libelle: "Relances de réapprovisionnement", description: "Un rappel quelques jours avant la date où vous recommandez habituellement un consommable." },
  { cle: "alerteDroits", libelle: "Alerte de fin des droits d’assistance", description: "Avant la fin de vos droits, la date et comment les prolonger." },
  { cle: "alerteBons", libelle: "Alerte d’expiration des bons d’achat", description: "Avant que des bons d’achat n’expirent, le montant et la date." },
  { cle: "panierAbandonne", libelle: "Rappel de panier en attente", description: "Un seul rappel si vous laissez un panier sans commander." },
] as const;

/** Raison affichée en pied d'un email de service (FR-041). */
export const RAISONS: Partial<Record<ScenarioEmail, string>> = {
  reapprovisionnement: "Vous recevez cet email parce que vous commandez régulièrement ce consommable chez ExploCardio.fr.",
  panier_abandonne: "Vous recevez cet email parce que votre panier contient des articles non commandés.",
  alerte_bons: "Vous recevez cet email parce que des bons d’achat de votre compte vont expirer.",
  alerte_droits: "Vous recevez cet email parce que vos droits d’assistance arrivent à leur fin.",
  campagne: "Vous recevez cet email parce que vous êtes abonné à la newsletter d’ExploCardio.fr.",
};
