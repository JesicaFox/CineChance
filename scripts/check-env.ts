#!/usr/bin/env node
/**
 * Check environment variables - debug script
 * Проверяет, какие переменные окружения доступны приложению и скриптам
 */

import 'dotenv/config';

console.log('📋 Доступные переменные окружения:\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('TMDB_API_KEY:', process.env.TMDB_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ NOT SET');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '(default)');
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log('\n📂 Проверка файлов окружения:');
const path = require('path');
const fs = require('fs');

const files = ['.env.local', '.env', '.env.production', '.env.development'];
for (const file of files) {
  const filePath = path.resolve(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${file}: ${exists ? '✅' : '❌'}`);
}

if (process.env.DATABASE_URL) {
  console.log('\n✅ Переменные загружены успешно!');
  console.log('   Скрипт миграции должен работать:');
  console.log('   npx ts-node scripts/migrate-anime-cartoon-mediaType.ts');
} else {
  console.log('\n❌ DATABASE_URL не установлена.');
  console.log('   Попробуйте:');
  console.log('   1. Создайте .env.local в корне проекта с DATABASE_URL=...');
  console.log('   2. Или экспортируйте переменную:');
  console.log('      export DATABASE_URL="postgresql://..."');
  console.log('      npx ts-node scripts/migrate-anime-cartoon-mediaType.ts');
}
