#!/bin/bash
# scripts/run-migration.sh - Helper script to run the migration with environment setup

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo ""
  echo "Please set the DATABASE_URL variable before running this script:"
  echo "  export DATABASE_URL='postgresql://user:password@host/database'"
  echo "  $0"
  echo ""
  echo "Or run it directly:"
  echo "  DATABASE_URL='your-connection-string' npx ts-node scripts/migrate-anime-cartoon-mediaType.ts"
  exit 1
fi

echo "🚀 Running migration with DATABASE_URL: ${DATABASE_URL:0:30}..."
npx ts-node --project scripts/tsconfig.json scripts/migrate-anime-cartoon-mediaType.ts
