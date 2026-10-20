-- CreateEnum
CREATE TYPE "TypeContenuAide" AS ENUM ('video', 'mode_emploi', 'notice', 'faq');

-- CreateEnum
CREATE TYPE "ThemeAide" AS ENUM ('prise_en_main', 'enregistrement', 'analyse', 'materiel', 'logiciels_cloud', 'compte');

-- Types de contenus retirés (F09) : jamais utilisés par le site ; restes de tests supprimés.
DELETE FROM "contenu" WHERE "type" IN ('faq', 'tutoriel', 'notice');

-- AlterEnum
BEGIN;
CREATE TYPE "TypeContenu_new" AS ENUM ('bandeau', 'tuile', 'actualite', 'page');
ALTER TABLE "contenu" ALTER COLUMN "type" TYPE "TypeContenu_new" USING ("type"::text::"TypeContenu_new");
ALTER TYPE "TypeContenu" RENAME TO "TypeContenu_old";
ALTER TYPE "TypeContenu_new" RENAME TO "TypeContenu";
DROP TYPE "public"."TypeContenu_old";
COMMIT;

-- CreateTable
CREATE TABLE "contenu_aide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TypeContenuAide" NOT NULL,
    "titre" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "theme" "ThemeAide" NOT NULL,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video" TEXT,
    "sousTitres" TEXT,
    "transcription" TEXT,
    "etapes" JSONB NOT NULL DEFAULT '[]',
    "document" TEXT,
    "reponse" TEXT,
    "etat" "EtatPublication" NOT NULL DEFAULT 'preparation',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "consultations" INTEGER NOT NULL DEFAULT 0,
    "publieLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contenu_aide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contenu_aide_slug_key" ON "contenu_aide"("slug");

-- CreateIndex
CREATE INDEX "contenu_aide_type_etat_idx" ON "contenu_aide"("type", "etat");

