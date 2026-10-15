#!/usr/bin/env bash
# Crée et applique une migration Prisma sans invite interactive.
# Usage : scripts/nouvelle-migration.sh site|demo nom_de_la_migration
set -euo pipefail
base="$1"; nom="$2"
config="prisma/$base/prisma.config.ts"
dossier="prisma/$base/migrations/$(date +%Y%m%d%H%M%S)_$nom"
mkdir -p "$dossier"
npx prisma migrate diff --config "$config" --from-config-datasource --to-schema "prisma/$base/schema.prisma" --script > "$dossier/migration.sql"
npx prisma migrate deploy --config "$config"
npx prisma generate --config "$config"
