import pg from "pg";

// Accès direct aux bases pour préparer et vérifier les parcours (jamais utilisé par le site).

export async function requete<T extends pg.QueryResultRow = Record<string, unknown>>(
  base: "site" | "demo",
  sql: string,
  valeurs: unknown[] = [],
): Promise<T[]> {
  const url = base === "site" ? process.env.DATABASE_URL : process.env.DEMO_DATABASE_URL;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query<T>(sql, valeurs)).rows;
  } finally {
    await client.end();
  }
}
