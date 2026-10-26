import Image from "next/image";
import { sansOptimisation } from "../images";
import { Placeholder } from "../Placeholder";
import { cx } from "../cx";

/**
 * Photo d'un produit sur fond ivoire (FR-041), avec son texte de remplacement (FR-043) ;
 * emplacement provisoire de la charte s'il n'y a pas de photo.
 */
export function PhotoProduit({
  photo,
  nom,
  className,
  prioritaire = false,
}: {
  photo: { chemin: string; texteRemplacement: string } | null;
  nom: string;
  className?: string;
  prioritaire?: boolean;
}) {
  if (!photo) return <Placeholder libelle={`Photo à venir : ${nom}`} className={cx("aspect-[4/3]", className)} />;
  return (
    <div className={cx("relative aspect-[4/3] overflow-hidden rounded bg-bg", className)}>
      <Image
        src={photo.chemin}
        alt={photo.texteRemplacement}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-contain"
        priority={prioritaire}
        unoptimized={sansOptimisation(photo.chemin)}
      />
    </div>
  );
}
