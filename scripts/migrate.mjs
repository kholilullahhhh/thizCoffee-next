import { openDb, applySchema } from './lib/db.mjs';

const db = await openDb();
try {
  await applySchema(db);
  console.log(`Schema database berhasil diterapkan (${db.kind}).`);
} finally {
  await db.close();
}
