import { describe, expect, it } from "vitest";
import { motifDe } from "@/connecteurs/journal";
import { ServiceUnavailable } from "@/connecteurs/erreurs";
import { CLE_TEST, clientDeTest, fauxOdoo, reponseJson } from "./faux-odoo";

// T010 (F14, FR-008) : le journal indique la cause d'une erreur d'Odoo, jamais la clé.

describe("journal des appels à Odoo", () => {
  it("inscrit le code et la cause", () => {
    expect(motifDe(new ServiceUnavailable("Odoo", { cause: "acces_refuse" }))).toBe("SERVICE_UNAVAILABLE (acces_refuse)");
    expect(motifDe(new ServiceUnavailable("Odoo"))).toBe("SERVICE_UNAVAILABLE");
    expect(motifDe(new Error("x"))).toBe("Error");
  });

  it("une cause hors vocabulaire n'est pas recopiée", () => {
    expect(motifDe(new ServiceUnavailable("Odoo", { cause: `fuite ${CLE_TEST}` }))).toBe("SERVICE_UNAVAILABLE");
  });

  it("une clé refusée par Odoo donne un motif sans la clé", async () => {
    const odoo = fauxOdoo({}, (a) =>
      a.methode === "authenticate" ? reponseJson({ jsonrpc: "2.0", id: 1, error: { data: { name: "odoo.exceptions.AccessDenied", message: `refus ${CLE_TEST}` } } }) : undefined,
    );
    const e = await clientDeTest(odoo.fetch).searchCount("product.product", []).catch((x: unknown) => x);
    const motif = motifDe(e);
    expect(motif).toBe("SERVICE_UNAVAILABLE (acces_refuse)");
    expect(motif).not.toContain(CLE_TEST);
  });
});
