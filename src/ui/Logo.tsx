import Image from "next/image";
import horizontal from "@brand/assets/explocardio-fr-logo-horizontal.svg";
import horizontalBlanc from "@brand/assets/explocardio-fr-logo-horizontal-blanc.svg";
import empile from "@brand/assets/explocardio-fr-logo.svg";
import empileBlanc from "@brand/assets/explocardio-fr-logo-blanc.svg";

/**
 * Logo officiel, toujours intégré depuis docs/brand/assets (principe VII) :
 * jamais recomposé en texte, déformé ni recoloré.
 */
const versions = {
  horizontal,
  "horizontal-blanc": horizontalBlanc,
  empile,
  "empile-blanc": empileBlanc,
} as const;

type LogoProps = {
  version?: keyof typeof versions;
  /** Hauteur affichée en pixels ; la largeur suit les proportions du fichier. */
  hauteur?: number;
  priority?: boolean;
};

export function Logo({ version = "horizontal", hauteur = 32, priority = false }: LogoProps) {
  const fichier = versions[version];
  const largeur = Math.round((fichier.width / fichier.height) * hauteur);
  return (
    <Image
      src={fichier}
      alt="ExploCardio.fr"
      height={hauteur}
      width={largeur}
      priority={priority}
      unoptimized
    />
  );
}
