import { openDb, applySchema } from './lib/db.mjs';
import { seedDatabase, DEMO_PASSWORD } from './lib/seed.mjs';

const db = await openDb();
try {
  await applySchema(db);
  const result = await seedDatabase(db, {
    allowProduction: process.env.SEED_DEMO === 'true',
  });
  if (result.skipped) {
    console.log(result.reason);
  } else {
    console.log('Seed demo development selesai.');
    console.log(`Login demo: owner@thiz.coffee / ${DEMO_PASSWORD}`);
    console.log('Seed hanya untuk development. Jangan gunakan kredensial ini di production.');
  }
} finally {
  await db.close();
}
