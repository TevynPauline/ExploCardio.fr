import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FilAriane } from "@/ui/FilAriane";

// T003 — fil d'Ariane commun (F16, FR-003, FR-004).

const rendu = (etapes: { libelle: string; href?: string }[]) => renderToStaticMarkup(createElement(FilAriane, { etapes }));

describe("fil d'Ariane", () => {
  it("commence par l'accueil, relie chaque étape sauf la page courante, annoncée comme telle", () => {
    const html = rendu([{ libelle: "Holter ECG", href: "/holter-ecg" }, { libelle: "DMS 300-4L" }]);
    expect(html).toContain('aria-label="Fil d’Ariane"');
    expect(html).toMatch(/<ol[^>]*>.*href="\/".*Accueil.*href="\/holter-ecg".*Holter ECG.*aria-current="page"[^>]*>DMS 300-4L/);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("sur téléphone : un seul lien vers la rubrique parente", () => {
    const html = rendu([{ libelle: "Holter ECG", href: "/holter-ecg" }, { libelle: "DMS 300-4L" }]);
    expect(html).toMatch(/<a[^>]*sm:hidden[^>]*href="\/holter-ecg"|<a[^>]*href="\/holter-ecg"[^>]*sm:hidden/);
    const parentSeul = rendu([{ libelle: "Panier" }]);
    expect(parentSeul).toMatch(/sm:hidden[^>]*>.*Accueil/);
  });
});
