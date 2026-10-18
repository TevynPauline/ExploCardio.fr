-- CreateEnum
CREATE TYPE "EtatRemboursement" AS ENUM ('a_executer', 'execute');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatutCommande" ADD VALUE 'en_attente_paiement';
ALTER TYPE "StatutCommande" ADD VALUE 'payee';
ALTER TYPE "StatutCommande" ADD VALUE 'en_preparation';
ALTER TYPE "StatutCommande" ADD VALUE 'remboursee_partiellement';

-- AlterTable
ALTER TABLE "product_product" ADD COLUMN     "fraisInstallationCentimes" INTEGER,
ADD COLUMN     "fraisLivraisonCentimes" INTEGER;

-- AlterTable
ALTER TABLE "sale_order" ADD COLUMN     "echeancePaiement" TIMESTAMP(3),
ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "transporteur" TEXT;

-- CreateTable
CREATE TABLE "delivery_carrier" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "forfaitCentimes" INTEGER NOT NULL,
    "delaiJours" INTEGER NOT NULL,
    "exigeStock" BOOLEAN NOT NULL DEFAULT false,
    "franco" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "delivery_carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_settings" (
    "id" SERIAL NOT NULL,
    "seuilFrancoCentimes" INTEGER NOT NULL,
    "delaiVirementJours" INTEGER NOT NULL DEFAULT 7,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sale_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_refund" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "montantTtcCentimes" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "etat" "EtatRemboursement" NOT NULL DEFAULT 'a_executer',
    "referenceStripe" TEXT,
    "cle" TEXT,
    "avoirNumero" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "account_refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_carrier_code_key" ON "delivery_carrier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "account_refund_cle_key" ON "account_refund"("cle");

-- AddForeignKey
ALTER TABLE "account_refund" ADD CONSTRAINT "account_refund_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

