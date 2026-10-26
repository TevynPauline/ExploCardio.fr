-- F16 : les comptes validés ou suspendus avant F16 ont été vérifiés par l'équipe selon l'ancienne
-- règle (RPPS ou SIRET) : leur numéro est considéré comme vérifié (pas de blocage des locations).
UPDATE "compte_client"
SET "numeroVerification" = 'verifie', "numeroVerifieLe" = COALESCE("valideLe", "modifieLe"), "numeroVerifiePar" = 'reprise F16'
WHERE "statut" IN ('valide', 'suspendu') AND "numeroVerification" IS NULL;
