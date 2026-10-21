-- AlterTable
ALTER TABLE "contenu" ADD COLUMN     "brouillon" TEXT,
ADD COLUMN     "cle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contenu_type_cle_key" ON "contenu"("type", "cle");

