-- CreateTable
CREATE TABLE "ecriture_odoo" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "resultat" JSONB NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecriture_odoo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecriture_odoo_base_cle_key" ON "ecriture_odoo"("base", "cle");
