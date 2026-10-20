import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openDb, isProduction } from './lib/db.mjs';

const force = process.argv.includes('--force');

if (!process.env.DATABASE_URL) {
  if (isProduction()) {
    console.error('DATABASE_URL wajib di production. Reset dibatalkan.');
    process.exit(1);
  }
  const dataDir = process.env.PGLITE_DATA_DIR || path.resolve('.data', 'pglite');
  await fs.rm(dataDir, { recursive: true, force: true });
  console.log(`Database PGlite lokal dihapus: ${dataDir}`);
  console.log('Jalankan npm run db:setup untuk membuat ulang data demo.');
  process.exit(0);
}

if (!force || process.env.CONFIRM_RESET !== 'YES') {
  console.error(
    'Reset database PostgreSQL bersifat destruktif.\n' +
      'Jalankan ulang dengan --force dan CONFIRM_RESET=YES jika benar-benar yakin.'
  );
  process.exit(1);
}

const db = await openDb();
try {
  await db.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('Schema public PostgreSQL direset.');
} finally {
  await db.close();
}
