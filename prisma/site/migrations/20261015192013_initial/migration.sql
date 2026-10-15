-- CreateEnum
CREATE TYPE "Role" AS ENUM ('client', 'admin', 'commercial', 'support');

-- CreateEnum
CREATE TYPE "TypeCompteClient" AS ENUM ('medecin', 'structure');

-- CreateEnum
CREATE TYPE "StatutCompteClient" AS ENUM ('email_a_confirmer', 'en_attente', 'valide', 'refuse', 'suspendu');

-- CreateEnum
CREATE TYPE "TypeAdresse" AS ENUM ('cabinet', 'livraison', 'facturation');

-- CreateEnum
CREATE TYPE "TypeContenu" AS ENUM ('bandeau', 'tuile', 'actualite', 'page', 'faq', 'tutoriel', 'notice');

-- CreateEnum
CREATE TYPE "EtatPublication" AS ENUM ('preparation', 'publie', 'retire');

-- CreateEnum
CREATE TYPE "StatutDemandeFinancement" AS ENUM ('recue', 'en_etude', 'accordee', 'refusee');

-- CreateEnum
CREATE TYPE "StatutDemandeDevis" AS ENUM ('recue', 'en_cours', 'traitee');

-- CreateEnum
CREATE TYPE "TypeMessageDemonstration" AS ENUM ('email_client', 'notification_equipe_email', 'notification_equipe_sms');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "prenom" TEXT,
    "nom" TEXT,
    "civilite" TEXT,
    "telephone" TEXT,
    "specialite" TEXT,
    "role" "Role" NOT NULL DEFAULT 'client',

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compte_connexion" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compte_connexion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "double_authentification" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "double_authentification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compte_client" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" "TypeCompteClient" NOT NULL,
    "rpps" TEXT,
    "siret" TEXT,
    "nomCabinet" TEXT,
    "statut" "StatutCompteClient" NOT NULL DEFAULT 'email_a_confirmer',
    "motifRefus" TEXT,
    "odooPartnerRef" TEXT,
    "estDemonstration" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compte_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adresse" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "type" "TypeAdresse" NOT NULL,
    "ligne1" TEXT NOT NULL,
    "ligne2" TEXT,
    "codePostal" TEXT NOT NULL,
    "ville" TEXT NOT NULL,

    CONSTRAINT "adresse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentement" (
    "id" TEXT NOT NULL,
    "compteId" TEXT,
    "email" TEXT,
    "objet" TEXT NOT NULL,
    "etat" BOOLEAN NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origine" TEXT NOT NULL,
    "textePresente" TEXT NOT NULL,

    CONSTRAINT "consentement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contenu" (
    "id" TEXT NOT NULL,
    "type" "TypeContenu" NOT NULL,
    "titre" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "etat" "EtatPublication" NOT NULL DEFAULT 'preparation',
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contenu_produit" (
    "id" TEXT NOT NULL,
    "defaultCode" TEXT NOT NULL,
    "textes" JSONB NOT NULL DEFAULT '{}',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "compatibilites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "produitsAssocies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categorieAffichage" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "etat" "EtatPublication" NOT NULL DEFAULT 'preparation',
    "orphelin" BOOLEAN NOT NULL DEFAULT false,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contenu_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametre" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'texte',
    "roleModification" "Role" NOT NULL DEFAULT 'admin',
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametre_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "historique_parametre" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "auteurId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT NOT NULL,

    CONSTRAINT "historique_parametre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_financement" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "equipements" JSONB NOT NULL,
    "dureeMois" INTEGER NOT NULL,
    "statut" "StatutDemandeFinancement" NOT NULL DEFAULT 'recue',
    "notesInternes" TEXT,
    "opportuniteRef" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_financement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demande_devis" (
    "id" TEXT NOT NULL,
    "demandeur" JSONB NOT NULL,
    "objet" TEXT NOT NULL,
    "statut" "StatutDemandeDevis" NOT NULL DEFAULT 'recue',
    "notes" TEXT,
    "opportuniteRef" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_contact" (
    "id" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "coordonnees" JSONB NOT NULL,
    "texte" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etat" TEXT NOT NULL DEFAULT 'nouveau',

    CONSTRAINT "message_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_connecteur" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connecteur" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "objet" TEXT,
    "resultat" TEXT NOT NULL,
    "niveau" TEXT NOT NULL DEFAULT 'info',
    "motifErreur" TEXT,
    "dureeMs" INTEGER NOT NULL,

    CONSTRAINT "journal_connecteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_action" (
    "id" TEXT NOT NULL,
    "auteurId" TEXT,
    "auteur" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objet" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" JSONB,

    CONSTRAINT "journal_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenement_paiement_traite" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evenement_paiement_traite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_demonstration" (
    "id" TEXT NOT NULL,
    "type" "TypeMessageDemonstration" NOT NULL,
    "destinataire" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "rendu" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declencheur" TEXT NOT NULL,
    "etatRemise" TEXT NOT NULL DEFAULT 'remis',

    CONSTRAINT "message_demonstration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panne_simulee" (
    "connecteur" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "panne_simulee_pkey" PRIMARY KEY ("connecteur")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "compte_connexion_userId_idx" ON "compte_connexion"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "double_authentification_secret_idx" ON "double_authentification"("secret");

-- CreateIndex
CREATE INDEX "double_authentification_userId_idx" ON "double_authentification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "compte_client_utilisateurId_key" ON "compte_client"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "compte_client_rpps_key" ON "compte_client"("rpps");

-- CreateIndex
CREATE UNIQUE INDEX "compte_client_siret_key" ON "compte_client"("siret");

-- CreateIndex
CREATE INDEX "adresse_compteId_idx" ON "adresse"("compteId");

-- CreateIndex
CREATE INDEX "consentement_compteId_idx" ON "consentement"("compteId");

-- CreateIndex
CREATE INDEX "consentement_email_idx" ON "consentement"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contenu_produit_defaultCode_key" ON "contenu_produit"("defaultCode");

-- CreateIndex
CREATE INDEX "historique_parametre_cle_idx" ON "historique_parametre"("cle");

-- CreateIndex
CREATE INDEX "journal_connecteur_date_idx" ON "journal_connecteur"("date");

-- CreateIndex
CREATE INDEX "journal_connecteur_connecteur_date_idx" ON "journal_connecteur"("connecteur", "date");

-- CreateIndex
CREATE INDEX "journal_action_date_idx" ON "journal_action"("date");

-- CreateIndex
CREATE INDEX "message_demonstration_date_idx" ON "message_demonstration"("date");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compte_connexion" ADD CONSTRAINT "compte_connexion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "double_authentification" ADD CONSTRAINT "double_authentification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compte_client" ADD CONSTRAINT "compte_client_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adresse" ADD CONSTRAINT "adresse_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_parametre" ADD CONSTRAINT "historique_parametre_cle_fkey" FOREIGN KEY ("cle") REFERENCES "parametre"("cle") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_parametre" ADD CONSTRAINT "historique_parametre_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_financement" ADD CONSTRAINT "demande_financement_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
