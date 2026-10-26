-- AlterEnum
ALTER TYPE "StatutCommande" ADD VALUE 'devis';

-- AlterTable
ALTER TABLE "sale_order" ADD COLUMN     "devisRef" TEXT,
ADD COLUMN     "validiteLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sale_settings" ADD COLUMN     "validiteDevisJours" INTEGER NOT NULL DEFAULT 30;

