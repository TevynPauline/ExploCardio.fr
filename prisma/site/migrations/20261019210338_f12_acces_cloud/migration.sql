-- CreateEnum
CREATE TYPE "OrigineAcces" AS ENUM ('periode_incluse', 'location', 'abonnement', 'manuel');

-- CreateEnum
CREATE TYPE "EtatAccesLogiciel" AS ENUM ('en_ouverture', 'actif', 'grace', 'suspendu', 'ferme');

-- CreateEnum
CREATE TYPE "ActionTacheAcces" AS ENUM ('ouvrir', 'suspendre', 'retablir', 'fermer');

-- CreateEnum
CREATE TYPE "EtatTacheAcces" AS ENUM ('a_faire', 'realisee');

-- AlterTable
ALTER TABLE "suivi_location" DROP COLUMN "droitCloudEtat",
DROP COLUMN "droitCloudRef";

-- CreateTable
CREATE TABLE "acces_logiciel" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "partenaireRef" TEXT NOT NULL,
    "logiciel" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "origine" "OrigineAcces" NOT NULL,
    "sourceRef" TEXT,
    "pcaRef" TEXT,
    "etat" "EtatAccesLogiciel" NOT NULL DEFAULT 'en_ouverture',
    "debut" TIMESTAMP(3) NOT NULL,
    "finPrevue" TIMESTAMP(3),
    "finGrace" TIMESTAMP(3),
    "sansGrace" BOOLEAN NOT NULL DEFAULT false,
    "ouvertureNotifiee" BOOLEAN NOT NULL DEFAULT false,
    "rappelPeriodePour" TIMESTAMP(3),
    "rappelFinPour" TIMESTAMP(3),
    "graceNotifiee" BOOLEAN NOT NULL DEFAULT false,
    "fermetureNotifiee" BOOLEAN NOT NULL DEFAULT false,
    "alerteLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acces_logiciel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tache_acces" (
    "id" TEXT NOT NULL,
    "accesId" TEXT NOT NULL,
    "action" "ActionTacheAcces" NOT NULL,
    "echeance" TIMESTAMP(3) NOT NULL,
    "etat" "EtatTacheAcces" NOT NULL DEFAULT 'a_faire',
    "alerteLe" TIMESTAMP(3),
    "confirmeeLe" TIMESTAMP(3),
    "confirmeePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tache_acces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acces_logiciel_pcaRef_key" ON "acces_logiciel"("pcaRef");

-- CreateIndex
CREATE INDEX "acces_logiciel_etat_idx" ON "acces_logiciel"("etat");

-- CreateIndex
CREATE INDEX "acces_logiciel_partenaireRef_idx" ON "acces_logiciel"("partenaireRef");

-- CreateIndex
CREATE UNIQUE INDEX "acces_logiciel_partenaireRef_logiciel_origine_sourceRef_key" ON "acces_logiciel"("partenaireRef", "logiciel", "origine", "sourceRef");

-- CreateIndex
CREATE INDEX "tache_acces_etat_idx" ON "tache_acces"("etat");

-- AddForeignKey
ALTER TABLE "acces_logiciel" ADD CONSTRAINT "acces_logiciel_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tache_acces" ADD CONSTRAINT "tache_acces_accesId_fkey" FOREIGN KEY ("accesId") REFERENCES "acces_logiciel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

