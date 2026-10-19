-- AlterTable
ALTER TABLE "commande_site" ADD COLUMN     "conditionsLocationAccepteesLe" TIMESTAMP(3),
ADD COLUMN     "datesLivraisonMad" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "elementsAbonnement" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "paiementAbonnementRef" TEXT,
ADD COLUMN     "reservationsAppareils" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "suivi_location" (
    "abonnementRef" TEXT NOT NULL,
    "partenaireRef" TEXT NOT NULL,
    "dernierEtat" TEXT NOT NULL,
    "expedieNotifie" BOOLEAN NOT NULL DEFAULT false,
    "colisNonLivreNotifie" BOOLEAN NOT NULL DEFAULT false,
    "attenteChoixNotifie" BOOLEAN NOT NULL DEFAULT false,
    "impayeNotifie" BOOLEAN NOT NULL DEFAULT false,
    "retourNotifie" BOOLEAN NOT NULL DEFAULT false,
    "echeanceRappelee" TIMESTAMP(3),
    "rappelsRetour" INTEGER NOT NULL DEFAULT 0,
    "dernierRappelRetour" TIMESTAMP(3),
    "droitCloudRef" TEXT,
    "droitCloudEtat" TEXT,
    "notifieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suivi_location_pkey" PRIMARY KEY ("abonnementRef")
);

