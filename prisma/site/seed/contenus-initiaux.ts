import type { PrismaClient } from "@generated/site/client";
import { ARGUMENTS_ANIMATION, TEXTES_ANIMATION_DEFAUT } from "@/domaine/textes-animation";
import { CLES_RAISONS, RAISONS_DEFAUT } from "@/domaine/textes-raisons";

// Contenus initiaux de F01 (T005) : réels dès la phase 1, modifiables dans le back-office et
// CONSERVÉS à la réinitialisation de la démonstration — ils ne sont créés que s'ils manquent.

export const TUILES_INITIALES = [
  { titre: "Holter ECG", corps: "Enregistreurs et analyse, à l'achat ou au mois.", lien: "/holter-ecg", fond: "pale", badge: null },
  { titre: "Holter tensionnel", corps: "MAPA, brassards et accessoires compatibles.", lien: "/holter-tensionnel", fond: "blue-soft", badge: null },
  { titre: "Épreuve d'effort", corps: "ECG d'effort, ergomètres et divans d'écho d'effort.", lien: "/epreuve-effort", fond: "lin", badge: null },
] as const;

/** F23 (FR-006, D7) : seules les trois gammes phares restent ; les autres tuiles sont supprimées. */
export const LIENS_GAMMES_PHARES = TUILES_INITIALES.map((t) => t.lien);

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

export const MOTIFS_INITIAUX = ["Information produit", "Mise à disposition", "Financement", "Assistance", "Commande hors métropole", "Autre"];

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
  "financement.mention": "Mensualités à titre indicatif, et sous réserve d'acceptation par notre partenaire financier.",
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
  // F09 : horaires de réponse de la ligne WhatsApp (jours 1 = lundi à 7 = dimanche) et
  // fermetures exceptionnelles [{ du, au, motif }] ; jours fériés calculés (D1).
  "contact.horaires": '{"1":[["09:00","18:00"]],"2":[["09:00","18:00"]],"3":[["09:00","18:00"]],"4":[["09:00","18:00"]],"5":[["09:00","18:00"]],"6":[],"7":[]}',
  "contact.fermetures": "[]",
  // F12 : adresse de la plateforme (page simulée en démonstration, D6), délai de grâce et
  // rappels (D1), aide à la première connexion en attendant le centre d'aide de F09.
  "cloud.url_plateforme": "/demo/plateforme-cloud",
  "cloud.delai_grace_jours": "30",
  "cloud.rappel_periode_jours": "30",
  "cloud.rappel_fin_jours": "7",
  // F14 : rubrique du site de chaque catégorie Odoo (utilisé en mode réel seulement).
  "catalogue.correspondance_categories": '{"Holter ECG":"holter-ecg","MAPA":"mapa","ERGOS":"effort","Consommables":"accessoires"}',
  "cloud.aide_premiere_connexion":
    "Votre accès est ouvert : utilisez le lien « Accéder à la plateforme ». Lors de votre première connexion, la plateforme vous envoie une invitation par email pour créer votre mot de passe ; ExploCardio.fr ne le connaît jamais. Besoin d'aide pour le paramétrage ? Écrivez-nous sur WhatsApp.",
};

// F16 : vignettes de départ du carrousel (l'équipe les remplace au back-office).
export const VIGNETTES_INITIALES = [
  {
    cle: "offre-bienvenue",
    titre: "Un tensiomètre offert",
    corps: "Créez votre compte professionnel : un tensiomètre électronique vous est offert avec votre première commande.",
    lien: "/inscription",
    libelleLien: "Créer mon compte",
    fond: "lin",
  },
  {
    cle: null,
    titre: "Vos consommables Holter",
    corps: "Électrodes, piles, sacoches : tout pour vos enregistrements, au prix HT affiché.",
    lien: "/accessoires-consommables",
    libelleLien: "Voir les consommables",
    fond: "blue-soft",
  },
  {
    cle: null,
    titre: "Holter ECG DMS 300-4L",
    corps: "L'enregistreur Holter ECG à l'achat, en financement ou au mois, sans engagement.",
    lien: "/holter-ecg/dms-300-4l",
    libelleLien: "Découvrir",
    fond: "pale",
  },
];

// F20 : textes de l'animation « Les trois temps » de l'accueil (type « argument », qui portait
// auparavant les arguments de « Pourquoi préférer ExploCardio.fr », retirés de l'accueil). Les
// valeurs de départ viennent de src/domaine/textes-animation.ts.
export const ANIMATION_INITIALE = [
  { cle: "accroche", titre: TEXTES_ANIMATION_DEFAUT.accroche, corps: "" },
  ...TEXTES_ANIMATION_DEFAUT.mots.map((titre, i) => ({ cle: `mot-${i + 1}`, titre, corps: "" })),
  ...ARGUMENTS_ANIMATION.map((a, i) => ({ cle: a.cle, titre: TEXTES_ANIMATION_DEFAUT.arguments[i]!, corps: "" })),
];

/**
 * Clés des anciens arguments (F16), plus affichés ni modifiables depuis F20, et des arguments
 * des versions intermédiaires de F20 (argument-1 à argument-6), remplacés par argument-a à -e.
 */
export const CLES_ARGUMENTS_RETIRES = ["intro", "1", "2", "3", "4", ...["1", "2", "3", "4", "5", "6"].map((n) => `argument-${n}`)];

/**
 * Textes de départ remplacés pendant la mise au point de F20 (2026-11-09) : mis à jour s'ils
 * n'ont pas été modifiés au back-office.
 */
export const ANCIENS_TEXTES_ANIMATION: Record<string, string> = {
  accroche: "Tout ce qu'il vous faut, au même endroit.",
  "mot-1": "Spécialiste",
  "mot-2": "Rapide",
  "mot-3": "Complet",
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
  await db.contenu.deleteMany({ where: { type: "tuile", NOT: { lien: { in: [...LIENS_GAMMES_PHARES] } } } });
  if ((await db.marque.count()) === 0) {
    await db.marque.createMany({ data: MARQUES_INITIALES.map((m, i) => ({ ...m, ordre: i + 1 })) });
  }
  if ((await db.contenu.count({ where: { type: "vignette" } })) === 0) {
    await db.contenu.createMany({
      data: VIGNETTES_INITIALES.map((v, i) => ({ type: "vignette" as const, ...v, ordre: i + 1, etat: "publie" as const })),
    });
  }
  await db.contenu.deleteMany({ where: { type: "argument", cle: { in: CLES_ARGUMENTS_RETIRES } } });
  for (const [i, a] of ANIMATION_INITIALE.entries()) {
    await db.contenu.upsert({
      where: { type_cle: { type: "argument", cle: a.cle } },
      create: { type: "argument", cle: a.cle, titre: a.titre, corps: a.corps, ordre: i, etat: "publie" },
      update: {},
    });
  }
  // F23 (D8) : textes de départ des six cartes « Pourquoi choisir ExploCardio.fr ? ».
  for (const [i, cle] of CLES_RAISONS.entries()) {
    const r = RAISONS_DEFAUT[i]!;
    await db.contenu.upsert({
      where: { type_cle: { type: "argument", cle } },
      create: { type: "argument", cle, titre: r.titre, corps: r.phrase, ordre: 100 + i, etat: "publie" },
      update: {},
    });
  }
  for (const [cle, ancien] of Object.entries(ANCIENS_TEXTES_ANIMATION)) {
    const nouveau = ANIMATION_INITIALE.find((a) => a.cle === cle)!.titre;
    await db.contenu.updateMany({ where: { type: "argument", cle, titre: ancien }, data: { titre: nouveau } });
  }
  for (const [cle, valeur] of Object.entries(PARAMETRES_INITIAUX)) {
    await db.parametre.upsert({ where: { cle }, create: { cle, valeur }, update: {} });
  }
  // Valeurs par défaut remplacées : mises à jour seulement si elles n'ont pas été modifiées
  // dans le back-office.
  for (const [cle, ancienne] of Object.entries(ANCIENNES_VALEURS_PAR_DEFAUT)) {
    await db.parametre.updateMany({ where: { cle, valeur: ancienne }, data: { valeur: PARAMETRES_INITIAUX[cle] } });
  }
}

const ANCIENNES_VALEURS_PAR_DEFAUT: Record<string, string> = {
  // 2026-11-04 : formulation validée par Régis.
  "financement.mention": "Montant indicatif, sous réserve d'acceptation par notre partenaire financier.",
};
