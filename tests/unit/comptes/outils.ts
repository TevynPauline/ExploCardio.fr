import { randomInt } from "node:crypto";
import type { SaisieInscription } from "@/domaine/comptes/inscription";

/** RPPS fictif (plage 99…) unique pour un test. */
export function rppsDeTest(): string {
  return `99${String(randomInt(0, 1e9)).padStart(9, "0")}`;
}

/** Saisie d'inscription de test (F16 : sans RPPS ; numéro d'entreprise facultatif). */
export function saisieDeTest(surcharge: Partial<SaisieInscription> = {}): SaisieInscription {
  const rpps = rppsDeTest();
  return {
    civilite: "Dr",
    prenom: "Camille",
    nom: "Testeur",
    specialite: "Cardiologie",
    numero: "",
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

/** SIREN fictif valide (clé de Luhn), unique pour un test (F16). */
export function sirenDeTest(): string {
  const base = String(randomInt(10_000_000, 99_999_999));
  for (let cle = 0; cle < 10; cle++) {
    const n = `${base}${cle}`;
    let somme = 0;
    for (let i = 0; i < 9; i++) {
      let c = Number(n[8 - i]);
      if (i % 2 === 1) {
        c *= 2;
        if (c > 9) c -= 9;
      }
      somme += c;
    }
    if (somme % 10 === 0) return n;
  }
  throw new Error("SIREN de test impossible");
}
