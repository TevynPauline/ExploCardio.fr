import { Prisma, type Envoi, type FamilleEmail, type ScenarioEmail } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { NotificationEquipe } from "@/connecteurs/emailing/interfaces";
import type { EmailRendu } from "@/emails/rendu";
import { dbSite } from "@/lib/db/site";
import { lireParametre, lireParametreEntier } from "@/lib/parametres";
import { entreeDuModele } from "./catalogue";
import { decider, PREFERENCES_PAR_DEFAUT, REGLES_PAR_DEFAUT, type Decision, type ReglesEnvoi } from "./decision";
import { lienDesinscriptionUnClic } from "./liens";
import { estAbonne, lirePreferences } from "./preferences";
import { objetToujoursValide, rendreEnvoi, VariableManquante } from "./rendus";

// Point d'envoi unique du site (F10, R1, R2, FR-002, FR-007, FR-034, FR-035) : chaque email
// devient une ligne `Envoi` (une par clé), décidée selon sa famille, envoyée par le connecteur
// emailing — seul module autorisé à l'appeler — et reprise après une panne, sans doublon.

export type DemandeEnvoi = {
  modele: string;
  destinataire?: string;
  compteId?: string;
  /** Variables des modèles rendus au moment de l'envoi (jamais de secret). */
  variables?: Record<string, unknown>;
  cle: string;
  declencheur: string;
  programmeLe?: Date;
  references?: string[];
  campagneId?: string;
  /** Rendu fait par l'appelant (transactionnels, liens secrets) : effacé après l'envoi. */
  rendu?: EmailRendu;
  /** Email de test envoyé à l'équipe (modèles, campagnes) : jamais filtré, jamais compté. */
  test?: boolean;
};

const MINUTE = 60_000;
const ATTENTES_MINUTES = [1, 2, 5, 10, 30, 60];

const ACTIVATION: Partial<Record<ScenarioEmail, string>> = {
  reapprovisionnement: "emailing.reappro.actif",
  panier_abandonne: "emailing.panier.actif",
  alerte_bons: "emailing.alerte_bons.actif",
  alerte_droits: "emailing.alerte_droits.actif",
  impaye: "emailing.impayes.actif",
};

export async function scenarioActif(scenario: ScenarioEmail | null): Promise<boolean> {
  const cle = scenario ? ACTIVATION[scenario] : undefined;
  return cle ? (await lireParametre(cle)) !== "false" : true;
}

export async function lireReglesEnvoi(): Promise<ReglesEnvoi> {
  const [frequenceMax, frequenceJours, plageDebut, plageFin] = await Promise.all([
    lireParametreEntier("emailing.frequence_max", 2),
    lireParametreEntier("emailing.frequence_jours", 7),
    lireParametreEntier("emailing.plage_debut", 8),
    lireParametreEntier("emailing.plage_fin", 19),
  ]);
  return { frequenceMax, frequenceJours, plageDebut, plageFin, reportMaxJours: 7 };
}

async function destinatairesAlertes(): Promise<string[]> {
  const liste = ((await lireParametre("alertes.destinataires")) ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  if (liste.length) return liste;
  return [(await lireParametre("contact.destinataire_messages"))?.trim() || "admin@demo.explocardio.test"];
}

/** Crée l'envoi une seule fois par clé ; renvoie l'existant sinon. */
async function creerUneFois(data: Prisma.EnvoiUncheckedCreateInput): Promise<Envoi> {
  try {
    return await dbSite().envoi.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return dbSite().envoi.findUniqueOrThrow({ where: { cle: data.cle } });
    }
    throw e;
  }
}

async function compteDe(demande: Pick<DemandeEnvoi, "compteId" | "destinataire">) {
  if (demande.compteId) {
    return dbSite().compteClient.findUnique({ where: { id: demande.compteId }, include: { utilisateur: { select: { email: true } } } });
  }
  if (!demande.destinataire) return null;
  const u = await dbSite().utilisateur.findFirst({
    where: { email: { equals: demande.destinataire, mode: "insensitive" } },
    select: { compteClient: { include: { utilisateur: { select: { email: true } } } } },
  });
  return u?.compteClient ?? null;
}

export async function demanderEnvoi(demande: DemandeEnvoi, maintenant = new Date()): Promise<{ envoiId: string; etat: Envoi["etat"] }> {
  const entree = entreeDuModele(demande.modele);
  const compte = await compteDe(demande);
  // Toujours l'adresse confirmée du compte (un changement non confirmé n'y est pas encore).
  const destinataire = compte?.utilisateur.email ?? demande.destinataire;
  if (!destinataire) throw new Error(`Envoi « ${demande.modele} » sans destinataire.`);
  const envoi = await creerUneFois({
    cle: demande.cle,
    famille: demande.test ? "transactionnel" : entree.famille,
    modele: demande.modele,
    scenario: demande.test ? null : (entree.scenario ?? null),
    compteId: compte?.id ?? null,
    destinataire,
    declencheur: demande.declencheur,
    variables: demande.variables ? (JSON.parse(JSON.stringify(demande.variables)) as Prisma.InputJsonValue) : undefined,
    rendu: demande.rendu?.rendu ?? null,
    texte: demande.rendu?.texte ?? null,
    objet: demande.rendu?.objet ?? null,
    references: demande.references ?? [],
    campagneId: demande.campagneId ?? null,
    programmeLe: demande.programmeLe ?? maintenant,
    creeLe: maintenant,
  });
  if (envoi.etat !== "programme" || envoi.programmeLe > maintenant || envoi.essais > 0) return { envoiId: envoi.id, etat: envoi.etat };
  const etat = await traiterEnvoi(envoi, maintenant);
  return { envoiId: envoi.id, etat };
}

async function envoisRecents(envoi: Envoi, maintenant: Date, jours: number): Promise<Date[]> {
  const depuis = new Date(maintenant.getTime() - jours * 24 * 60 * MINUTE);
  const r = await dbSite().envoi.findMany({
    where: { destinataire: envoi.destinataire, famille: { in: ["service", "commercial"] }, envoyeLe: { gte: depuis }, id: { not: envoi.id } },
    select: { envoyeLe: true },
  });
  return r.map((x) => x.envoyeLe!);
}

function variablesManquantes(envoi: Envoi): string | null {
  const vars = (envoi.variables ?? {}) as Record<string, unknown>;
  for (const v of entreeDuModele(envoi.modele).variables ?? []) {
    const val = vars[v.nom];
    if (v.obligatoire && (val === undefined || val === null || val === "")) return v.nom;
  }
  return null;
}

/** Décide, rend et envoie un envoi programmé ; renvoie son nouvel état. */
export async function traiterEnvoi(envoi: Envoi, maintenant = new Date()): Promise<Envoi["etat"]> {
  if (envoi.famille === "equipe") return transmettreEquipe(envoi, maintenant);

  const facultatif = envoi.famille !== "transactionnel";
  // Une information manquante bloque l'envoi avant tout : jamais d'email avec un champ vide.
  const manquante = envoi.rendu ? null : variablesManquantes(envoi);
  if (manquante) {
    await bloquer(envoi, new VariableManquante(manquante).message);
    return "bloque";
  }
  let objetValide: boolean;
  try {
    // L'objet d'un scénario se vérifie dans Odoo : s'il ne répond pas, on réessaie plus tard.
    objetValide = await objetToujoursValide(envoi, maintenant);
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await reessayerPlusTard(envoi, null, maintenant, e.message);
    return "programme";
  }
  // Transactionnel : ni préférence, ni fréquence, ni plage — seul compte l'objet (R3).
  const decision = !facultatif
    ? decider({ famille: envoi.famille as FamilleEmail, scenario: envoi.scenario, statutCompte: null, preferences: PREFERENCES_PAR_DEFAUT, abonne: false, adresseSuspendue: false, scenarioActif: true, objetValide, envoisRecents: [], creeLe: envoi.creeLe }, REGLES_PAR_DEFAUT, maintenant)
    : await deciderFacultatif(envoi, objetValide, maintenant);
  return appliquer(envoi, decision, maintenant);
}

async function deciderFacultatif(envoi: Envoi, objetValide: boolean, maintenant: Date) {
  const regles = await lireReglesEnvoi();
  const compte = envoi.compteId ? await dbSite().compteClient.findUnique({ where: { id: envoi.compteId }, select: { statut: true } }) : null;
  const facultatif = true;
  const [preferences, abonne, rejet, actif, recents] = await Promise.all([
    lirePreferences(envoi.destinataire),
    envoi.famille === "commercial" ? estAbonne(envoi.destinataire) : Promise.resolve(false),
    facultatif ? dbSite().adresseRejetee.findUnique({ where: { email: envoi.destinataire.toLowerCase() } }) : Promise.resolve(null),
    scenarioActif(envoi.scenario),
    facultatif ? envoisRecents(envoi, maintenant, regles.frequenceJours) : Promise.resolve([]),
  ]);
  return decider(
    {
      famille: envoi.famille as FamilleEmail,
      scenario: envoi.scenario,
      statutCompte: compte?.statut ?? null,
      preferences,
      abonne,
      adresseSuspendue: Boolean(rejet?.suspendueLe && !rejet.leveeLe),
      scenarioActif: actif,
      objetValide,
      envoisRecents: recents,
      creeLe: envoi.creeLe,
    },
    regles,
    maintenant,
  );
}

async function appliquer(envoi: Envoi, decision: Decision, maintenant: Date): Promise<Envoi["etat"]> {
  const facultatif = envoi.famille !== "transactionnel";
  if (decision.action === "annuler") {
    await dbSite().envoi.update({ where: { id: envoi.id }, data: { etat: "annule", motif: decision.motif, rendu: null, texte: null } });
    return "annule";
  }
  if (decision.action === "reporter") {
    await dbSite().envoi.update({ where: { id: envoi.id }, data: { programmeLe: decision.date } });
    return "programme";
  }

  let rendu: EmailRendu;
  if (envoi.rendu) {
    rendu = { modele: envoi.modele, objet: envoi.objet ?? "", rendu: envoi.rendu, texte: envoi.texte ?? "" };
  } else {
    try {
      rendu = await rendreEnvoi(envoi);
    } catch (e) {
      if (estErreurConnecteur(e)) {
        // Prix et disponibilités lus dans Odoo au rendu : réessayé à son retour.
        await reessayerPlusTard(envoi, null, maintenant, e.message);
        return "programme";
      }
      if (!(e instanceof VariableManquante)) throw e;
      await bloquer(envoi, e.message);
      return "bloque";
    }
  }

  try {
    const { envoiId } = await registre.emailing().envoyerEmail(
      {
        modele: envoi.modele,
        famille: envoi.famille as Exclude<FamilleEmail, "equipe">,
        destinataire: envoi.destinataire,
        objet: rendu.objet,
        rendu: rendu.rendu,
        texte: rendu.texte,
        declencheur: envoi.declencheur,
        desinscription: facultatif ? lienDesinscriptionUnClic(envoi.destinataire, envoi.scenario) : undefined,
      },
      envoi.cle,
    );
    await dbSite().envoi.update({
      where: { id: envoi.id },
      data: { etat: "envoye", envoyeLe: maintenant, connecteurEnvoiId: envoiId, objet: rendu.objet, rendu: null, texte: null, motif: null, prochainEssai: null },
    });
    return "envoye";
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    if (e.code === "OPERATION_REFUSED") {
      await bloquer(envoi, e.message);
      return "bloque";
    }
    await reessayerPlusTard(envoi, rendu, maintenant, e.message);
    return "programme";
  }
}

async function reessayerPlusTard(envoi: Envoi, rendu: EmailRendu | null, maintenant: Date, motif: string) {
  const attente = ATTENTES_MINUTES[Math.min(envoi.essais, ATTENTES_MINUTES.length - 1)]!;
  await dbSite().envoi.update({
    where: { id: envoi.id },
    data: {
      essais: { increment: 1 },
      prochainEssai: new Date(maintenant.getTime() + attente * MINUTE),
      motif: motif.slice(0, 300),
      // Conserve le rendu jusqu'à l'envoi effectif (FR-034).
      ...(rendu && !envoi.rendu && envoi.famille === "transactionnel" ? { rendu: rendu.rendu, texte: rendu.texte, objet: rendu.objet } : {}),
    },
  });
}

async function bloquer(envoi: Envoi, motif: string) {
  await dbSite().envoi.update({ where: { id: envoi.id }, data: { etat: "bloque", motif: motif.slice(0, 300), rendu: null, texte: null } });
  await notifierEquipe(
    {
      canal: "email",
      destinataires: await destinatairesAlertes(),
      objet: "Email non envoyé",
      texte: `L'email « ${entreeDuModele(envoi.modele).libelle} » destiné à ${envoi.destinataire} n'a pas été envoyé : ${motif}. Consultez Back-office → Emails.`,
      declencheur: "emailing",
    },
    `alerte-bloque:${envoi.id}`,
  );
}

async function transmettreEquipe(envoi: Envoi, maintenant: Date): Promise<Envoi["etat"]> {
  const n = envoi.variables as unknown as NotificationEquipe;
  try {
    const { envoiId } = await registre.emailing().envoyerNotificationEquipe(n, envoi.cle);
    await dbSite().envoi.update({ where: { id: envoi.id }, data: { etat: "envoye", envoyeLe: maintenant, connecteurEnvoiId: envoiId, prochainEssai: null, motif: null } });
    return "envoye";
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await reessayerPlusTard(envoi, null, maintenant, e.message);
    return "programme";
  }
}

/** Notification destinée à l'équipe (email ou SMS, FR-043) : tracée, jamais filtrée. */
export async function notifierEquipe(n: NotificationEquipe, cle: string, maintenant = new Date()): Promise<void> {
  const envoi = await creerUneFois({
    cle,
    famille: "equipe",
    modele: n.canal === "sms" ? "notification_equipe_sms" : "notification_equipe_email",
    destinataire: n.destinataires.join(", "),
    declencheur: n.declencheur,
    objet: n.objet ?? null,
    variables: JSON.parse(JSON.stringify(n)) as Prisma.InputJsonValue,
    programmeLe: maintenant,
    creeLe: maintenant,
  });
  if (envoi.etat === "programme" && envoi.essais === 0) await transmettreEquipe(envoi, maintenant);
}

export { destinatairesAlertes };

/** Tâche `emails-envoi` (chaque minute) : envois dus et reprises après panne. */
export async function releverEnvois(maintenant = new Date()): Promise<{ traites: number }> {
  const dus = await dbSite().envoi.findMany({
    where: { etat: "programme", programmeLe: { lte: maintenant }, OR: [{ prochainEssai: null }, { prochainEssai: { lte: maintenant } }] },
    orderBy: { programmeLe: "asc" },
    take: 200,
  });
  for (const e of dus) await traiterEnvoi(e, maintenant);
  await alerterPanneProlongee(maintenant);
  const { mettreAJourCampagnes } = await import("./campagnes");
  await mettreAJourCampagnes();
  return { traites: dus.length };
}

async function alerterPanneProlongee(maintenant: Date) {
  const minutes = await lireParametreEntier("emailing.alerte_panne_minutes", 30);
  const ancien = await dbSite().envoi.findFirst({
    where: { etat: "programme", essais: { gt: 0 }, famille: { not: "equipe" }, creeLe: { lte: new Date(maintenant.getTime() - minutes * MINUTE) } },
    orderBy: { creeLe: "asc" },
  });
  if (!ancien) return;
  await notifierEquipe(
    {
      canal: "email",
      destinataires: await destinatairesAlertes(),
      objet: "Outil d'emailing indisponible",
      texte: `Des emails attendent depuis plus de ${minutes} minutes : l'outil d'envoi ne répond pas (${ancien.motif ?? "erreur"}). Ils partiront à son retour, sans doublon.`,
      declencheur: "emailing",
    },
    `alerte-panne-emailing:${ancien.id}`,
    maintenant,
  );
}
