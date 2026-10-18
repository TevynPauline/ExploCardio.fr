-- AlterTable
ALTER TABLE "account_move" ADD COLUMN     "cle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "account_move_cle_key" ON "account_move"("cle");

