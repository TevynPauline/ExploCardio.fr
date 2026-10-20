import { betterAuth } from "better-auth";
import { demanderEnvoi } from "@/domaine/emailing/envoi";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { dbSite } from "@/lib/db/site";
import { emailConfirmationAdresse, emailReinitialisationMotDePasse } from "@/emails/modeles";
import { emailsComptes } from "@/emails/modeles-comptes";
import { MESSAGE_MOT_DE_PASSE, motDePasseConforme } from "@/domaine/comptes/motdepasse";
import { compterEchec, estBloque, journaliserSecurite, notifier, reussiteConnexion } from "@/domaine/comptes/securite";
import { COOKIE_PANIER, fusionnerPaniers } from "@/domaine/catalogue/panier";

// Authentification (R7) : email et mot de passe, réinitialisation, double authentification par
// application avec codes de secours. Elle est OBLIGATOIRE pour les rôles d'équipe (admin,
// commercial, support) : src/lib/roles.ts bloque l'accès tant qu'elle n'est pas activée.
// Les emails partent par le connecteur emailing (boîte de démonstration en phase 1).

export const ROLES_EQUIPE = ["admin", "commercial", "support"] as const;

/** Message unique d'échec de connexion : ne révèle jamais si l'email existe (FR-031). */
export const MESSAGE_ECHEC_CONNEXION = "Email ou mot de passe incorrect.";

const CHEMINS_MOT_DE_PASSE = ["/sign-up/email", "/reset-password", "/change-password"];
const CHEMINS_SESSION = ["/change-password", "/two-factor/verify-totp", "/two-factor/disable"];

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
      civilite: { type: "string", required: false },
      telephone: { type: "string", required: false },
      specialite: { type: "string", required: false },
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
    // F02 : un client se connecte seulement après avoir confirmé son email.
    requireEmailVerification: true,
    async onPasswordReset({ user }) {
      await journaliserSecurite("mot_de_passe_modifie", user.id, { origine: "réinitialisation" });
      await notifier(user.email, await emailsComptes.motDePasseModifie(), "mot de passe réinitialisé");
    },
    async sendResetPassword({ user, url }) {
      const email = await emailReinitialisationMotDePasse(url);
      await demanderEnvoi({ modele: email.modele, destinataire: user.email, rendu: email, declencheur: "réinitialisation du mot de passe", cle: `reinitialisation:${user.id}:${url.slice(-24)}` });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 24 * 60 * 60,
    async afterEmailVerification(user) {
      const { confirmerEmail } = await import("@/domaine/comptes/inscription");
      await confirmerEmail(user.id);
    },
    async sendVerificationEmail({ user, url }) {
      const email = await emailConfirmationAdresse(url);
      await demanderEnvoi({ modele: email.modele, destinataire: user.email, rendu: email, declencheur: "confirmation de l'adresse", cle: `confirmation:${user.id}:${url.slice(-24)}` });
    },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  hooks: {
    // Règles du mot de passe (D1) et blocage temporaire après échecs répétés (D2).
    before: createAuthMiddleware(async (ctx) => {
      const corps = (ctx.body ?? {}) as { password?: string; newPassword?: string; email?: string };
      if (CHEMINS_MOT_DE_PASSE.includes(ctx.path)) {
        const mdp = corps.newPassword ?? corps.password ?? "";
        if (!motDePasseConforme(mdp)) throw new APIError("BAD_REQUEST", { message: MESSAGE_MOT_DE_PASSE });
      }
      if (ctx.path === "/sign-in/email" && corps.email && (await estBloque(corps.email))) {
        throw new APIError("UNAUTHORIZED", { message: MESSAGE_ECHEC_CONNEXION });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const reussi = !(ctx.context.returned instanceof APIError);
      // Certaines routes (vérification du code TOTP) ne placent pas la session dans le contexte :
      // on la relit depuis la requête pour les changements faits depuis « Mon compte ».
      const session =
        ctx.context.session ??
        (reussi && CHEMINS_SESSION.includes(ctx.path) ? await getSessionFromCtx(ctx).catch(() => null) : null);
      // Changements sensibles faits depuis « Mon compte » : journal et email (FR-034, FR-035).
      if (reussi && session && ctx.path === "/change-password") {
        await journaliserSecurite("mot_de_passe_modifie", session.user.id, { origine: "mon compte" });
        await notifier(session.user.email, await emailsComptes.motDePasseModifie(), "mot de passe modifié");
      }
      if (reussi && session && ctx.path === "/two-factor/verify-totp") {
        // Avec une session ouverte, c'est la confirmation d'une activation (pas une connexion).
        await journaliserSecurite("double_authentification_activee", session.user.id);
        await notifier(session.user.email, await emailsComptes.doubleAuthentification(true), "double authentification activée");
      }
      if (reussi && session && ctx.path === "/two-factor/disable") {
        await journaliserSecurite("double_authentification_desactivee", session.user.id);
        await notifier(session.user.email, await emailsComptes.doubleAuthentification(false), "double authentification désactivée");
      }
      // Connexion réussie (mot de passe, ou code de double authentification) : le panier du
      // visiteur rejoint celui du compte (F04, FR-005).
      const ouverte = ctx.context.newSession;
      if (reussi && ouverte && ["/sign-in/email", "/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(ctx.path)) {
        await fusionnerPanierALaConnexion(ctx.headers?.get("cookie") ?? null, ouverte.user.id);
      }
      if (ctx.path !== "/sign-in/email") return;
      const email = ((ctx.body ?? {}) as { email?: string }).email;
      if (!email) return;
      const retour = ctx.context.returned;
      if (retour instanceof APIError) {
        if (retour.status === "UNAUTHORIZED") {
          const { bloque, utilisateur } = await compterEchec(email);
          if (bloque && utilisateur) await notifier(utilisateur.email, await emailsComptes.compteBloque(), "compte bloqué");
        }
        return;
      }
      const nouvelle = ctx.context.newSession;
      if (nouvelle) await reussiteConnexion(email, nouvelle.user.id);
    }),
  },
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

/** Fusion du panier du visiteur (cookie) dans celui du compte client qui se connecte. */
async function fusionnerPanierALaConnexion(cookies: string | null, utilisateurId: string) {
  const jeton = cookies
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE_PANIER}=`))
    ?.slice(COOKIE_PANIER.length + 1);
  if (!jeton) return;
  const compte = await dbSite().compteClient.findUnique({ where: { utilisateurId }, select: { id: true } });
  if (compte) await fusionnerPaniers(decodeURIComponent(jeton), compte.id);
}

export type SessionAuth = typeof auth.$Infer.Session;
