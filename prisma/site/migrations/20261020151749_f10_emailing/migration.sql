-- CreateEnum
CREATE TYPE "FamilleEmail" AS ENUM ('transactionnel', 'service', 'commercial', 'equipe');

-- CreateEnum
CREATE TYPE "ScenarioEmail" AS ENUM ('reapprovisionnement', 'panier_abandonne', 'alerte_bons', 'alerte_droits', 'impaye', 'campagne');

-- CreateEnum
CREATE TYPE "EtatEnvoi" AS ENUM ('programme', 'envoye', 'remis', 'rejete', 'annule', 'bloque');

-- CreateEnum
CREATE TYPE "TypeCampagne" AS ENUM ('promotion', 'vente_flash', 'nouveaute');

-- CreateEnum
CREATE TYPE "EtatCampagne" AS ENUM ('brouillon', 'programmee', 'en_cours', 'envoyee', 'annulee');

-- AlterTable
ALTER TABLE "message_demonstration" ADD COLUMN     "ouvertLe" TIMESTAMP(3),
ADD COLUMN     "texte" TEXT;

-- CreateTable
CREATE TABLE "envoi" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "famille" "FamilleEmail" NOT NULL,
    "modele" TEXT NOT NULL,
    "scenario" "ScenarioEmail",
    "compteId" TEXT,
    "destinataire" TEXT NOT NULL,
    "declencheur" TEXT NOT NULL,
    "variables" JSONB,
    "rendu" TEXT,
    "texte" TEXT,
    "objet" TEXT,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "campagneId" TEXT,
    "etat" "EtatEnvoi" NOT NULL DEFAULT 'programme',
    "motif" TEXT,
    "programmeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "essais" INTEGER NOT NULL DEFAULT 0,
    "prochainEssai" TIMESTAMP(3),
    "envoyeLe" TIMESTAMP(3),
    "remisLe" TIMESTAMP(3),
    "ouvertLe" TIMESTAMP(3),
    "connecteurEnvoiId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modele_email" (
    "code" TEXT NOT NULL,
    "textesPublies" JSONB,
    "textesBrouillon" JSONB,
    "publieLe" TIMESTAMP(3),
    "publiePar" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,
    "modifiePar" TEXT,

    CONSTRAINT "modele_email_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "preferences_email" (
    "email" TEXT NOT NULL,
    "compteId" TEXT,
    "reapprovisionnement" BOOLEAN NOT NULL DEFAULT true,
    "panierAbandonne" BOOLEAN NOT NULL DEFAULT true,
    "alerteBons" BOOLEAN NOT NULL DEFAULT true,
    "alerteDroits" BOOLEAN NOT NULL DEFAULT true,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferences_email_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "adresse_rejetee" (
    "email" TEXT NOT NULL,
    "rejetsTemporaires" INTEGER NOT NULL DEFAULT 0,
    "suspendueLe" TIMESTAMP(3),
    "motif" TEXT,
    "leveeLe" TIMESTAMP(3),
    "leveePar" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adresse_rejetee_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "campagne" (
    "id" TEXT NOT NULL,
    "type" "TypeCampagne" NOT NULL,
    "objet" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "lien" TEXT,
    "libelleLien" TEXT,
    "programmeePour" TIMESTAMP(3),
    "etat" "EtatCampagne" NOT NULL DEFAULT 'brouillon',
    "testEnvoyeLe" TIMESTAMP(3),
    "destinataires" INTEGER,
    "creePar" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campagne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "envoi_cle_key" ON "envoi"("cle");

-- CreateIndex
CREATE INDEX "envoi_etat_programmeLe_idx" ON "envoi"("etat", "programmeLe");

-- CreateIndex
CREATE INDEX "envoi_destinataire_creeLe_idx" ON "envoi"("destinataire", "creeLe");

-- CreateIndex
CREATE INDEX "envoi_compteId_creeLe_idx" ON "envoi"("compteId", "creeLe");

-- CreateIndex
CREATE INDEX "envoi_scenario_creeLe_idx" ON "envoi"("scenario", "creeLe");

-- CreateIndex
CREATE INDEX "envoi_campagneId_idx" ON "envoi"("campagneId");

-- CreateIndex
CREATE INDEX "preferences_email_compteId_idx" ON "preferences_email"("compteId");

