-- AlterTable
ALTER TABLE "message_demonstration" ADD COLUMN     "cle" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "message_demonstration_cle_key" ON "message_demonstration"("cle");

