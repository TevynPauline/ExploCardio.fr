import Link from "next/link";
import type { Fiche } from "@/domaine/catalogue/fiches";

import { AjoutPanier } from "./AjoutPanier";
import { Disponibilite } from "./Disponibilite";
import { Onglets, type Onglet } from "./Onglets";
import { Prix } from "./Prix";

// Onglets d'information de la fiche (F03, US4, FR-018 à FR-020) : un onglet sans contenu
// n'apparaît pas.

function taille(octets: number): string {
  return octets >= 1024 * 1024 ? `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

const TYPES_DOC = { notice: "Notice", fiche_technique: "Fiche technique" } as const;

function Paragraphes({ texte }: { texte: string }) {
  return (
    <div className="flex max-w-prose flex-col gap-3">
      {texte.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function OngletsFiche({ fiche }: { fiche: Fiche }) {
  const t = fiche.textes;
  const onglets: Onglet[] = [];
  if (t.caracteristiques?.length) {
    onglets.push({
      id: "caracteristiques",
      titre: "Caractéristiques techniques",
      contenu: (
        <dl className="grid max-w-3xl gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {t.caracteristiques.map((c, i) => (
            <div key={i} className="contents">
              <dt className="font-medium text-ink">{c.libelle}</dt>
              <dd className="break-words">{c.valeur}</dd>
            </div>
          ))}
        </dl>
      ),
    });
  }
  if (t.contenuCoffret?.trim()) onglets.push({ id: "coffret", titre: "Contenu du coffret", contenu: <Paragraphes texte={t.contenuCoffret} /> });
  if (fiche.type === "equipement" && fiche.compatibles.length) {
    onglets.push({
      id: "consommables",
      titre: "Consommables compatibles",
      contenu: (
        <ul className="flex list-none flex-col gap-3 p-0">
          {fiche.compatibles.flatMap((c) =>
            c.variantes.map((v) => (
              <li key={v.defaultCode} className="ec-card flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-small text-muted">{c.marque}</p>
                  <p className="font-semibold">
                    <Link href={c.chemin}>{c.nom}</Link>
                    {v.configuration ? ` — ${v.configuration}` : ""}
                  </p>
                  <Prix ht={v.prixHt} tauxTva={v.tauxTva} />
                  {v.achat?.etat !== "disponible" ? <Disponibilite etat={v.achat} /> : null}
                </div>
                {v.achat && v.achat.etat !== "indisponible" ? (
                  <AjoutPanier defaultCode={v.defaultCode} prixAffiche={v.prixHt} variante="secondaire" libelle={`Ajouter au panier`} />
                ) : null}
              </li>
            )),
          )}
        </ul>
      ),
    });
  }
  if (fiche.type === "consommable" && fiche.compatibles.length) {
    onglets.push({
      id: "equipements",
      titre: "Équipements compatibles",
      contenu: (
        <ul className="flex list-none flex-col gap-2 p-0">
          {fiche.compatibles.map((c) => (
            <li key={c.defaultCode}>
              <Link href={c.chemin}>{c.marque} {c.nom}</Link>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (t.logicielAssocie?.trim()) onglets.push({ id: "logiciel", titre: "Logiciel associé", contenu: <Paragraphes texte={t.logicielAssocie} /> });
  if (fiche.documents.length) {
    onglets.push({
      id: "documents",
      titre: "Documents",
      contenu: (
        <ul className="flex list-none flex-col gap-2 p-0">
          {fiche.documents.map((d) => (
            <li key={d.chemin}>
              <a href={d.chemin} target="_blank" rel="noopener">
                {d.titre}
              </a>{" "}
              <span className="text-small text-muted">({TYPES_DOC[d.type] ?? "Document"}, PDF, {taille(d.octets)})</span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (t.garantie?.trim()) onglets.push({ id: "garantie", titre: "Garantie", contenu: <Paragraphes texte={t.garantie} /> });
  if (!onglets.length) return null;
  return (
    <section aria-labelledby="titre-informations" className="flex flex-col gap-4">
      <h2 id="titre-informations" className="text-h2 font-light">Informations</h2>
      <Onglets onglets={onglets} libelle={`Informations sur ${fiche.nom}`} />
    </section>
  );
}
