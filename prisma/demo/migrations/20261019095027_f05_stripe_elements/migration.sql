-- AlterTable
ALTER TABLE "payment_session_demo" ADD COLUMN     "autorisationLiberee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "elements" JSONB NOT NULL DEFAULT '[]';

