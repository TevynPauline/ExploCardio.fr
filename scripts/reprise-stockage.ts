import nextEnv from "@next/env";

// `npm run stockage:reprise [-- --effacer-la-base]` — copie les fichiers gardés dans la base du
// site vers le compartiment Scaleway de ce site (F26, research R7). Rejouable ; affiche un
// bilan en français ; code de sortie 1 si un fichier n'a pas pu être vérifié. Ne tourne qu'en
// mode réel complet (CONNECTOR_STOCKAGE=real). N'affiche jamais de clé ni de contenu de fichier.
// Sur Scalingo : scalingo --app <application> run npm run stockage:reprise

nextEnv.loadEnvConfig(process.cwd(), true);

async function principal(): Promise<number> {
  const { modeDuConnecteur, variablesManquantes, environnementStockage } = await import("@/lib/config");
  const effacer = process.argv.includes("--effacer-la-base");

  if (modeDuConnecteur("stockage") !== "real") {
    console.error("Reprise refusée : CONNECTOR_STOCKAGE n'est pas « real » (le site garde ses fichiers dans sa base).");
    return 2;
  }
  const manquantes = variablesManquantes("stockage");
  if (manquantes.length) {
    console.error(`Reprise refusée : configuration du stockage incomplète ou incohérente (${manquantes.join(", ")}).`);
    return 2;
  }

  const { creerStockageReel } = await import("@/connecteurs/stockage/real");
  const { reprendre } = await import("@/connecteurs/stockage/real/reprise");
  const { dbSite } = await import("@/lib/db/site");
  const db = dbSite();

  console.log(`Reprise des fichiers vers le compartiment « ${process.env.STOCKAGE_COMPARTIMENT} » (${environnementStockage()})${effacer ? ", avec effacement de la base" : ""}.`);
  const bilan = await reprendre({
    client: creerStockageReel([], process.env),
    effacer,
    journal: (ligne) => console.log(`  ${ligne}`),
    base: {
      lister: () => db.fichierStocke.findMany({ select: { chemin: true, type: true, taille: true }, orderBy: { chemin: "asc" } }),
      octets: async (chemin) => {
        const f = await db.fichierStocke.findUnique({ where: { chemin }, select: { octets: true } });
        return f ? new Uint8Array(f.octets) : null;
      },
      effacer: async (chemin) => {
        await db.fichierStocke.delete({ where: { chemin } });
      },
    },
  });

  console.log("");
  console.log(`Copiés : ${bilan.copies}`);
  console.log(`Déjà présents : ${bilan.dejaPresents}`);
  console.log(`En erreur : ${bilan.enErreur.length}`);
  if (effacer) {
    console.log(
      bilan.effacementRefuse
        ? "Effacement de la base refusé : au moins un fichier n'est pas vérifié dans le compartiment. Relancez la reprise."
        : `Lignes effacées de la base : ${bilan.effaces}`,
    );
  }
  console.log(`Restant dans la base : ${bilan.restantEnBase}`);
  await db.$disconnect();
  return bilan.enErreur.length || bilan.effacementRefuse ? 1 : 0;
}

principal()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    const code = (e as { code?: string })?.code;
    console.error(`Reprise interrompue${code ? ` (${code})` : ""}.`);
    process.exit(1);
  });
