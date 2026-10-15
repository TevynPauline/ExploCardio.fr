import { COMPTES_DEMO } from "../../site/seed/comptes-demo";
import type { BilanRemplissage } from "./remplissage";

/** Affiche le bilan et les identifiants des comptes de démonstration (FR-018). */
export function afficherBilan(titre: "Remplissage terminé" | "Réinitialisation terminée", b: BilanRemplissage) {
  const lignes = [
    "",
    `✔ ${titre} en ${(b.dureeMs / 1000).toFixed(1)} s`,
    `  ${b.modeles} modèles, ${b.variantes} variantes (prix inventés), ${b.partenaires} médecins et cabinets fictifs,`,
    `  ${b.commandes} commandes, ${b.locations} locations et abonnements, ${b.acces} accès Cloud.`,
    "",
    "Comptes de démonstration :",
    ...COMPTES_DEMO.map((c) => `  • ${c.email.padEnd(42)} ${c.role.padEnd(8)} ${c.cas}`),
    "",
    `  Mot de passe commun : ${b.identifiants.motDePasse}${b.identifiants.motDePasseGenere ? "   (généré : ajoutez DEMO_ACCOUNTS_PASSWORD à .env.local pour le garder)" : ""}`,
    `  Double authentification (administrateur et support) — clé à ajouter dans l'application :`,
    `    ${new URL(b.identifiants.totpUri).searchParams.get("secret")}${b.identifiants.totpGenere ? "   (générée : ajoutez DEMO_TOTP_SECRET à .env.local pour la garder)" : ""}`,
    `  Codes de secours : ${b.identifiants.codesSecours.slice(0, 3).join(", ")}…`,
  ];
  if (b.motDePasseSite) {
    lignes.push("", `  Mot de passe d'accès au site de démonstration : ${b.motDePasseSite}`);
  }
  console.log(lignes.join("\n"));
}
