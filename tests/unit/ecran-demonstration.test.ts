import { afterEach, describe, expect, it, vi } from "vitest";
import { ecranDemonstration, outilsDemonstrationDisponibles } from "@/connecteurs/demonstration";
import { validerPaliers, ValeurRefusee } from "@/connecteurs/odoo/demo/administration";

// FR-027 : l'écran de démonstration disparaît dès que le connecteur Odoo est en mode réel.
// FR-026 : des paramètres incohérents sont refusés avec l'explication.

describe("écran de démonstration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("disparaît quand le connecteur Odoo est réel ou hors du site de démonstration", async () => {
    expect(outilsDemonstrationDisponibles()).toBe(true);
    vi.stubEnv("CONNECTOR_ODOO", "real");
    expect(outilsDemonstrationDisponibles()).toBe(false);
    expect(() => ecranDemonstration.apercu()).toThrow(/mode réel/);
    vi.unstubAllEnvs();
    vi.stubEnv("SITE_MODE", "prod");
    expect(outilsDemonstrationDisponibles()).toBe(false);
  });

  it("refuse les paliers avec un trou, un chevauchement ou un taux hors limites", () => {
    expect(() => validerPaliers([{ plancherCentimes: 100, inclusif: true, tauxPourcent: 5 }])).toThrow(ValeurRefusee);
    expect(() =>
      validerPaliers([
        { plancherCentimes: 0, inclusif: true, tauxPourcent: 0 },
        { plancherCentimes: 0, inclusif: true, tauxPourcent: 5 },
      ]),
    ).toThrow(/chevauchement/);
    expect(() => validerPaliers([{ plancherCentimes: 0, inclusif: true, tauxPourcent: 120 }])).toThrow(/0 et 100/);
    expect(validerPaliers([{ plancherCentimes: 0, inclusif: true, tauxPourcent: 0 }])).toHaveLength(1);
  });
});
