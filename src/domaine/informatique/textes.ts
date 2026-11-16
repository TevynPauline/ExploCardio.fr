// Textes de la page « Informatique médicale » (F27, FR-017 à FR-024) : valeurs de départ reprises
// de la maquette validée le 2026-11-16, modifiables au back-office (contenus de type « argument »,
// clés `informatique.*`). Module sans accès à la base, partagé par la page, le back-office et
// les tests. Aucune promesse chiffrée reprise du site du partenaire (FR-024).

export type TexteIM = { titre: string; corps: string };

export const TEXTES_IM_DEFAUT = {
  "informatique.entete": {
    titre: "Votre cabinet accessible partout, en toute sécurité",
    corps: "Consultez vos Holter, MAPA et épreuves d’effort depuis votre domicile ou en congés, sans changer vos logiciels. Avec PCA, notre partenaire certifié HDS.",
  },
  "informatique.benefice-1": { titre: "Vos examens, où que vous soyez", corps: "Relisez un Holter depuis chez vous comme si vous étiez au cabinet." },
  "informatique.benefice-2": { titre: "Des postes synchronisés", corps: "Votre secrétariat continue de travailler pendant que vous consultez." },
  "informatique.benefice-3": { titre: "Des données protégées", corps: "Hébergement certifié HDS, sans changer vos logiciels ni vos habitudes." },
  "informatique.etape-1": { titre: "Vous décrivez votre besoin", corps: "Un questionnaire de 2 minutes, sans engagement." },
  "informatique.etape-2": { titre: "On vous appelle", corps: "Nous précisons avec vous votre cabinet et vos logiciels." },
  "informatique.etape-3": { titre: "Démonstration", corps: "Notre partenaire vous montre PCA sur votre propre cas." },
  "informatique.hebergement": {
    titre: "Nous sommes fiers de vous présenter notre partenariat avec PCA",
    corps: "Vos examens et vos logiciels sont hébergés chez un hébergeur certifié HDS. Les données de vos patients ne transitent jamais par ExploCardio.fr.",
  },
  "informatique.prestataire": {
    titre: "Besoin d’un prestataire informatique pour votre cabinet ?",
    corps: "Ordinateurs, écrans, réseau, sauvegardes, dépannage : notre partenaire 2i équipe et accompagne les cabinets médicaux.",
  },
  "informatique.partenaire": { titre: "Patient Care Anywhere®, par Indoor Informatique (2i)", corps: "Solution certifiée HDS, partenaire du CNCF." },
} as const satisfies Record<string, TexteIM>;

export type CleTexteIM = keyof typeof TEXTES_IM_DEFAUT;
export const CLES_TEXTES_IM = Object.keys(TEXTES_IM_DEFAUT) as CleTexteIM[];

/** Mentions de conformité affichées (à valider par Régis avant la mise en ligne, FR-024). */
export const MENTIONS_ENTETE = ["Hébergement certifié HDS", "Conforme RGPD", "Vos logiciels actuels"] as const;
export const MENTIONS_HEBERGEMENT = ["Certifié HDS", "ISO 27001", "Conforme RGPD", "Partenaire CNCF"] as const;
export const POINTS_PRESTATAIRE = ["Postes et écrans", "Réseau du cabinet", "Sauvegardes", "Support à distance"] as const;

export const LONGUEURS_IM = { titre: 90, corps: 300 } as const;

export type TextesIM = Record<CleTexteIM, TexteIM>;

/** Textes enregistrés, avec repli sur les valeurs de départ pour tout texte vide ou absent. */
export function textesInformatique(lignes: { cle: string | null; titre: string; corps: string }[]): TextesIM {
  return Object.fromEntries(
    CLES_TEXTES_IM.map((cle) => {
      const l = lignes.find((x) => x.cle === cle);
      const d = TEXTES_IM_DEFAUT[cle];
      return [cle, { titre: l?.titre.trim() || d.titre, corps: l?.corps.trim() || d.corps }];
    }),
  ) as TextesIM;
}
