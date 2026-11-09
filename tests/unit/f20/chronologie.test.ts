import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARGUMENTS_ANIMATION, LONGUEURS_ANIMATION, textesAnimation, TEXTES_ANIMATION_DEFAUT } from "@/domaine/textes-animation";
import {
  BOUCLES,
  DUREE_CYCLE,
  DUREE_SEQUENCE,
  ETAPES,
  feuilleDeStyle,
  FONDU_INITIAL,
  FORMATS,
  LOGO,
  MAINTIEN,
  pointsLogo,
  pourcent,
} from "@/ui/accueil/trois-temps/chronologie";

// T004 — chronologie de l'animation « Les trois temps » (F20, FR-002 à FR-010, SC-002, SC-003).

describe("animation « Les trois temps »", () => {
  it("les cercles reprennent exactement ceux du logo officiel (FR-006)", () => {
    const svg = readFileSync("docs/brand/assets/explocardio-fr-logo.svg", "utf8");
    const cercles = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
    expect(cercles).toEqual(LOGO.cercles.map((c) => [c.cx, c.cy, c.r]));
    expect(svg).toContain(`viewBox="0 ${LOGO.origineY} ${LOGO.largeur} ${LOGO.hauteur}"`);
  });

  it("SC-002 : séquence de 8 à 11 s, image finale maintenue, une seule lecture (FR-010)", () => {
    expect(DUREE_SEQUENCE).toBeGreaterThanOrEqual(8);
    expect(DUREE_SEQUENCE).toBeLessThanOrEqual(11);
    expect(ETAPES.lien[1]).toBeLessThanOrEqual(DUREE_SEQUENCE);
    expect(MAINTIEN).toBeGreaterThanOrEqual(3);
    expect(DUREE_CYCLE).toBe(FONDU_INITIAL + DUREE_SEQUENCE + MAINTIEN);
    expect(BOUCLES).toBe(1);
  });

  it("les étapes s'enchaînent dans l'ordre : arrivée, écart, mots, regroupement, logo, accroche, lien", () => {
    expect(ETAPES.arrivee(2) + ETAPES.dureeArrivee).toBeLessThanOrEqual(ETAPES.ecartDebut);
    expect(ETAPES.ecartFin).toBeLessThanOrEqual(ETAPES.mot(0));
    // Les trois mots sont affichés ensemble avant de s'effacer (FR-002, étape 3).
    expect(ETAPES.mot(2) + ETAPES.dureeMot).toBeLessThan(ETAPES.motsEffaces[0]);
    // Titres des arguments sous leur disque : après leur mot, tous lisibles au moins 1,5 s avant
    // de s'effacer avec les mots (FR-022).
    for (const [k, a] of ARGUMENTS_ANIMATION.entries()) {
      const rang = ARGUMENTS_ANIMATION.slice(0, k).filter((b) => b.mot === a.mot).length;
      expect(ETAPES.titre(a.mot, rang)).toBeGreaterThan(ETAPES.mot(a.mot));
      expect(ETAPES.titre(a.mot, rang) + ETAPES.dureeTitre + 1.5).toBeLessThanOrEqual(ETAPES.motsEffaces[0]);
    }
    expect(ETAPES.motsEffaces[0]).toBeLessThanOrEqual(ETAPES.regroupement[0]);
    expect(ETAPES.regroupement[1]).toBeLessThanOrEqual(ETAPES.logo[1]);
    expect(ETAPES.logo[1]).toBeLessThanOrEqual(ETAPES.accroche[0]);
    // Les cinq arguments apparaissent en cascade après la phrase d'accroche, avant le bouton (FR-022).
    for (const i of [0, 1, 2, 3, 4]) {
      expect(ETAPES.argument(i)[0]).toBeGreaterThanOrEqual(ETAPES.accroche[0]);
      expect(ETAPES.argument(i)[1]).toBeLessThanOrEqual(ETAPES.lien[1]);
      if (i) expect(ETAPES.argument(i)[0]).toBeGreaterThan(ETAPES.argument(i - 1)[0]);
    }
    expect(ETAPES.accroche[1]).toBeLessThanOrEqual(ETAPES.lien[0]);
  });

  it("SC-003 : les trois disques ont le même diamètre pendant les mots", () => {
    const css = feuilleDeStyle();
    for (const i of [1, 2, 3]) {
      const images = css.match(new RegExp(`@keyframes tt-point-${i}\\{(.*?)\\}\\}`))![1]!;
      for (const t of [ETAPES.ecartFin, ETAPES.mot(i - 1), ETAPES.mot(i - 1) + ETAPES.dureeMot, ETAPES.regroupement[0]]) {
        const etape = images.match(new RegExp(`${pourcent(t).replace(".", "\\.")}\\{([^}]*)`))![1]!;
        expect(etape, `point ${i} à ${t} s`).toContain("translate(var(--mx),var(--my)) scale(1)");
      }
    }
    // Un seul diamètre par format d'écran, porté par la scène.
    expect(css).toContain(`--tt-d:${FORMATS.ordinateur.diametre}px`);
    expect(css).toContain(`--tt-d:${FORMATS.telephone.diametre}px`);
  });

  it("les disques ne se chevauchent pas et tiennent dans un écran de 768 px", () => {
    for (const f of [FORMATS.ordinateur, FORMATS.telephone]) {
      const [a, b] = f.positionsMots;
      expect(Math.hypot(b![0] - a![0], b![1] - a![1])).toBeGreaterThan(f.diametre);
    }
    const o = FORMATS.ordinateur;
    const ecart = Math.min(o.positionsMots[2]![0], ((o.limiteVw ?? 100) / 100) * 768);
    expect(ecart + o.diametre / 2).toBeLessThanOrEqual(768 / 2 - 16);
    expect(ecart).toBeGreaterThan(o.diametre);
  });

  it("en fin de regroupement, les points se posent sur ceux du logo affiché (FR-006)", () => {
    const f = FORMATS.ordinateur;
    const echelle = f.largeurLogo / LOGO.largeur;
    const [p1, , p3] = pointsLogo(f);
    expect(p1!.x).toBeCloseTo((120.76 - 184.5) * echelle, 5);
    expect(p1!.y).toBeCloseTo(-f.hautLogo + (57.6 + 2) * echelle, 5);
    expect(p3!.diametre).toBeCloseTo(52.8 * echelle, 5);
    // Tailles croissantes, comme dans le logo.
    const d = pointsLogo(f).map((p) => p.diametre);
    expect(d[0]).toBeLessThan(d[1]!);
    expect(d[1]).toBeLessThan(d[2]!);
  });

  it("textes : valeurs de départ, texte vide ou manquant remplacé (FR-018)", () => {
    expect(textesAnimation([])).toEqual(TEXTES_ANIMATION_DEFAUT);
    expect(TEXTES_ANIMATION_DEFAUT.accroche).toBe("Une offre pensée pour la cardiologie libérale");
    expect(TEXTES_ANIMATION_DEFAUT.mots).toEqual(["Liberté", "Expertise", "Fidélité"]);
    expect(TEXTES_ANIMATION_DEFAUT.arguments).toEqual([
      "Achetez, louez ou financez",
      "Dépannage express",
      "Des interlocuteurs experts",
      "L'assistance sans contrat",
      "Une fidélité récompensée",
    ]);
    // Rangement sous les mots : Liberté (2), Expertise (1), Fidélité (2).
    expect(ARGUMENTS_ANIMATION.map((a) => a.mot)).toEqual([0, 0, 1, 2, 2]);
    for (const a of TEXTES_ANIMATION_DEFAUT.arguments) expect(a.length).toBeLessThanOrEqual(LONGUEURS_ANIMATION.argument);
    const textes = textesAnimation([
      { cle: "accroche", titre: "Votre équipement, prêt à l'emploi." },
      { cle: "mot-2", titre: "  " },
      { cle: "mot-3", titre: "Clé en main" },
      { cle: "argument-a", titre: "Achat, location ou financement" },
      { cle: "argument-e", titre: "" },
    ]);
    expect(textes.accroche).toBe("Votre équipement, prêt à l'emploi.");
    expect(textes.mots).toEqual(["Liberté", "Expertise", "Clé en main"]);
    expect(textes.arguments[0]).toBe("Achat, location ou financement");
    expect(textes.arguments[4]).toBe(TEXTES_ANIMATION_DEFAUT.arguments[4]);
  });
});
