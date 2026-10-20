import { openDb, applySchema, tableCount } from './lib/db.mjs';
import { seedDatabase, DEMO_PASSWORD } from './lib/seed.mjs';

const db = await openDb();
try {
  await applySchema(db);
  const users = await tableCount(db, 'users');
  if (users > 0) {
    console.log('Database sudah berisi data. Seed demo dilewati.');
  } else {
    const result = await seedDatabase(db);
    if (result.skipped) {
      console.log(result.reason);
    } else {
      console.log('Seed demo development selesai.');
      console.log('Akun development:');
      console.log(`  owner@thiz.coffee     / ${DEMO_PASSWORD}  (OWNER)`);
      console.log(`  staff@thiz.coffee     / ${DEMO_PASSWORD}  (STAFF)`);
      console.log(`  inventory@thiz.coffee / ${DEMO_PASSWORD}  (INVENTORY)`);
      console.log('Ganti password sebelum dipakai di production.');
    }
  }
} finally {
  await db.close();
}
