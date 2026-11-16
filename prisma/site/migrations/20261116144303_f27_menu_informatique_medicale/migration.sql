-- CreateEnum
CREATE TYPE "EtatDemandeInformatique" AS ENUM ('nouvelle', 'en_cours', 'transmise', 'close');

-- DropForeignKey
ALTER TABLE "contenu_produit" DROP CONSTRAINT "contenu_produit_sousCategorieId_fkey";

-- AlterTable
ALTER TABLE "contenu_produit" DROP COLUMN "sousCategorieId";

-- DropTable
DROP TABLE "element_menu";

-- DropTable
DROP TABLE "sous_categorie";

-- DropEnum
DROP TYPE "EntreeMenu";

-- DropEnum
DROP TYPE "TypeElementMenu";

-- CreateTable
CREATE TABLE "demande_informatique" (
    "id" TEXT NOT NULL,
    "interets" TEXT[],
    "medecins" INTEGER NOT NULL,
    "postes" INTEGER NOT NULL,
    "secretariat" BOOLEAN NOT NULL,
    "logiciels" JSONB NOT NULL,
    "prestataireActuel" TEXT NOT NULL,
    "delai" TEXT NOT NULL,
    "coordonnees" JSONB NOT NULL,
    "creneau" TEXT NOT NULL,
    "consentementLe" TIMESTAMP(3) NOT NULL,
    "compteId" TEXT,
    "etat" "EtatDemandeInformatique" NOT NULL DEFAULT 'nouvelle',
    "notes" TEXT,
    "traitePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_informatique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demande_informatique_etat_creeLe_idx" ON "demande_informatique"("etat", "creeLe");

