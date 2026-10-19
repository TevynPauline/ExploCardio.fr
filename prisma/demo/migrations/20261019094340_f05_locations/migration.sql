-- CreateEnum
CREATE TYPE "EtatReservationAppareil" AS ENUM ('active', 'consommee', 'liberee');

-- CreateEnum
CREATE TYPE "OrigineKit" AS ENUM ('achat', 'enregistrement');

-- CreateEnum
CREATE TYPE "EtatRetour" AS ENUM ('complet', 'degrade', 'perdu');

-- AlterEnum
BEGIN;
CREATE TYPE "EtatAbonnement_new" AS ENUM ('commandee', 'en_cours', 'resiliation_prevue', 'en_retard_retour', 'suspendue_impaye', 'terminee', 'annulee');
ALTER TABLE "public"."sale_subscription" ALTER COLUMN "etat" DROP DEFAULT;
ALTER TABLE "sale_subscription" ALTER COLUMN "etat" TYPE "EtatAbonnement_new" USING ((CASE WHEN "etat"::text = 'termine' THEN 'terminee' ELSE "etat"::text END)::"EtatAbonnement_new");
ALTER TYPE "EtatAbonnement" RENAME TO "EtatAbonnement_old";
ALTER TYPE "EtatAbonnement_new" RENAME TO "EtatAbonnement";
DROP TYPE "public"."EtatAbonnement_old";
ALTER TABLE "sale_subscription" ALTER COLUMN "etat" SET DEFAULT 'en_cours';
COMMIT;

-- AlterTable
ALTER TABLE "rental_offer" ADD COLUMN     "contenuPack" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "logiciel" TEXT;

-- AlterTable
ALTER TABLE "sale_subscription" ADD COLUMN     "attenteChoixClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "colisNonLivre" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commandeId" INTEGER,
ADD COLUMN     "dateLimiteRetour" TIMESTAMP(3),
ADD COLUMN     "dateLivraison" TIMESTAMP(3),
ADD COLUMN     "etatRetour" "EtatRetour",
ADD COLUMN     "expedieLe" TIMESTAMP(3),
ADD COLUMN     "expeditionBloquee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "impayeDepuis" TIMESTAMP(3),
ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "montantDegradationCentimes" INTEGER,
ADD COLUMN     "rappelsRetour" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suivi" TEXT,
ADD COLUMN     "tentativesPrelevement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transporteur" TEXT;

-- AlterTable
ALTER TABLE "stock_lot" ADD COLUMN     "historique" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "stock_lot_reservation" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "numeroSerieId" INTEGER NOT NULL,
    "dateLivraison" TIMESTAMP(3) NOT NULL,
    "etat" "EtatReservationAppareil" NOT NULL DEFAULT 'active',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_lot_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_settings" (
    "id" SERIAL NOT NULL,
    "tentativesPrelevement" INTEGER NOT NULL DEFAULT 3,
    "espacementTentativesJours" INTEGER NOT NULL DEFAULT 3,
    "delaiRegularisationJours" INTEGER NOT NULL DEFAULT 10,
    "delaiRetourJoursOuvres" INTEGER NOT NULL DEFAULT 5,
    "toleranceRetardJours" INTEGER NOT NULL DEFAULT 5,
    "delaiNonRetourJours" INTEGER NOT NULL DEFAULT 30,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rental_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "res_partner_kit" (
    "id" SERIAL NOT NULL,
    "partenaireId" INTEGER NOT NULL,
    "kitDefaultCode" TEXT NOT NULL,
    "origine" "OrigineKit" NOT NULL,
    "commandeId" INTEGER,
    "auteur" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "res_partner_kit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_lot_reservation_cle_key" ON "stock_lot_reservation"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "res_partner_kit_partenaireId_kitDefaultCode_key" ON "res_partner_kit"("partenaireId", "kitDefaultCode");

-- AddForeignKey
ALTER TABLE "stock_lot_reservation" ADD CONSTRAINT "stock_lot_reservation_numeroSerieId_fkey" FOREIGN KEY ("numeroSerieId") REFERENCES "stock_lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "res_partner_kit" ADD CONSTRAINT "res_partner_kit_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_subscription" ADD CONSTRAINT "sale_subscription_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

