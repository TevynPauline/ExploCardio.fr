-- CreateEnum
CREATE TYPE "EtatMessage" AS ENUM ('nouveau', 'en_cours', 'traite');

-- AlterTable
ALTER TABLE "demande_devis" ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "traitePar" TEXT;

-- AlterTable
ALTER TABLE "message_contact" ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "traiteLe" TIMESTAMP(3),
ADD COLUMN     "traitePar" TEXT;
-- Conversion sans perte : les valeurs inconnues deviennent « nouveau ».
ALTER TABLE "message_contact" ALTER COLUMN "etat" DROP DEFAULT;
ALTER TABLE "message_contact" ALTER COLUMN "etat" TYPE "EtatMessage" USING (CASE WHEN "etat" IN ('nouveau', 'en_cours', 'traite') THEN "etat" ELSE 'nouveau' END)::"EtatMessage";
ALTER TABLE "message_contact" ALTER COLUMN "etat" SET DEFAULT 'nouveau';

-- AlterTable
ALTER TABLE "utilisateur" ADD COLUMN     "desactiveLe" TIMESTAMP(3),
ADD COLUMN     "desactivePar" TEXT,
ADD COLUMN     "inviteLe" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "message_contact_etat_date_idx" ON "message_contact"("etat", "date");

