import { emailConfirmationAdresse, emailConfirmationNewsletter, emailEssai, emailReinitialisationMotDePasse } from "./modeles";
import { emailsCloud } from "./modeles-cloud";
import { emailsCommandes } from "./modeles-commandes";
import { emailsComptes } from "./modeles-comptes";
import { emailsFidelite } from "./modeles-fidelite";
import { emailsEmailing } from "./modeles-emailing";
import { emailsLocations } from "./modeles-locations";
import type { EmailRendu } from "./rendu";
import { urlDuSite } from "./charte";
import type { PiedPreferences } from "./Gabarit";

// Exemples fictifs de chaque modèle (F10) : aperçu au back-office et contrôle automatique de
// tous les emails (charte, accessibilité, données interdites). Aucune donnée réelle.

const J = (jours: number) => new Date(Date.UTC(2026, 10, 2 + jours, 11));
const PIED_SERVICE = (raison: string): PiedPreferences => ({ raison, preferences: urlDuSite("/preferences/exemple") });
const LIGNES = [
  { libelle: "Électrodes Holter (carton de 500)", quantite: 2, totalHt: 32000 },
  { libelle: "Carte SD 8 Go", quantite: 1, totalHt: 2500 },
];

export const EXEMPLES: Record<string, () => Promise<EmailRendu>> = {
  essai: emailEssai,
  reinitialisation_mot_de_passe: () => emailReinitialisationMotDePasse(urlDuSite("/mot-de-passe/nouveau?jeton=exemple")),
  confirmation_adresse: () => emailConfirmationAdresse(urlDuSite("/api/auth/verify-email?token=exemple")),
  confirmation_newsletter: () => emailConfirmationNewsletter(urlDuSite("/newsletter/confirmation?jeton=exemple")),
  compte_valide: emailsComptes.compteValide,
  compte_refuse: emailsComptes.compteRefuse,
  compte_suspendu: emailsComptes.compteSuspendu,
  compte_retabli: emailsComptes.compteRetabli,
  compte_bloque: emailsComptes.compteBloque,
  compte_supprime: emailsComptes.compteSupprime,
  mot_de_passe_modifie: emailsComptes.motDePasseModifie,
  confirmer_nouvel_email: () => emailsComptes.confirmerNouvelEmail(urlDuSite("/api/auth/verify-email?token=exemple")),
  email_change: () => emailsComptes.ancienEmailPrevenu("nouvelle.adresse@exemple.test"),
  double_authentification: () => emailsComptes.doubleAuthentification(true),
  cadeau_en_attente: emailsComptes.cadeauEnAttente,
  commande_confirmee: () => emailsCommandes.confirmation({ ref: "FICT-SO-00042", lignes: LIGNES, totalHt: 34500, totalTtc: 41400, virement: null }),
  commande_annulee: () => emailsCommandes.annulation({ ref: "FICT-SO-00042", motif: "virement non reçu à l’échéance" }),
  virement_recu: () => emailsCommandes.paiementRecu({ ref: "FICT-SO-00042" }),
  commande_expediee: () => emailsCommandes.expedition({ ref: "FICT-SO-00042", transporteur: "Colissimo", suivi: "FICT-COLIS-0042" }),
  remboursement: () => emailsCommandes.remboursement({ ref: "FICT-SO-00042", montantTtc: 3000, total: false }),
  abonnement_souscrit: () => emailsCommandes.abonnement({ ref: "FICT-SUB-0007", premierMoisTtc: 9600, moisSuivantsTtc: 9600 }),
  abonnement_logiciel_souscrit: () => emailsCommandes.abonnement({ ref: "FICT-SUB-0008", premierMoisTtc: 4800, moisSuivantsTtc: 4800, logiciel: true, priseEffet: J(30) }),
  echeance_payee: () => emailsCommandes.echeance({ montantTtc: 9600 }),
  financement_recu: () => emailsCommandes.financementRecu({ equipements: ["Holter ECG DMS 300-4L"], dureeMois: 36, mensualiteHt: 8900, mention: "Sous réserve d’acceptation du dossier." }),
  financement_statut: () => emailsCommandes.statutFinancement({ statut: "accordée" }),
  location_expediee: () =>
    emailsLocations.expediee({ appareil: "Holter ECG DMS 300-4L", numeroSerie: "FICT-SN-3004L-002", transporteur: "Colissimo", suivi: "FICT-COLIS-0050", dateLivraison: J(1), whatsapp: "06 00 00 00 00", logiciel: true }),
  location_appareil_defectueux: () => emailsLocations.appareilDefectueux({ appareil: "Holter ECG DMS 300-4L" }),
  location_date_recalculee: () => emailsLocations.dateRecalculee({ appareil: "Holter ECG DMS 300-4L", dateLivraison: J(2) }),
  location_annulee_remboursee: () => emailsLocations.annuleeRemboursee({ appareil: "Holter ECG DMS 300-4L", montantTtc: 9600, motif: "appareil indisponible" }),
  location_rappel_echeance: () => emailsLocations.rappelEcheance({ appareil: "Holter ECG DMS 300-4L", echeance: J(3), montantHt: 8000, montantTtc: 9600 }),
  location_prelevement_echoue: () => emailsLocations.prelevementEchoue({ appareil: "Holter ECG DMS 300-4L", delaiJours: 7 }),
  location_suspendue: () => emailsLocations.suspendue({ appareil: "Holter ECG DMS 300-4L" }),
  location_resiliee: () => emailsLocations.resiliee({ appareil: "Holter ECG DMS 300-4L", fin: J(10), dateLimiteRetour: J(17), logiciel: true }),
  location_prolongee: () => emailsLocations.prolongee({ appareil: "Holter ECG DMS 300-4L" }),
  location_rappel_retour: () => emailsLocations.rappelRetour({ appareil: "Holter ECG DMS 300-4L", dateLimiteRetour: J(2), facturationLe: J(9), montantHt: 120000 }),
  location_prelevement_ponctuel: () => emailsLocations.prelevementPonctuel({ libelle: "Frais de remise en état", montantTtc: 6000, facture: "FICT-INV-0099" }),
  location_retour_recu: () => emailsLocations.retourRecu({ appareil: "Holter ECG DMS 300-4L", degradationHt: null }),
  location_inviter_resiliation: () => emailsLocations.inviterResiliation({ appareil: "Holter ECG DMS 300-4L" }),
  fidelite_credit: () => emailsFidelite.credit({ montantHt: 1500, commandeRef: "FICT-SO-00042", validiteFin: J(365) }),
  fidelite_retrait: () => emailsFidelite.retrait({ montantHt: 1500, commandeRef: "FICT-SO-00042" }),
  fidelite_restitution: () => emailsFidelite.restitution({ montantHt: 1500, commandeRef: "FICT-SO-00042", validiteFin: J(365) }),
  fidelite_ajustement: () => emailsFidelite.ajustement({ montantHt: 1000, motif: "geste commercial" }),
  droits_ouverture: () => emailsFidelite.droits({ type: "ouverture", fin: J(365), motif: null }),
  droits_prolongation: () => emailsFidelite.droits({ type: "prolongation", fin: J(365), motif: null }),
  droits_retrait: () => emailsFidelite.droits({ type: "retrait", fin: J(100), motif: null }),
  droits_ajustement: () => emailsFidelite.droits({ type: "ajustement", fin: J(200), motif: "geste commercial" }),
  droits_rappel_fin: () => emailsFidelite.rappelFinDroits({ fin: J(7), seuilHt: 50000, pied: PIED_SERVICE("Vous recevez cet email parce que vos droits d’assistance arrivent à leur fin.") }),
  bons_rappel_expiration: () =>
    emailsFidelite.rappelExpiration({ montantHt: 2500, date: J(30), soldeHt: 6000, pied: PIED_SERVICE("Vous recevez cet email parce que des bons d’achat de votre compte vont expirer.") }),
  intervention_cloturee: emailsFidelite.interventionClose,
  cloud_ouverture: () => emailsCloud.ouverture({ logiciel: "DMS Cardio Cloud", fin: null }),
  cloud_rappel_periode: () => emailsCloud.rappelPeriode({ logiciel: "DMS Cardio Cloud", fin: J(30) }),
  cloud_rappel_fin: () => emailsCloud.rappelFin({ logiciel: "DMS Cardio Cloud", fin: J(7), delaiGraceJours: 30 }),
  cloud_grace: () => emailsCloud.grace({ logiciel: "DMS Cardio Cloud", finGrace: J(30) }),
  cloud_fermeture: () => emailsCloud.fermeture({ logiciel: "DMS Cardio Cloud" }),
  cloud_suspension: () => emailsCloud.suspension({ logiciel: "DMS Cardio Cloud", motif: "location suspendue pour impayé" }),
  cloud_retablissement: () => emailsCloud.retablissement({ logiciel: "DMS Cardio Cloud" }),
  relance_reapprovisionnement: () =>
    emailsEmailing.reapprovisionnement({
      articles: [{ nom: "Électrodes Holter — Carton de 500", quantite: 2, prixHt: 16000, prochaine: J(7), lien: urlDuSite("/panier/recommander?ref=EC-ELEC-HOLTER-500&quantite=2") }],
      gains: { bonsAchatHt: 1600, droitsJusquAu: J(365) },
      pied: PIED_SERVICE("Vous recevez cet email parce que vous commandez régulièrement ce consommable chez ExploCardio.fr."),
    }),
  panier_abandonne: () =>
    emailsEmailing.panier({
      lignes: [{ libelle: "Électrodes Holter — Carton de 50", quantite: 2, prixUnitaireHt: 2200, miseADisposition: false, disponibilite: "disponible" }],
      lien: urlDuSite("/panier"),
      pied: PIED_SERVICE("Vous recevez cet email parce que votre panier contient des articles non commandés."),
    }),
  relance_impaye: () =>
    emailsEmailing.relanceImpaye({
      niveau: "Dernier rappel",
      objet: "commande FICT-SO-00042",
      montantTtc: 41400,
      consequence: "la commande sera annulée",
      dateConsequence: J(1),
      annonce: true,
      regulariser: "Effectuez votre virement en rappelant la référence FICT-SO-00042 : titulaire ExploCardio.fr (fictif), IBAN FR76 0000 0000 0000 0000 0000 000, BIC FICTFRPP.",
      lien: urlDuSite("/mon-compte/commandes"),
      libelleLien: "Voir ma commande",
    }),
};
