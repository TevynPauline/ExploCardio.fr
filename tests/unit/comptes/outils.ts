import { randomInt } from "node:crypto";
import type { SaisieInscription } from "@/domaine/comptes/inscription";

/** RPPS fictif (plage 99…) unique pour un test. */
export function rppsDeTest(): string {
  return `99${String(randomInt(0, 1e9)).padStart(9, "0")}`;
}

export function saisieDeTest(surcharge: Partial<SaisieInscription> = {}): SaisieInscription {
  const rpps = rppsDeTest();
  return {
    civilite: "Dr",
    prenom: "Camille",
    nom: "Testeur",
    specialite: "Cardiologie",
    type: "medecin",
    numero: rpps,
    cabinet: "Cabinet de test",
    telephone: "+33 6 99 00 00 42",
    email: `inscription-${rpps}@demo.explocardio.test`,
    motDePasse: "Motdepasse-Test-2026!",
    adresseCabinet: { ligne1: "1 rue du Test", codePostal: "69003", ville: "Lyon" },
    adresseLivraison: "cabinet",
    adresseFacturation: "cabinet",
    cguCgv: true,
    newsletter: true,
    ...surcharge,
  };
}
