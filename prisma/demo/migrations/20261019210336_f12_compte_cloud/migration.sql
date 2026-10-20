-- AlterTable
ALTER TABLE "cloud_access" ADD COLUMN     "compteId" INTEGER;

-- AlterTable
ALTER TABLE "product_product" ADD COLUMN     "logicielInclus" TEXT,
ADD COLUMN     "moisInclus" INTEGER;

-- CreateTable
CREATE TABLE "cloud_account" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "partenaireId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "cabinet" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'actif',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cloud_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cloud_account_ref_key" ON "cloud_account"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_account_partenaireId_key" ON "cloud_account"("partenaireId");

-- AddForeignKey
ALTER TABLE "cloud_account" ADD CONSTRAINT "cloud_account_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_access" ADD CONSTRAINT "cloud_access_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "cloud_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

