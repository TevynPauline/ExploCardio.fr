-- CreateEnum
CREATE TYPE "VerificationNumero" AS ENUM ('a_verifier', 'verifie', 'refuse');

-- AlterTable
ALTER TABLE "compte_client" ADD COLUMN     "motifRefusNumero" TEXT,
ADD COLUMN     "numeroVerification" "VerificationNumero",
ADD COLUMN     "numeroVerifieLe" TIMESTAMP(3),
ADD COLUMN     "numeroVerifiePar" TEXT;

