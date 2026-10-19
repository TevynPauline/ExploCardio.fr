-- AlterTable
ALTER TABLE "account_refund" ADD COLUMN     "bonsDeduitsHtCentimes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deductionTtcCentimes" INTEGER NOT NULL DEFAULT 0;

