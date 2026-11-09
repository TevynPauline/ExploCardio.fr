// Textes des six cartes « Pourquoi choisir ExploCardio.fr ? » (F23, FR-008, FR-011), repris du
// verso du flyer ; cartes 3 et 4 en version prudente, en attendant la confirmation de Régis.
// Module sans accès à la base, partagé par la page, le back-office et les tests.

export type Raison = { titre: string; phrase: string };

export const CLES_RAISONS = ["raison-1", "raison-2", "raison-3", "raison-4", "raison-5", "raison-6"] as const;

export const RAISONS_DEFAUT: readonly Raison[] = [
  { titre: "Une offre de produits et de services", phrase: "Pensée pour l’exercice de la cardiologie libérale." },
  { titre: "Achetez, louez, financez", phrase: "En quelques clics et en toute liberté." },
  { titre: "L’assistance sans contrat", phrase: "Vos achats de consommables vous ouvrent l’accès à une assistance dédiée." },
  { titre: "Une fidélité récompensée", phrase: "Vos achats vous rapportent des points, à convertir en services ou en bons d’achat." },
  { titre: "Dépannage express", phrase: "Mise à disposition rapide de matériel ou de licence, sans engagement." },
  { titre: "Des interlocuteurs experts", phrase: "Des spécialistes réactifs, qui connaissent votre matériel et les contraintes de votre exercice." },
];

export const LONGUEURS_RAISONS = { titre: 50, phrase: 160 } as const;

export function textesRaisons(lignes: { cle: string | null; titre: string; corps: string }[]): Raison[] {
  return CLES_RAISONS.map((cle, i) => {
    const l = lignes.find((x) => x.cle === cle);
    return { titre: l?.titre.trim() || RAISONS_DEFAUT[i]!.titre, phrase: l?.corps.trim() || RAISONS_DEFAUT[i]!.phrase };
  });
}
