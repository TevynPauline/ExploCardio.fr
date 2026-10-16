-- CreateEnum
CREATE TYPE "TypeActualite" AS ENUM ('actualite', 'nouveau_produit', 'nouvelle_offre');

-- CreateEnum
CREATE TYPE "EntreeMenu" AS ENUM ('holter_ecg', 'holter_tensionnel', 'epreuve_effort', 'accessoires', 'services', 'financement', 'qui_sommes_nous');

-- CreateEnum
CREATE TYPE "TypeElementMenu" AS ENUM ('produit_phare', 'lien_rapide');

-- CreateEnum
CREATE TYPE "EtatNewsletter" AS ENUM ('en_attente', 'confirmee', 'desinscrite', 'expiree');

-- AlterTable
ALTER TABLE "contenu" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "fond" TEXT,
ADD COLUMN     "lien" TEXT,
ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publieLe" TIMESTAMP(3),
ADD COLUMN     "typeActualite" "TypeActualite";

-- CreateTable
CREATE TABLE "marque" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "logo" TEXT,
    "familles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "element_menu" (
    "id" TEXT NOT NULL,
    "entree" "EntreeMenu" NOT NULL,
    "type" "TypeElementMenu" NOT NULL,
    "defaultCode" TEXT,
    "libelle" TEXT,
    "lien" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "element_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscription_newsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "etat" "EtatNewsletter" NOT NULL DEFAULT 'en_attente',
    "empreinteJeton" TEXT,
    "demandeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmeeLe" TIMESTAMP(3),
    "desinscriteLe" TIMESTAMP(3),
    "textePresente" TEXT NOT NULL,

    CONSTRAINT "inscription_newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "limite_envoi" (
    "cle" TEXT NOT NULL,
    "fenetreDebut" TIMESTAMP(3) NOT NULL,
    "compte" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "limite_envoi_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "marque_nom_key" ON "marque"("nom");

-- CreateIndex
CREATE INDEX "element_menu_entree_type_idx" ON "element_menu"("entree", "type");

-- CreateIndex
CREATE UNIQUE INDEX "inscription_newsletter_email_key" ON "inscription_newsletter"("email");

-- CreateIndex
CREATE UNIQUE INDEX "inscription_newsletter_empreinteJeton_key" ON "inscription_newsletter"("empreinteJeton");

-- CreateIndex
CREATE INDEX "contenu_type_etat_idx" ON "contenu"("type", "etat");

