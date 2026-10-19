-- CreateEnum
CREATE TYPE "EtatIntervention" AS ENUM ('disponible', 'consommee');

-- AlterTable
ALTER TABLE "assistance_right" ADD COLUMN     "historique" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "loyalty_history" ADD COLUMN     "auteur" TEXT,
ADD COLUMN     "lotId" INTEGER,
ADD COLUMN     "motif" TEXT,
ADD COLUMN     "regles" JSONB;

-- AlterTable
ALTER TABLE "loyalty_promotion" ADD COLUMN     "annoncee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limites" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "usages" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sale_order" ADD COLUMN     "bonsManquantsCentimes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codePromo" TEXT,
ADD COLUMN     "reglesFidelite" JSONB;

-- CreateTable
CREATE TABLE "loyalty_lot" (
    "id" SERIAL NOT NULL,
    "partenaireId" INTEGER NOT NULL,
    "origine" TEXT NOT NULL,
    "montantInitialCentimes" INTEGER NOT NULL,
    "resteCentimes" INTEGER NOT NULL,
    "validiteFin" TIMESTAMP(3) NOT NULL,
    "commandeId" INTEGER,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "loyalty_lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistance_ticket" (
    "id" SERIAL NOT NULL,
    "partenaireId" INTEGER NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "etat" "EtatIntervention" NOT NULL DEFAULT 'disponible',
    "acheteeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consommeeLe" TIMESTAMP(3),
    "auteur" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assistance_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loyalty_lot_partenaireId_validiteFin_idx" ON "loyalty_lot"("partenaireId", "validiteFin");

-- CreateIndex
CREATE UNIQUE INDEX "assistance_ticket_commandeId_key" ON "assistance_ticket"("commandeId");

-- AddForeignKey
ALTER TABLE "loyalty_history" ADD CONSTRAINT "loyalty_history_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "loyalty_lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_lot" ADD CONSTRAINT "loyalty_lot_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_lot" ADD CONSTRAINT "loyalty_lot_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_ticket" ADD CONSTRAINT "assistance_ticket_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_ticket" ADD CONSTRAINT "assistance_ticket_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

