"use client";

import { useState } from "react";
import type { PhotoProduit as Photo } from "@/domaine/catalogue/publication";
import { cx } from "../cx";
import { PhotoProduit } from "./PhotoProduit";

/** Galerie de la fiche (FR-010, FR-042) : photo principale et vignettes utilisables au clavier. */
export function Galerie({ photos, nom }: { photos: Photo[]; nom: string }) {
  const [actuelle, setActuelle] = useState(0);
  const photo = photos[actuelle] ?? null;
  return (
    <div className="flex flex-col gap-3">
      <PhotoProduit photo={photo} nom={nom} prioritaire />
      {photos.length > 1 ? (
        <ul className="flex list-none flex-wrap gap-2 p-0" aria-label="Photos du produit">
          {photos.map((p, i) => (
            <li key={p.chemin}>
              <button
                type="button"
                onClick={() => setActuelle(i)}
                aria-pressed={i === actuelle}
                aria-label={`Photo ${i + 1} sur ${photos.length} : ${p.texteRemplacement}`}
                className={cx("size-16 overflow-hidden rounded-sm border-2 bg-bg p-0", i === actuelle ? "border-action" : "border-line")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- vignette décorative, déjà nommée par le bouton */}
                <img src={p.chemin} alt="" className="size-full object-contain" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
