-- CreateTable
CREATE TABLE "followup_line" (
    "id" INTEGER NOT NULL,
    "niveau" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "joursAvantConsequence" INTEGER NOT NULL,
    "annonceConsequence" BOOLEAN NOT NULL DEFAULT false,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "followup_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "followup_line_niveau_key" ON "followup_line"("niveau");

