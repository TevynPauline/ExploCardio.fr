import type { PrismaClient } from "@generated/site/client";

// Contenus initiaux de F01 (T005) : réels dès la phase 1, modifiables dans le back-office et
// CONSERVÉS à la réinitialisation de la démonstration — ils ne sont créés que s'ils manquent.

export const TUILES_INITIALES = [
  { titre: "Holter ECG", corps: "Enregistreurs et analyse, à l'achat ou au mois.", lien: "/holter-ecg", fond: "pale", badge: null },
  { titre: "Holter tensionnel", corps: "MAPA, brassards et accessoires compatibles.", lien: "/holter-tensionnel", fond: "blue-soft", badge: null },
  { titre: "Épreuve d'effort", corps: "ECG d'effort, ergomètres et divans d'écho d'effort.", lien: "/epreuve-effort", fond: "lin", badge: null },
  { titre: "Hébergement des données de santé", corps: "Vos logiciels sur une plateforme Cloud certifiée HDS.", lien: "/services/hebergement-donnees-sante", fond: "mint", badge: "En préparation" },
  { titre: "Assistance et service", corps: "Vos consommables ouvrent votre assistance.", lien: "/services/assistance", fond: "pale", badge: null },
  { titre: "Financement", corps: "Équipez-vous sans immobiliser votre trésorerie.", lien: "/financement", fond: "blue-soft", badge: null },
] as const;

export const MARQUES_INITIALES = [
  { nom: "DMS", familles: ["holter-ecg", "mapa", "effort"] },
  { nom: "SunTech", familles: ["mapa", "effort"] },
  { nom: "Microlife", familles: ["mapa"] },
  { nom: "IEM", familles: ["mapa"] },
  { nom: "Norav", familles: ["effort"] },
  { nom: "Ergoline", familles: ["effort"] },
  { nom: "RAM", familles: ["effort"] },
  { nom: "Koch Évolution", familles: ["effort"] },
];

export const MOTIFS_INITIAUX = ["Information produit", "Mise à disposition", "Financement", "Assistance", "Autre"];

export const PARAMETRES_INITIAUX: Record<string, string> = {
  "contact.email": "",
  "contact.telephone": "",
  "contact.adresse": "",
  "contact.destinataire_messages": "",
  "contact.motifs": JSON.stringify(MOTIFS_INITIAUX),
  "accueil.offre_bienvenue":
    "Un tensiomètre électronique offert avec votre première commande, pour toute inscription avec abonnement à la newsletter.",
  "accueil.engagements_reactivite": "",
  "accueil.badge_hebergement": "En préparation",
  "accueil.badge_logiciel_cloud": "En préparation",
  // F02 : validation manuelle par défaut, offre de bienvenue active, spécialités (D3)
  "comptes.validation_auto": "false",
  "bienvenue.active": "true",
  "comptes.specialites": JSON.stringify([
    "Cardiologie",
    "Médecine générale",
    "Médecine du sport",
    "Pneumologie",
    "Médecine vasculaire",
    "Autre",
  ]),
  // F03 : tarifs HT standard des pages services (vide = non affiché) et mention du financement (D6).
  // Le badge de la page hébergement est « accueil.badge_hebergement » (F01), une seule source.
  "services.hebergement.tarif": "",
  "services.assistance.tarif": "",
  "services.financement.tarif": "",
  "services.installation.tarif": "",
  "financement.mention": "Montant indicatif, sous réserve d'acceptation par notre partenaire financier.",
  // F04 : heure limite de l'express (D2) ; coordonnées du virement (D4, fictives en démonstration) ;
  // rappel avant la fin de la réservation d'une commande en virement (D5).
  "commande.heure_limite_express": "14:00",
  "virement.titulaire": "ExploCardio.fr (démonstration — coordonnées fictives)",
  "virement.iban": "FR76 0000 0000 0000 0000 0000 000",
  "virement.bic": "DEMOFRPPXXX",
  "virement.rappel_jours": "2",
  // F05 : jours non livrés (dates AAAA-MM-JJ, en plus des week-ends et jours fériés), zones
  // sans livraison au lendemain (préfixes de codes postaux) et leur délai (D3), rappels (D6),
  // conditions de location provisoires (D9).
  "livraison.jours_non_livres": "[]",
  "livraison.zones_sans_lendemain": '["20"]',
  "livraison.delai_zones_jours": "2",
  "location.rappel_echeance_jours": "3",
  "location.rappel_retour_jours": "2",
  "location.conditions":
    "Location mensuelle sans engagement, renouvelée chaque mois. Résiliable à tout moment depuis votre compte : la location prend fin au terme du mois payé. L'appareil est à retourner dans le délai indiqué, avec l'étiquette fournie. En cas de perte ou de non-retour, la valeur de remplacement indiquée est facturée ; une dégradation constatée au retour est facturée selon son coût. Texte provisoire de démonstration.",
  // F06 : bons d'achat au panier (D1) ; rappels avant la fin des droits et l'expiration des bons (D2).
  "fidelite.bons_au_panier": "true",
  "fidelite.rappel_droits_jours": "7",
  "fidelite.rappel_expiration_jours": "30",
  // F12 : adresse de la plateforme (page simulée en démonstration, D6), délai de grâce et
  // rappels (D1), aide à la première connexion en attendant le centre d'aide de F09.
  "cloud.url_plateforme": "/demo/plateforme-cloud",
  "cloud.delai_grace_jours": "30",
  "cloud.rappel_periode_jours": "30",
  "cloud.rappel_fin_jours": "7",
  "cloud.aide_premiere_connexion":
    "Votre accès est ouvert : utilisez le lien « Accéder à la plateforme ». Lors de votre première connexion, la plateforme vous envoie une invitation par email pour créer votre mot de passe ; ExploCardio.fr ne le connaît jamais. Besoin d'aide pour le paramétrage ? Écrivez-nous sur WhatsApp.",
};

export async function remplirContenusInitiaux(db: PrismaClient) {
  if ((await db.contenu.count({ where: { type: "tuile" } })) === 0) {
    await db.contenu.createMany({
      data: TUILES_INITIALES.map((t, i) => ({
        type: "tuile" as const,
        titre: t.titre,
        corps: t.corps,
        lien: t.lien,
        fond: t.fond,
        badge: t.badge,
        ordre: i + 1,
        etat: "publie" as const,
      })),
    });
  }
  if ((await db.marque.count()) === 0) {
    await db.marque.createMany({ data: MARQUES_INITIALES.map((m, i) => ({ ...m, ordre: i + 1 })) });
  }
  for (const [cle, valeur] of Object.entries(PARAMETRES_INITIAUX)) {
    await db.parametre.upsert({ where: { cle }, create: { cle, valeur }, update: {} });
  }
}
