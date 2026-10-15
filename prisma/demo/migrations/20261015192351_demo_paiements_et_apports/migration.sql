-- AlterTable
ALTER TABLE "assistance_right" ADD COLUMN     "apports" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "payment_session_demo" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "commandeRef" TEXT,
    "abonnementRef" TEXT,
    "partenaireRef" TEXT NOT NULL,
    "montantTtcCentimes" INTEGER NOT NULL,
    "montantMensuelTtcCentimes" INTEGER,
    "moyens" TEXT[],
    "urlRetour" TEXT NOT NULL,
    "urlAnnulation" TEXT NOT NULL,
    "etat" TEXT NOT NULL DEFAULT 'ouverte',
    "paiementRef" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "payment_session_demo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_demo" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "paiementRef" TEXT NOT NULL,
    "montantTtcCentimes" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "refund_demo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_session_demo_cle_key" ON "payment_session_demo"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "refund_demo_cle_key" ON "refund_demo"("cle");
