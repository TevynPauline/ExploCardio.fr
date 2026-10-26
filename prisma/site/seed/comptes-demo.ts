import { randomBytes, randomUUID } from "node:crypto";
import { createOTP } from "@better-auth/utils/otp";
import { symmetricEncrypt } from "better-auth/crypto";
import type { PrismaClient } from "@generated/site/client";
import { auth } from "@/lib/auth";
import { DOMAINE_EMAILS_DEMO } from "@/connecteurs/garde-donnees-fictives";

// Les cinq comptes de démonstration (T044, FR-041), dans la base du site, rattachés aux
// partenaires fictifs. Ils sont recréés à chaque remplissage et à chaque réinitialisation.
// Mots de passe et secret de double authentification : lus dans .env.local (DEMO_ACCOUNTS_PASSWORD,
// DEMO_TOTP_SECRET) pour rester stables d'une réinitialisation à l'autre ; générés et affichés
// sinon. Jamais versionnés.

export type CompteDemo = {
  email: string;
  /** RPPS fictif (plage 99…), identique à celui du partenaire de démonstration. */
  rpps?: string;
  /** État du cadeau de bienvenue à recréer (F02). */
  cadeau?: "remis" | "droit_ouvert";
  role: "client" | "admin" | "support";
  cas: string;
  partenaireRef: string | null;
  statut: "valide" | "en_attente" | null;
  nom: string;
};

export const COMPTES_DEMO: CompteDemo[] = [
  { email: `client.droits${DOMAINE_EMAILS_DEMO}`, role: "client", statut: "valide", partenaireRef: "FICT-P-00001", nom: "Dr Claire Valdrin", rpps: "99000000101", cadeau: "remis",
    cas: "Client aux droits d'assistance actifs, avec commandes, location en cours, abonnement logiciel et bons d'achat" },
  { email: `client.sans-droits${DOMAINE_EMAILS_DEMO}`, role: "client", statut: "valide", partenaireRef: "FICT-P-00002", nom: "Dr Marc Loubrac", rpps: "99000000102", cadeau: "droit_ouvert",
    cas: "Client sans droits d'assistance (droits expirés), demande de financement en cours" },
  { email: `attente${DOMAINE_EMAILS_DEMO}`, role: "client", statut: "en_attente", partenaireRef: null, nom: "Dr Romain Esquelbec", rpps: "99000000199",
    cas: "Compte en attente de validation : consulte, ne peut pas commander" },
  { email: `admin${DOMAINE_EMAILS_DEMO}`, role: "admin", statut: null, partenaireRef: null, nom: "Administrateur de démonstration",
    cas: "Toutes les fonctions du back-office et les outils de démonstration" },
  { email: `support${DOMAINE_EMAILS_DEMO}`, role: "support", statut: null, partenaireRef: null, nom: "Support de démonstration",
    cas: "Consultation des clients, de leurs droits et des accès Cloud" },
];

export type IdentifiantsDemo = {
  motDePasse: string;
  motDePasseGenere: boolean;
  totpSecret: string;
  totpGenere: boolean;
  totpUri: string;
  codesSecours: string[];
};

/** Supprime les comptes de démonstration et les comptes clients créés pendant les séances. */
export async function supprimerComptesDeSeance(db: PrismaClient) {
  // Données de F02 liées aux comptes de séance (le numéro du cadeau survit au compte).
  await db.attributionCadeau.deleteMany({});
  await db.echecConnexion.deleteMany({});
  await db.demandeRgpd.deleteMany({});
  await db.consentement.deleteMany({ where: { OR: [{ email: { endsWith: DOMAINE_EMAILS_DEMO } }, { compteId: { not: null } }] } });
  const demo = await db.utilisateur.deleteMany({ where: { email: { endsWith: DOMAINE_EMAILS_DEMO } } });
  // Comptes clients créés pendant les séances (A1) : rôle client uniquement. Les comptes de
  // l'équipe (admin, commercial, support) créés dans le back-office sont toujours conservés.
  const clients = await db.utilisateur.deleteMany({ where: { role: "client" } });
  return demo.count + clients.count;
}

export async function creerComptesDemo(db: PrismaClient): Promise<IdentifiantsDemo> {
  const ctx = await auth.$context;
  const motDePasse = process.env.DEMO_ACCOUNTS_PASSWORD || randomBytes(12).toString("base64url");
  const totpSecret = process.env.DEMO_TOTP_SECRET || randomBytes(20).toString("hex");
  const hache = await ctx.password.hash(motDePasse);
  const secretChiffre = await symmetricEncrypt({ key: ctx.secretConfig, data: totpSecret });
  const codesSecours = Array.from({ length: 10 }, () => {
    const c = randomBytes(5).toString("hex");
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  });
  const codesChiffres = await symmetricEncrypt({ key: ctx.secretConfig, data: JSON.stringify(codesSecours) });

  for (const c of COMPTES_DEMO) {
    const id = randomUUID();
    const equipe = c.role !== "client";
    await db.utilisateur.create({
      data: {
        id,
        name: c.nom,
        email: c.email,
        emailVerified: true,
        role: c.role,
        twoFactorEnabled: equipe,
        comptes: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hache } },
        ...(equipe
          ? { doubleAuth: { create: { id: randomUUID(), secret: secretChiffre, backupCodes: codesChiffres, verified: true } } }
          : {}),
        ...(c.statut
          ? {
              compteClient: {
                create: {
                  type: "medecin",
                  rpps: c.rpps ?? null,
                  valideLe: c.statut === "valide" ? new Date() : null,
                  // F16 : numéro des comptes validés de démonstration déjà vérifié par l'équipe.
                  ...(c.statut === "valide" ? { numeroVerification: "verifie" as const, numeroVerifieLe: new Date(), numeroVerifiePar: "démonstration" } : {}),
                  statut: c.statut,
                  odooPartnerRef: c.partenaireRef,
                  nomCabinet: c.nom,
                  estDemonstration: true,
                },
              },
            }
          : {}),
      },
    });
  }
  // Abonnement à la newsletter et cadeau de bienvenue des comptes clients de démonstration (F02).
  for (const c of COMPTES_DEMO.filter((x) => x.cadeau && x.rpps)) {
    const compte = await db.compteClient.findFirstOrThrow({ where: { rpps: c.rpps } });
    await db.consentement.create({
      data: { compteId: compte.id, email: c.email, objet: "newsletter", etat: true, origine: "inscription", textePresente: "Consentement de démonstration" },
    });
    await db.attributionCadeau.create({
      data: { numero: c.rpps!, compteId: compte.id, etat: c.cadeau!, remisLe: c.cadeau === "remis" ? new Date() : null },
    });
  }

  const totpUri = createOTP(totpSecret).url("ExploCardio.fr (démo)", "equipe-demo");
  return {
    motDePasse,
    motDePasseGenere: !process.env.DEMO_ACCOUNTS_PASSWORD,
    totpSecret,
    totpGenere: !process.env.DEMO_TOTP_SECRET,
    totpUri,
    codesSecours,
  };
}
