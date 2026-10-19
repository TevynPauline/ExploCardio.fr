import { randomUUID } from "node:crypto";
import { Prisma } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { MESSAGE_HORS_METROPOLE, codePostalMetropole } from "./adresses";
import { MESSAGE_MOT_DE_PASSE, motDePasseConforme } from "./motdepasse";
import { normaliserNumero, rppsValide, siretValide } from "./numeros";

// Inscription et confirmation de l'email (F02, US1, R1).

export const MESSAGE_INSCRIPTION_IMPOSSIBLE =
  "Nous ne pouvons pas créer ce compte. Si vous avez déjà un compte, connectez-vous ou réinitialisez votre mot de passe ; sinon, contactez-nous.";

export const TEXTE_CGU_CGV =
  "J'ai lu et j'accepte les conditions générales d'utilisation et les conditions générales de vente d'ExploCardio.fr.";
export const TEXTE_NEWSLETTER_INSCRIPTION =
  "Je souhaite recevoir la newsletter d'ExploCardio.fr (nouveautés, offres). Je peux me désinscrire à tout moment.";

export type AdresseSaisie = { ligne1: string; ligne2?: string; codePostal: string; ville: string };

export type SaisieInscription = {
  civilite: string;
  prenom: string;
  nom: string;
  specialite: string;
  type: "medecin" | "structure";
  numero: string;
  cabinet: string;
  telephone: string;
  email: string;
  motDePasse: string;
  adresseCabinet: AdresseSaisie;
  adresseLivraison: AdresseSaisie | "cabinet";
  adresseFacturation: AdresseSaisie | "cabinet";
  cguCgv: boolean;
  newsletter: boolean;
};

export type ErreursInscription = Partial<Record<string, string>>;

export type ResultatInscription =
  | { ok: true; email: string }
  | { ok: false; erreurs: ErreursInscription; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validerAdresse(a: AdresseSaisie | "cabinet", prefixe: string, e: ErreursInscription, livraison = false) {
  if (a === "cabinet") return;
  if (a.ligne1.trim().length < 3) e[`${prefixe}.ligne1`] = "Indiquez l'adresse.";
  if (!/^\d{5}$/.test(a.codePostal.trim())) e[`${prefixe}.codePostal`] = "Le code postal comporte 5 chiffres.";
  else if (livraison && !codePostalMetropole(a.codePostal)) e[`${prefixe}.codePostal`] = MESSAGE_HORS_METROPOLE;
  if (a.ville.trim().length < 2) e[`${prefixe}.ville`] = "Indiquez la ville.";
}

export async function specialites(): Promise<string[]> {
  try {
    return JSON.parse((await lireParametre("comptes.specialites")) ?? "[]") as string[];
  } catch {
    return ["Autre"];
  }
}

export async function validerInscription(s: SaisieInscription): Promise<ErreursInscription> {
  const e: ErreursInscription = {};
  if (!["M.", "Mme", "Dr", "Pr"].includes(s.civilite)) e.civilite = "Choisissez une civilité.";
  if (s.prenom.trim().length < 1) e.prenom = "Indiquez votre prénom.";
  if (s.nom.trim().length < 1) e.nom = "Indiquez votre nom.";
  if (!(await specialites()).includes(s.specialite)) e.specialite = "Choisissez votre spécialité.";
  if (s.type === "medecin" && !rppsValide(s.numero)) e.numero = "Le numéro RPPS comporte 11 chiffres.";
  if (s.type === "structure" && !siretValide(s.numero)) e.numero = "Ce numéro SIRET n'est pas valide (14 chiffres).";
  if (s.cabinet.trim().length < 2) e.cabinet = "Indiquez le nom du cabinet ou de la structure.";
  if (!/^[+0-9 ().-]{6,20}$/.test(s.telephone.trim())) e.telephone = "Indiquez un numéro de téléphone valide.";
  if (!EMAIL.test(s.email.trim())) e.email = "Indiquez une adresse email valide.";
  if (!motDePasseConforme(s.motDePasse)) e.motDePasse = MESSAGE_MOT_DE_PASSE;
  validerAdresse(s.adresseCabinet, "adresseCabinet", e);
  validerAdresse(s.adresseLivraison === "cabinet" ? s.adresseCabinet : s.adresseLivraison, "adresseLivraison", e, true);
  validerAdresse(s.adresseFacturation, "adresseFacturation", e);
  if (!s.cguCgv) e.cguCgv = "Acceptez les CGU et les CGV pour créer votre compte.";
  return e;
}

async function signalerEquipe(objet: string, texte: string) {
  const destinataire = (await lireParametre("contact.destinataire_messages"))?.trim() || "admin@demo.explocardio.test";
  await registre.emailing().envoyerNotificationEquipe(
    { canal: "email", destinataires: [destinataire], objet, texte, declencheur: "comptes" },
    `comptes:${randomUUID()}`,
  );
}

/** Crée l'utilisateur, le compte (email à confirmer), les adresses et les consentements. */
export async function inscrire(s: SaisieInscription, retour: string | null = null): Promise<ResultatInscription> {
  const erreurs = await validerInscription(s);
  if (Object.keys(erreurs).length) return { ok: false, erreurs };

  const email = s.email.trim().toLowerCase();
  const numero = normaliserNumero(s.numero);

  // Doublons : message neutre, identique quel que soit le motif (FR-031, SC-012).
  if (await dbSite().utilisateur.findUnique({ where: { email } })) {
    return { ok: false, erreurs: {}, message: MESSAGE_INSCRIPTION_IMPOSSIBLE };
  }
  if (s.type === "medecin") {
    const existant = await dbSite().compteClient.findUnique({ where: { rpps: numero } });
    if (existant) {
      if (existant.statut === "refuse") {
        await signalerEquipe(
          "Réinscription d'un compte refusé",
          `Une nouvelle inscription a été tentée avec le RPPS ${numero}, déjà refusé. Elle n'a pas été créée.`,
        );
      }
      return { ok: false, erreurs: {}, message: MESSAGE_INSCRIPTION_IMPOSSIBLE };
    }
  }

  const reponse = await auth.api.signUpEmail({
    body: {
      callbackURL: retour ? `/inscription/email-confirme?retour=${encodeURIComponent(retour)}` : "/inscription/email-confirme",
      email,
      password: s.motDePasse,
      name: `${s.prenom.trim()} ${s.nom.trim()}`,
      prenom: s.prenom.trim(),
      nom: s.nom.trim(),
      civilite: s.civilite,
      telephone: s.telephone.trim(),
      specialite: s.specialite,
    },
  });
  const utilisateurId = reponse.user.id;

  const cabinet = { type: "cabinet" as const, ...nettoyer(s.adresseCabinet) };
  const livraison = { type: "livraison" as const, ...nettoyer(s.adresseLivraison === "cabinet" ? s.adresseCabinet : s.adresseLivraison) };
  const facturation = { type: "facturation" as const, ...nettoyer(s.adresseFacturation === "cabinet" ? s.adresseCabinet : s.adresseFacturation) };
  try {
    await dbSite().$transaction(async (tx) => {
      const compte = await tx.compteClient.create({
        data: {
          utilisateurId,
          type: s.type,
          rpps: s.type === "medecin" ? numero : null,
          siret: s.type === "structure" ? numero : null,
          nomCabinet: s.cabinet.trim(),
          statut: "email_a_confirmer",
          adresses: { create: [cabinet, livraison, facturation] },
        },
      });
      await tx.consentement.create({
        data: { compteId: compte.id, email, objet: "cgu_cgv", etat: true, origine: "inscription", textePresente: TEXTE_CGU_CGV },
      });
      if (s.newsletter) {
        await tx.consentement.create({
          data: { compteId: compte.id, email, objet: "newsletter", etat: true, origine: "inscription", textePresente: TEXTE_NEWSLETTER_INSCRIPTION },
        });
      }
    });
  } catch (e) {
    // Inscription simultanée avec le même RPPS : une seule aboutit (cas limite).
    await dbSite().utilisateur.delete({ where: { id: utilisateurId } }).catch(() => undefined);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, erreurs: {}, message: MESSAGE_INSCRIPTION_IMPOSSIBLE };
    }
    throw e;
  }
  return { ok: true, email };
}

function nettoyer(a: AdresseSaisie) {
  return { ligne1: a.ligne1.trim(), ligne2: a.ligne2?.trim() || null, codePostal: a.codePostal.trim(), ville: a.ville.trim() };
}

/**
 * Appelée par Better Auth après la confirmation de l'email (R1) : compte « en attente », ou
 * validé aussitôt en validation automatique ; abonnement à la newsletter transmis à l'outil
 * d'emailing (FR-028) ; équipe prévenue d'un nouveau compte à valider.
 */
export async function confirmerEmail(utilisateurId: string): Promise<void> {
  const compte = await dbSite().compteClient.findUnique({ where: { utilisateurId }, include: { utilisateur: true } });
  if (!compte || compte.statut !== "email_a_confirmer") return;
  const auto = (await lireParametre("comptes.validation_auto")) === "true";
  if (auto) {
    const { valider } = await import("./validation");
    await valider(compte.id, null);
  } else {
    await dbSite().compteClient.update({ where: { id: compte.id }, data: { statut: "en_attente" } });
    await signalerEquipe(
      "Nouveau compte à valider",
      `${compte.utilisateur.name} (${compte.nomCabinet ?? ""}, ${compte.rpps ?? compte.siret ?? ""}) a confirmé son email et attend la validation de son compte.`,
    );
  }
  const { synchroniserNewsletterDuCompte } = await import("./newsletter");
  await synchroniserNewsletterDuCompte(compte.id);
}

/** Supprime les comptes restés « email à confirmer » plus de 30 jours (le RPPS redevient libre). */
export async function purgerNonConfirmes(maintenant = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - 30 * 86_400_000);
  const anciens = await dbSite().compteClient.findMany({
    where: { statut: "email_a_confirmer", creeLe: { lt: limite } },
    select: { utilisateurId: true },
  });
  if (!anciens.length) return 0;
  const r = await dbSite().utilisateur.deleteMany({ where: { id: { in: anciens.map((a) => a.utilisateurId) } } });
  return r.count;
}
