import { AsyncLocalStorage } from "node:async_hooks";
import type { ReactNode } from "react";
import { dbSite } from "@/lib/db/site";
import { Paragraphe, type PiedPreferences } from "./Gabarit";
import { rendreEmail, type EmailRendu } from "./rendu";
import type { FamilleGabarit } from "./Gabarit";

// Textes modifiables des emails (F10, D2, FR-026) : chaque modèle déclare ses textes par défaut
// (objet, aperçu, titre, paragraphes) avec des variables {{nom}} ; l'administrateur publie une
// version modifiée au back-office (`ModeleEmail`). La mise en page, les tableaux et les boutons
// restent dans le code. Dans un texte : une ligne vide sépare deux paragraphes, **gras**.

export type TextesModele = {
  objet: string;
  apercu: string;
  /** Titre affiché dans la carte ; l'objet par défaut. */
  titre?: string;
  /** Paragraphes nommés, placés par le modèle. */
  blocs: Record<string, string>;
};

export type Variables = Record<string, string | number>;

export type TextesRemplis = {
  objet: string;
  apercu: string;
  titre: string;
  /** Paragraphes d'un bloc, prêts à placer dans le corps. */
  bloc(nom: string): ReactNode;
};

/** Textes en cours d'aperçu (brouillon au back-office), pour un modèle, le temps d'un rendu. */
const apercu = new AsyncLocalStorage<{ code: string; textes: TextesModele }>();

export function avecTextes<T>(code: string, textes: TextesModele, rendu: () => Promise<T>): Promise<T> {
  return apercu.run({ code, textes }, rendu);
}

/** Textes publiés, champ par champ ; à défaut, ceux du code. */
export async function textesEnVigueur(code: string, defaut: TextesModele): Promise<TextesModele> {
  const enApercu = apercu.getStore();
  if (enApercu?.code === code) return fusionner(defaut, enApercu.textes);
  const publie = await dbSite().modeleEmail.findUnique({ where: { code }, select: { textesPublies: true } }).catch(() => null);
  return publie?.textesPublies ? fusionner(defaut, publie.textesPublies as Partial<TextesModele>) : defaut;
}

export function fusionner(defaut: TextesModele, autre: Partial<TextesModele>): TextesModele {
  return {
    objet: autre.objet?.trim() || defaut.objet,
    apercu: autre.apercu?.trim() || defaut.apercu,
    titre: autre.titre?.trim() || defaut.titre,
    blocs: Object.fromEntries(Object.entries(defaut.blocs).map(([nom, texte]) => [nom, autre.blocs?.[nom]?.trim() || texte])),
  };
}

/** Variables d'un texte : {{nom}}. */
export function variablesDe(texte: string): string[] {
  return [...new Set([...texte.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]!))];
}

export function variablesDesTextes(t: TextesModele): string[] {
  return [...new Set([t.objet, t.apercu, t.titre ?? "", ...Object.values(t.blocs)].flatMap(variablesDe))];
}

export function remplir(texte: string, v: Variables): string {
  return texte.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, nom: string) => (v[nom] === undefined ? "" : String(v[nom])));
}

/** Texte en ligne : **gras** ; le reste est du texte (échappé par React). */
function enLigne(texte: string): ReactNode[] {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((morceau, i) => (morceau.startsWith("**") && morceau.endsWith("**") ? <strong key={i}>{morceau.slice(2, -2)}</strong> : morceau));
}

export function Paragraphes({ texte }: { texte: string }) {
  return (
    <>
      {texte
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean)
        .map((p, i) => (
          <Paragraphe key={i}>{enLigne(p)}</Paragraphe>
        ))}
    </>
  );
}

/** Rend un modèle à partir de ses textes en vigueur, remplis avec ses variables. */
export async function rendreModele(o: {
  modele: string;
  defaut: TextesModele;
  variables?: Variables;
  corps: (t: TextesRemplis) => ReactNode;
  famille?: FamilleGabarit;
  pied?: PiedPreferences;
}): Promise<EmailRendu> {
  const textes = await textesEnVigueur(o.modele, o.defaut);
  const v = o.variables ?? {};
  const t: TextesRemplis = {
    objet: remplir(textes.objet, v),
    apercu: remplir(textes.apercu, v),
    titre: remplir(textes.titre ?? textes.objet, v),
    bloc: (nom) => <Paragraphes texte={remplir(textes.blocs[nom] ?? "", v)} />,
  };
  return rendreEmail({ modele: o.modele, objet: t.objet, apercu: t.apercu, titre: t.titre, corps: o.corps(t), famille: o.famille, pied: o.pied });
}
