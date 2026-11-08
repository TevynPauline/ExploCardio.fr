import { describe, expect, it } from "vitest";
import { creerGardeNeutralisation } from "@/connecteurs/odoo/real/neutralisation";
import { clientDeTest, fauxOdoo, reponseJson } from "./faux-odoo";

// T006 (F14, FR-005, R8) : garde de neutralisation avant toute écriture.

function client(valeur: string | null | "illisible") {
  const odoo = fauxOdoo(
    { "ir.config_parameter": valeur === null || valeur === "illisible" ? [] : [{ id: 1, key: "database.is_neutralized", value: valeur }] },
    (a) => (valeur === "illisible" && a.methode === "execute_kw" ? reponseJson({ jsonrpc: "2.0", id: 1, error: { data: { name: "odoo.exceptions.AccessError", message: "non" } } }) : undefined),
  );
  return { odoo, client: clientDeTest(odoo.fetch) };
}

describe("garde de neutralisation", () => {
  it("recette + base neutralisée : écriture permise", async () => {
    await expect(creerGardeNeutralisation("recette")(client("True").client)).resolves.toBeUndefined();
  });

  it.each([["False"], [null], ["illisible"]] as const)("recette + %s : OperationRefused", async (v) => {
    await expect(creerGardeNeutralisation("recette")(client(v).client)).rejects.toMatchObject({
      code: "OPERATION_REFUSED",
      details: { cause: "base_non_neutralisee" },
    });
  });

  it("production + base neutralisée : refus et signalement", async () => {
    const messages: string[] = [];
    await expect(creerGardeNeutralisation("production", (m) => void messages.push(m))(client("True").client)).rejects.toMatchObject({
      code: "OPERATION_REFUSED",
      details: { cause: "base_de_test_en_production" },
    });
    expect(messages[0]).toContain("base de test branchée en production");
  });

  it("production + paramètre absent : écriture permise", async () => {
    await expect(creerGardeNeutralisation("production")(client(null).client)).resolves.toBeUndefined();
  });

  it("lit le paramètre une seule fois par processus", async () => {
    const { odoo, client: c } = client("True");
    const garde = creerGardeNeutralisation("recette");
    await garde(c);
    await garde(c);
    expect(odoo.appels.filter((a) => a.methode === "execute_kw")).toHaveLength(1);
  });
});
