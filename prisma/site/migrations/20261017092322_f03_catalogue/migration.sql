-- CreateEnum
CREATE TYPE "FormulePanier" AS ENUM ('achat', 'mise_a_disposition');

-- AlterTable
ALTER TABLE "contenu_produit" ADD COLUMN     "anciensSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publieLe" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "sousCategorieId" TEXT;

-- CreateTable
CREATE TABLE "sous_categorie" (
    "id" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sous_categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panier" (
    "id" TEXT NOT NULL,
    "jetonEmpreinte" TEXT,
    "compteId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ligne_panier" (
    "id" TEXT NOT NULL,
    "panierId" TEXT NOT NULL,
    "defaultCode" TEXT NOT NULL,
    "formule" "FormulePanier" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixHtConstate" INTEGER NOT NULL,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ligne_panier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sous_categorie_categorie_libelle_key" ON "sous_categorie"("categorie", "libelle");

-- CreateIndex
CREATE UNIQUE INDEX "sous_categorie_categorie_slug_key" ON "sous_categorie"("categorie", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "panier_jetonEmpreinte_key" ON "panier"("jetonEmpreinte");

-- CreateIndex
CREATE UNIQUE INDEX "panier_compteId_key" ON "panier"("compteId");

-- CreateIndex
CREATE UNIQUE INDEX "ligne_panier_panierId_defaultCode_formule_key" ON "ligne_panier"("panierId", "defaultCode", "formule");

-- CreateIndex
CREATE UNIQUE INDEX "contenu_produit_slug_key" ON "contenu_produit"("slug");

-- AddForeignKey
ALTER TABLE "contenu_produit" ADD CONSTRAINT "contenu_produit_sousCategorieId_fkey" FOREIGN KEY ("sousCategorieId") REFERENCES "sous_categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panier" ADD CONSTRAINT "panier_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_panier" ADD CONSTRAINT "ligne_panier_panierId_fkey" FOREIGN KEY ("panierId") REFERENCES "panier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

