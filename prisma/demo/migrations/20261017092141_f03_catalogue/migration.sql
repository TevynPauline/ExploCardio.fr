-- AlterTable
ALTER TABLE "product_product" ADD COLUMN     "composants" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "quantiteParLot" INTEGER NOT NULL DEFAULT 1;

