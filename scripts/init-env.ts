// scripts/init-env.ts
/**
 * Initialize environment variables BEFORE anything else
 * This module must be imported first in migration scripts
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';

// Log environment status
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
console.log('🔍 Проверяют файлы окружения:');
console.log(`  .env.local: ${fs.existsSync(envLocalPath) ? '✅ найден' : '❌ не найден'}`);
console.log(`  .env:       ${fs.existsSync(envPath) ? '✅ найден' : '❌ не найден'}`);

const databaseUrl = process.env.DATABASE_URL;
console.log(`  DATABASE_URL в process.env: ${databaseUrl ? '✅ загружена' : '❌ не найдена'}`);

if (databaseUrl) {
  const displayUrl = databaseUrl.length > 30 
    ? databaseUrl.substring(0, 30) + '...' 
    : databaseUrl;
  console.log(`  Значение: ${displayUrl}`);
  console.log(`  Длина: ${databaseUrl.length} символов`);
}

if (!databaseUrl) {
  console.error(
    '\n❌ DATABASE_URL environment variable is not set.\n\n' +
    'Убедитесь, что .env.local содержит DATABASE_URL'
  );
  process.exit(1);
}

console.log('✅ Переменные окружения загружены\n');
