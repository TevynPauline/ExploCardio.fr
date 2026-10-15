-- CreateEnum
CREATE TYPE "TypeArticle" AS ENUM ('equipement', 'consommable', 'accessoire', 'logiciel', 'service');

-- CreateEnum
CREATE TYPE "EtatStock" AS ENUM ('disponible', 'delai', 'indisponible');

-- CreateEnum
CREATE TYPE "StatutParc" AS ENUM ('disponible', 'loue', 'en_retour', 'en_maintenance');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('brouillon', 'confirmee', 'expediee', 'livree', 'annulee', 'remboursee');

-- CreateEnum
CREATE TYPE "ObjetAbonnement" AS ENUM ('mise_a_disposition', 'logiciel');

-- CreateEnum
CREATE TYPE "EtatAbonnement" AS ENUM ('en_cours', 'resiliation_prevue', 'termine', 'en_retard_retour');

-- CreateEnum
CREATE TYPE "TypeFacture" AS ENUM ('facture', 'remboursement');

-- CreateEnum
CREATE TYPE "TypeOpportunite" AS ENUM ('financement', 'devis');

-- CreateEnum
CREATE TYPE "EtatAccesCloud" AS ENUM ('a_ouvrir', 'actif', 'grace', 'suspendu', 'ferme');

-- CreateTable
CREATE TABLE "res_partner" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "estSociete" BOOLEAN NOT NULL DEFAULT false,
    "parentId" INTEGER,
    "email" TEXT,
    "telephone" TEXT,
    "rpps" TEXT,
    "siret" TEXT,
    "adresses" JSONB NOT NULL DEFAULT '[]',
    "cleCreation" TEXT,
    "bienvenueRecue" BOOLEAN NOT NULL DEFAULT false,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "res_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_template" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "type" "TypeArticle" NOT NULL,
    "description" TEXT,
    "formules" TEXT[],
    "eligibleBonsAchat" BOOLEAN NOT NULL DEFAULT false,
    "suiviNumeroSerie" BOOLEAN NOT NULL DEFAULT false,
    "referenceFictive" BOOLEAN NOT NULL DEFAULT false,
    "compatibleAvec" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_product" (
    "id" SERIAL NOT NULL,
    "modeleId" INTEGER NOT NULL,
    "defaultCode" TEXT NOT NULL,
    "referenceFabricant" TEXT,
    "configuration" TEXT,
    "attributs" JSONB NOT NULL DEFAULT '{}',
    "prixHtCentimes" INTEGER NOT NULL,
    "tauxTva" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "prixInvente" BOOLEAN NOT NULL DEFAULT true,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_quant" (
    "id" SERIAL NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "etatHorsStock" "EtatStock" NOT NULL DEFAULT 'delai',
    "delaiJours" INTEGER,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stock_quant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_move" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "defaultCode" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lot" (
    "id" SERIAL NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "statut" "StatutParc" NOT NULL DEFAULT 'disponible',
    "retourPrevu" TIMESTAMP(3),
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "stock_lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pricelist" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "partenaireId" INTEGER,
    "regles" JSONB NOT NULL,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_pricelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_scale" (
    "id" SERIAL NOT NULL,
    "dureeMois" INTEGER NOT NULL,
    "coefficient" DECIMAL(6,3) NOT NULL,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "financing_scale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_offer" (
    "id" SERIAL NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "premierMoisCentimes" INTEGER NOT NULL,
    "moisSuivantsCentimes" INTEGER NOT NULL,
    "kitRequis" TEXT,
    "valeurRemplacementCentimes" INTEGER NOT NULL,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rental_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_order" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "cle" TEXT,
    "partenaireId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantHtCentimes" INTEGER NOT NULL,
    "tvaCentimes" INTEGER NOT NULL,
    "montantTtcCentimes" INTEGER NOT NULL,
    "fraisPortCentimes" INTEGER NOT NULL DEFAULT 0,
    "bonsUtilisesCentimes" INTEGER NOT NULL DEFAULT 0,
    "modePaiement" TEXT NOT NULL,
    "referencePaiement" TEXT,
    "statut" "StatutCommande" NOT NULL DEFAULT 'confirmee',
    "financee" BOOLEAN NOT NULL DEFAULT false,
    "livraison" JSONB NOT NULL DEFAULT '{}',
    "suivi" TEXT,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sale_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_order_line" (
    "id" SERIAL NOT NULL,
    "commandeId" INTEGER NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaireHtCentimes" INTEGER NOT NULL,
    "remiseCentimes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sale_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_subscription" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "cle" TEXT,
    "partenaireId" INTEGER NOT NULL,
    "objet" "ObjetAbonnement" NOT NULL,
    "varianteId" INTEGER NOT NULL,
    "numeroSerieId" INTEGER,
    "montantMensuelCentimes" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "prochaineEcheance" TIMESTAMP(3),
    "etat" "EtatAbonnement" NOT NULL DEFAULT 'en_cours',
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sale_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_move" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "TypeFacture" NOT NULL DEFAULT 'facture',
    "partenaireId" INTEGER NOT NULL,
    "commandeId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantHtCentimes" INTEGER NOT NULL,
    "tvaCentimes" INTEGER NOT NULL,
    "montantTtcCentimes" INTEGER NOT NULL,
    "etatPaiement" TEXT NOT NULL DEFAULT 'paye',
    "lignes" JSONB NOT NULL DEFAULT '[]',
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "account_move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_program" (
    "id" SERIAL NOT NULL,
    "paliers" JSONB NOT NULL,
    "validiteMois" INTEGER NOT NULL DEFAULT 12,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "loyalty_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistance_rule" (
    "id" SERIAL NOT NULL,
    "seuilCentimes" INTEGER NOT NULL,
    "dureeJours" INTEGER NOT NULL,
    "prolongation" TEXT NOT NULL DEFAULT 'cumul',
    "plafondJours" INTEGER NOT NULL,
    "prixActeCentimes" INTEGER NOT NULL,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assistance_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_history" (
    "id" SERIAL NOT NULL,
    "partenaireId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "montantCentimes" INTEGER NOT NULL,
    "commandeId" INTEGER,
    "cle" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validiteFin" TIMESTAMP(3),
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "loyalty_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistance_right" (
    "id" SERIAL NOT NULL,
    "partenaireId" INTEGER NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "origine" TEXT NOT NULL,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assistance_right_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_promotion" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cible" JSONB NOT NULL DEFAULT '{}',
    "remisePourcent" DECIMAL(5,2),
    "remiseCentimes" INTEGER,
    "debut" TIMESTAMP(3),
    "fin" TIMESTAMP(3),
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "cumulable" BOOLEAN NOT NULL DEFAULT false,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "loyalty_promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lead" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "type" "TypeOpportunite" NOT NULL,
    "partenaireId" INTEGER,
    "referenceDemande" TEXT NOT NULL,
    "contenu" JSONB NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'nouvelle',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crm_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_access" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "cle" TEXT,
    "partenaireId" INTEGER NOT NULL,
    "logiciel" TEXT NOT NULL,
    "etat" "EtatAccesCloud" NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "finPrevue" TIMESTAMP(3),
    "motif" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,
    "estFictif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cloud_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_sequence" (
    "code" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ir_sequence_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "res_partner_ref_key" ON "res_partner"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "res_partner_rpps_key" ON "res_partner"("rpps");

-- CreateIndex
CREATE UNIQUE INDEX "res_partner_cleCreation_key" ON "res_partner"("cleCreation");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_code_key" ON "product_category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_product_defaultCode_key" ON "product_product"("defaultCode");

-- CreateIndex
CREATE UNIQUE INDEX "stock_quant_varianteId_key" ON "stock_quant"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_move_cle_defaultCode_key" ON "stock_move"("cle", "defaultCode");

-- CreateIndex
CREATE UNIQUE INDEX "stock_lot_numero_key" ON "stock_lot"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "financing_scale_dureeMois_key" ON "financing_scale"("dureeMois");

-- CreateIndex
CREATE UNIQUE INDEX "rental_offer_varianteId_key" ON "rental_offer"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_order_ref_key" ON "sale_order"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "sale_order_cle_key" ON "sale_order"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "sale_subscription_ref_key" ON "sale_subscription"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "sale_subscription_cle_key" ON "sale_subscription"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "account_move_numero_key" ON "account_move"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_history_cle_key" ON "loyalty_history"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "assistance_right_partenaireId_key" ON "assistance_right"("partenaireId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_promotion_code_key" ON "loyalty_promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_ref_key" ON "crm_lead"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_cle_key" ON "crm_lead"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_access_ref_key" ON "cloud_access"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_access_cle_key" ON "cloud_access"("cle");

-- AddForeignKey
ALTER TABLE "res_partner" ADD CONSTRAINT "res_partner_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "res_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_template" ADD CONSTRAINT "product_template_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_product" ADD CONSTRAINT "product_product_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "product_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_quant" ADD CONSTRAINT "stock_quant_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lot" ADD CONSTRAINT "stock_lot_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pricelist" ADD CONSTRAINT "product_pricelist_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_offer" ADD CONSTRAINT "rental_offer_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_order" ADD CONSTRAINT "sale_order_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_order_line" ADD CONSTRAINT "sale_order_line_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_order_line" ADD CONSTRAINT "sale_order_line_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_subscription" ADD CONSTRAINT "sale_subscription_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_subscription" ADD CONSTRAINT "sale_subscription_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "product_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_subscription" ADD CONSTRAINT "sale_subscription_numeroSerieId_fkey" FOREIGN KEY ("numeroSerieId") REFERENCES "stock_lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_move" ADD CONSTRAINT "account_move_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_move" ADD CONSTRAINT "account_move_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_history" ADD CONSTRAINT "loyalty_history_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_history" ADD CONSTRAINT "loyalty_history_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "sale_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistance_right" ADD CONSTRAINT "assistance_right_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead" ADD CONSTRAINT "crm_lead_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_access" ADD CONSTRAINT "cloud_access_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "res_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
