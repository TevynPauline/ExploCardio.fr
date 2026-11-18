// Contrat du connecteur « stockage » (F26, specs/026-branchement-scaleway/contracts/stockage.md) :
// fichiers déposés par l'équipe au back-office (images, documents PDF, vidéos d'aide).
// Démonstration : base du site (table fichier_stocke). Réel : compartiment Scaleway privé.
// Les erreurs sont les mêmes dans les deux modes : NotFound, OperationRefusee (chemin ou plage),
// ServiceUnavailable, ConfigurationIncomplete.

/** Plage d'octets, bornes incluses (0 ≤ debut ≤ fin ≤ taille - 1). */
export type Plage = { debut: number; fin: number };

export type LectureFichier = {
  /** Taille totale du fichier, en octets. */
  taille: number;
  /** Plage effectivement servie, ou `null` pour le fichier entier. */
  plage: Plage | null;
  /** Contenu lu en flux : une vidéo n'est jamais chargée en entier en mémoire en mode réel. */
  corps: ReadableStream<Uint8Array>;
};

export interface ConnecteurStockage {
  /** Range un fichier sous son chemin public (« /stockage/<dossier>/<nom>.<ext> »). */
  deposer(chemin: string, type: string, octets: Uint8Array): Promise<void>;
  /** Lit un fichier entier, ou une plage ; NotFound s'il n'existe pas. */
  lire(chemin: string, plage?: Plage): Promise<LectureFichier>;
  /** Présence d'un fichier, avec sa taille et son empreinte MD5 (hexadécimale) si connue. */
  existe(chemin: string): Promise<{ taille: number; md5: string | null } | null>;
}
