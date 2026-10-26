-- CreateTable
CREATE TABLE "fichier_stocke" (
    "chemin" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "octets" BYTEA NOT NULL,
    "taille" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichier_stocke_pkey" PRIMARY KEY ("chemin")
);

