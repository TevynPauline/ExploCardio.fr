-- CreateEnum
CREATE TYPE "EtapeCommande" AS ENUM ('adresses', 'livraison', 'paiement', 'recapitulatif', 'terminee');

-- CreateEnum
CREATE TYPE "MoyenPaiementCommande" AS ENUM ('carte', 'sepa', 'virement');

-- CreateEnum
CREATE TYPE "EtatPartieCommande" AS ENUM ('a_payer', 'paiement_en_cours', 'payee', 'a_enregistrer', 'en_attente_virement', 'refusee', 'sans_objet');

-- AlterTable
ALTER TABLE "demande_financement" ADD COLUMN     "cabinet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "commandeRef" TEXT,
ADD COLUMN     "mensualiteIndicativeHt" INTEGER,
ADD COLUMN     "modifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "panier" ADD COLUMN     "codePromo" TEXT,
ADD COLUMN     "utiliserBons" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "commande_site" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "etape" "EtapeCommande" NOT NULL DEFAULT 'adresses',
    "adresses" JSONB NOT NULL DEFAULT '{}',
    "modeLivraison" TEXT,
    "moyenPaiement" "MoyenPaiementCommande",
    "moyenAbonnement" "MoyenPaiementCommande",
    "cgvAccepteesLe" TIMESTAMP(3),
    "devis" JSONB,
    "lignes" JSONB NOT NULL DEFAULT '[]',
    "codePromo" TEXT,
    "bonsHt" INTEGER NOT NULL DEFAULT 0,
    "etatAchat" "EtatPartieCommande" NOT NULL DEFAULT 'sans_objet',
    "etatAbonnement" "EtatPartieCommande" NOT NULL DEFAULT 'sans_objet',
    "sessionAchat" TEXT,
    "sessionAbonnement" TEXT,
    "tentative" INTEGER NOT NULL DEFAULT 0,
    "reservationRef" TEXT,
    "odooCommandeRef" TEXT,
    "odooAbonnementRefs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "echeanceVirement" TIMESTAMP(3),
    "rappelVirementLe" TIMESTAMP(3),
    "motifRefus" TEXT,
    "echecsEnregistrement" INTEGER NOT NULL DEFAULT 0,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commande_site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suivi_commande" (
    "odooCommandeRef" TEXT NOT NULL,
    "dernierStatut" TEXT NOT NULL,
    "remboursementsTtc" INTEGER NOT NULL DEFAULT 0,
    "notifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suivi_commande_pkey" PRIMARY KEY ("odooCommandeRef")
);

-- CreateIndex
CREATE UNIQUE INDEX "commande_site_ref_key" ON "commande_site"("ref");

-- CreateIndex
CREATE INDEX "commande_site_compteId_etape_idx" ON "commande_site"("compteId", "etape");

-- CreateIndex
CREATE INDEX "commande_site_etatAchat_idx" ON "commande_site"("etatAchat");

-- AddForeignKey
ALTER TABLE "commande_site" ADD CONSTRAINT "commande_site_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

