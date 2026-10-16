-- CreateEnum
CREATE TYPE "TypeDecision" AS ENUM ('validation', 'refus', 'suspension', 'retablissement');

-- CreateEnum
CREATE TYPE "EtatCadeau" AS ENUM ('droit_ouvert', 'en_attente_stock', 'remis');

-- CreateEnum
CREATE TYPE "EtatDemandeNumero" AS ENUM ('en_attente', 'acceptee', 'refusee');

-- CreateEnum
CREATE TYPE "TypeDemandeRgpd" AS ENUM ('export', 'suppression');

-- CreateEnum
CREATE TYPE "EtatDemandeRgpd" AS ENUM ('recue', 'traitee', 'refusee');

-- AlterEnum
ALTER TYPE "StatutCompteClient" ADD VALUE 'supprime';

-- DropIndex
DROP INDEX "compte_client_siret_key";

-- AlterTable
ALTER TABLE "compte_client" ADD COLUMN     "valideLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "utilisateur" ADD COLUMN     "bloqueJusqua" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "decision_compte" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "decision" "TypeDecision" NOT NULL,
    "motif" TEXT,
    "auteurId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_compte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribution_cadeau" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "compteId" TEXT,
    "etat" "EtatCadeau" NOT NULL DEFAULT 'droit_ouvert',
    "ouvertLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remisLe" TIMESTAMP(3),
    "commandeRef" TEXT,

    CONSTRAINT "attribution_cadeau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_changement_numero" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "ancienNumero" TEXT,
    "nouveauNumero" TEXT NOT NULL,
    "etat" "EtatDemandeNumero" NOT NULL DEFAULT 'en_attente',
    "motif" TEXT,
    "traiteePar" TEXT,
    "demandeeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeLe" TIMESTAMP(3),

    CONSTRAINT "demande_changement_numero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "echec_connexion" (
    "cle" TEXT NOT NULL,
    "premierEchec" TIMESTAMP(3) NOT NULL,
    "compte" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "echec_connexion_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "demande_rgpd" (
    "id" TEXT NOT NULL,
    "compteId" TEXT,
    "type" "TypeDemandeRgpd" NOT NULL,
    "etat" "EtatDemandeRgpd" NOT NULL DEFAULT 'recue',
    "motif" TEXT,
    "origine" TEXT NOT NULL DEFAULT 'mon_compte',
    "recueLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeLe" TIMESTAMP(3),

    CONSTRAINT "demande_rgpd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decision_compte_compteId_idx" ON "decision_compte"("compteId");

-- CreateIndex
CREATE UNIQUE INDEX "attribution_cadeau_numero_key" ON "attribution_cadeau"("numero");

-- CreateIndex
CREATE INDEX "demande_changement_numero_etat_idx" ON "demande_changement_numero"("etat");

-- CreateIndex
CREATE INDEX "demande_rgpd_etat_idx" ON "demande_rgpd"("etat");

-- CreateIndex
CREATE INDEX "compte_client_siret_idx" ON "compte_client"("siret");

-- CreateIndex
CREATE INDEX "compte_client_statut_idx" ON "compte_client"("statut");

-- AddForeignKey
ALTER TABLE "decision_compte" ADD CONSTRAINT "decision_compte_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_cadeau" ADD CONSTRAINT "attribution_cadeau_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_changement_numero" ADD CONSTRAINT "demande_changement_numero_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_rgpd" ADD CONSTRAINT "demande_rgpd_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

