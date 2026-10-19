-- AlterTable
ALTER TABLE "panier" ADD COLUMN     "bonsDemandesHt" INTEGER;

-- CreateTable
CREATE TABLE "suivi_fidelite" (
    "cle" TEXT NOT NULL,
    "partenaireRef" TEXT NOT NULL,
    "notifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suivi_fidelite_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE INDEX "suivi_fidelite_partenaireRef_idx" ON "suivi_fidelite"("partenaireRef");

