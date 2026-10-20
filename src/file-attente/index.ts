import { createHash } from "node:crypto";
import { notifierEquipe } from "@/domaine/emailing/envoi";
import { PgBoss, type Job } from "pg-boss";
import { dbSite } from "@/lib/db/site";
import { lireParametre, lireParametreEntier } from "@/lib/parametres";

// File d'attente des tâches de fond (R9) : écritures vers les connecteurs en mode réel, envois
// différés. Chaque tâche porte une clé d'idempotence ; les reprises sont espacées.
// Après N échecs successifs d'une même tâche (paramètre « file_attente.seuil_alerte », 5 par
// défaut, principe VI), une alerte est inscrite au journal des connecteurs et signalée dans le
// back-office. Une fois US6 livrée, une notification d'équipe est aussi envoyée (T068).

const globale = globalThis as unknown as { __fileAttente?: Promise<PgBoss> };

export async function fileAttente(): Promise<PgBoss> {
  globale.__fileAttente ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL est absente : la file d'attente ne peut pas démarrer.");
    const boss = new PgBoss({ connectionString: url, schema: "file_attente", max: 3 });
    boss.on("error", (e: unknown) => console.error("[file d'attente]", e));
    await boss.start();
    return boss;
  })();
  return globale.__fileAttente;
}

/** Identifiant déterministe dérivé de la clé : envoyer deux fois la même tâche n'en crée qu'une. */
export function identifiantDepuisCle(file: string, cle: string): string {
  const h = createHash("sha1").update(`${file}:${cle}`).digest("hex");
  // Mise en forme d'un UUID (version 5, variante RFC 4122).
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((Number.parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const filesCreees = new Set<string>();

async function assurerFile(boss: PgBoss, file: string) {
  if (filesCreees.has(file)) return;
  await boss.createQueue(file, {
    retryLimit: 20,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 3600,
  });
  filesCreees.add(file);
}

/** Envoie une tâche ; renvoie `null` si une tâche de même clé existe déjà. */
export async function envoyerTache(
  file: string,
  donnees: object,
  cle: string,
  options: { demarrerApresSecondes?: number } = {},
): Promise<string | null> {
  const boss = await fileAttente();
  await assurerFile(boss, file);
  return boss.send(file, donnees, {
    id: identifiantDepuisCle(file, cle),
    ...(options.demarrerApresSecondes ? { startAfter: options.demarrerApresSecondes } : {}),
  });
}

export async function signalerEchecsRepetes(file: string, job: Pick<Job, "id" | "retryCount">, erreur: unknown) {
  const seuil = await lireParametreEntier("file_attente.seuil_alerte", 5);
  const echecs = job.retryCount + 1;
  if (echecs !== seuil) return;
  await dbSite().journalConnecteur.create({
    data: {
      connecteur: "file_attente",
      mode: "-",
      operation: file,
      objet: job.id,
      resultat: "erreur",
      niveau: "alerte",
      motifErreur: `${echecs} échecs successifs : ${erreur instanceof Error ? erreur.message : String(erreur)}`.slice(0, 500),
      dureeMs: 0,
    },
  });
  // Notification d'équipe (US6) aux destinataires définis dans le back-office, s'il y en a.
  const destinataires = ((await lireParametre("alertes.destinataires")) ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (destinataires.length) {
    await notifierEquipe(
      {
        canal: "email",
        destinataires,
        objet: `Alerte : ${echecs} échecs successifs (${file})`,
        texte: `La tâche ${job.id} de la file « ${file} » a échoué ${echecs} fois de suite. Consultez le journal des connecteurs.`,
        declencheur: "file d'attente",
      },
      `alerte:${file}:${job.id}:${echecs}`,
    );
  }
}

/** Traite les tâches d'une file ; chaque échec est compté et alerté au seuil. */
export async function traiterFile<T extends object>(file: string, traitement: (donnees: T) => Promise<void>) {
  const boss = await fileAttente();
  await assurerFile(boss, file);
  return boss.work<T>(file, async (jobs) => {
    for (const job of jobs) {
      try {
        await traitement(job.data);
      } catch (e) {
        await signalerEchecsRepetes(file, job, e);
        throw e;
      }
    }
  });
}
