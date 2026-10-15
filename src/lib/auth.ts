import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { registre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";
import { emailConfirmationAdresse, emailReinitialisationMotDePasse } from "@/emails/modeles";

// Authentification (R7) : email et mot de passe, réinitialisation, double authentification par
// application avec codes de secours. Elle est OBLIGATOIRE pour les rôles d'équipe (admin,
// commercial, support) : src/lib/roles.ts bloque l'accès tant qu'elle n'est pas activée.
// Les emails partent par le connecteur emailing (boîte de démonstration en phase 1).

export const ROLES_EQUIPE = ["admin", "commercial", "support"] as const;

export const auth = betterAuth({
  appName: "ExploCardio.fr",
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.SITE_URL,
  database: prismaAdapter(dbSite(), { provider: "postgresql" }),
  user: {
    modelName: "utilisateur",
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "client", input: false },
      prenom: { type: "string", required: false },
      nom: { type: "string", required: false },
    },
  },
  session: {
    modelName: "session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "compteConnexion" },
  verification: { modelName: "verification" },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user, url }) {
      const email = await emailReinitialisationMotDePasse(url);
      await registre.emailing().envoyerTransactionnel(
        { ...email, destinataire: user.email, declencheur: "réinitialisation du mot de passe" },
        `reinitialisation:${user.id}:${url.slice(-24)}`,
      );
    },
  },
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      const email = await emailConfirmationAdresse(url);
      await registre.emailing().envoyerTransactionnel(
        { ...email, destinataire: user.email, declencheur: "confirmation de l'adresse" },
        `confirmation:${user.id}:${url.slice(-24)}`,
      );
    },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  plugins: [
    twoFactor({
      issuer: "ExploCardio.fr",
      // Codes de secours chiffrés en base, comme le secret.
      backupCodeOptions: { storeBackupCodes: "encrypted" },
      schema: { twoFactor: { modelName: "doubleAuthentification" } },
    }),
    nextCookies(),
  ],
});

export type SessionAuth = typeof auth.$Infer.Session;
