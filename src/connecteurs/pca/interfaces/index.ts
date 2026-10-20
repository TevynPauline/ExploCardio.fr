import type { Cle, MarqueFictive } from "../../types";

// Contrat du connecteur PCA, plateforme Cloud HDS (contracts/pca.md).
// Seules l'identité professionnelle, l'email, le RPPS ou SIRET, le cabinet et les logiciels
// sont transmis : aucune donnée de patient, aucun mot de passe.

export type EtatAcces = "a_ouvrir" | "a_fermer" | "actif" | "grace" | "suspendu" | "ferme";

export type Medecin = {
  partenaireRef: string;
  nom: string;
  email: string;
  rpps?: string;
  siret?: string;
  cabinet?: string;
};

export type DroitCloud = MarqueFictive & {
  ref: string;
  partenaireRef: string;
  logiciel: string;
  etat: EtatAcces;
  debut: Date;
  finPrevue: Date | null;
};

export interface ConnecteurPca {
  /** Renvoie `actif`, ou `a_ouvrir` en sous-mode manuel (et `a_fermer` pour une fermeture). */
  ouvrirDroit(
    demande: { medecin: Medecin; logiciel: string; debut: Date; finPrevue: Date | null },
    cle: Cle,
  ): Promise<{ ref: string; etat: EtatAcces }>;
  passerEnGrace(ref: string, date: Date): Promise<{ etat: EtatAcces }>;
  suspendre(ref: string, motif: string): Promise<{ etat: EtatAcces }>;
  retablir(ref: string): Promise<{ etat: EtatAcces }>;
  fermer(ref: string, date: Date): Promise<{ etat: EtatAcces }>;
  /** F12 : repousse (ou efface) la fin prévue d'un droit actif ; annule un délai de grâce. */
  prolonger(ref: string, finPrevue: Date | null): Promise<{ etat: EtatAcces }>;
  /** F12 : compte du médecin sur la plateforme (un seul par médecin, FR-003). */
  lireCompte(partenaireRef: string): Promise<{ ref: string; etat: string } | null>;
  /** F12 : email ou cabinet modifiés sur le site ; l'identifiant de connexion n'est pas cassé. */
  mettreAJourMedecin(medecin: Medecin): Promise<void>;
  /** Sous-mode manuel : l'équipe confirme la tâche, le droit passe à son état final. */
  confirmerTache(ref: string): Promise<{ etat: EtatAcces }>;
  lireDroits(partenaireRef: string): Promise<DroitCloud[]>;
}
