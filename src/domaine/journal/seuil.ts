import { destinatairesAlertes, notifierEquipe } from "@/domaine/emailing/envoi";
import { dbSite } from "@/lib/db/site";
import { lireParametreEntier } from "@/lib/parametres";

// Alerte de panne d'un connecteur (F13, US7, D10) : après N erreurs successives (paramètre
// « connecteurs.seuil_alerte », 5 par défaut), l'équipe est prévenue une fois par heure au plus ;
// un succès intermédiaire remet le compte à zéro. L'emailing a sa propre alerte (F10).

const EN_COURS = new Set<string>();

export async function verifierSeuil(connecteur: string, mode: string, maintenant = new Date()): Promise<boolean> {
  if (connecteur === "emailing" || EN_COURS.has(connecteur)) return false;
  EN_COURS.add(connecteur);
  try {
    const seuil = await lireParametreEntier("connecteurs.seuil_alerte", 5);
    const derniers = await dbSite().journalConnecteur.findMany({
      where: { connecteur, resultat: { in: ["succes", "erreur"] } },
      orderBy: { date: "desc" },
      take: seuil,
      select: { resultat: true },
    });
    if (derniers.length < seuil || derniers.some((d) => d.resultat !== "erreur")) return false;
    const depuis = new Date(maintenant.getTime() - 3600_000);
    if (await dbSite().journalConnecteur.count({ where: { connecteur, niveau: "alerte", date: { gt: depuis } } })) return false;
    await dbSite().journalConnecteur.create({
      data: { connecteur, mode, operation: "alerte.seuil", resultat: "alerte", niveau: "alerte", motifErreur: `${seuil} erreurs successives`, dureeMs: 0, date: maintenant },
    });
    await notifierEquipe(
      {
        canal: "email",
        destinataires: await destinatairesAlertes(),
        objet: `Alerte : connecteur ${connecteur} en erreur`,
        texte: `Les ${seuil} derniers appels au connecteur « ${connecteur} » (mode ${mode}) ont échoué. Consultez le journal des connecteurs dans le back-office.`,
        declencheur: "journal des connecteurs",
      },
      `alerte-connecteur:${connecteur}:${maintenant.toISOString().slice(0, 13)}`,
      maintenant,
    );
    return true;
  } finally {
    EN_COURS.delete(connecteur);
  }
}
