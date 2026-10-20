import { openDb, applySchema } from './lib/db.mjs';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const password = arg('password') || process.env.ADMIN_PASSWORD;
const email = arg('email') || process.env.ADMIN_EMAIL;
const name = arg('name') || process.env.ADMIN_NAME || 'Owner Thiz Coffee';

if (!email || !password) {
  console.error(
    'Usage: ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD="strong-password" npm run db:create-admin\n' +
      '       (or pass --email and --password; password minimal 8 karakter)'
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password minimal 8 karakter.');
  process.exit(1);
}

const { hashPassword } = await import('./lib/password.mjs');
const { randomUUID } = await import('node:crypto');
const db = await openDb();
try {
  await applySchema(db);
  const existing = await db.query('SELECT id FROM users WHERE lower(email) = lower($1)', [
    email,
  ]);
  const passwordHash = hashPassword(password);
  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    await db.query(
      `UPDATE users SET name = $1, password_hash = $2, role = 'OWNER', active = TRUE,
       updated_at = now() WHERE id = $3`,
      [name, passwordHash, userId]
    );
    console.log(`Akun OWNER diperbarui: ${email}`);
  } else {
    userId = randomUUID();
    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'OWNER')`,
      [userId, name, email, passwordHash]
    );
    console.log(`Akun OWNER dibuat: ${email}`);
  }
  await db.query(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, summary)
     VALUES ($1, $2, 'ADMIN_BOOTSTRAP', 'USER', $2, $3)`,
    [randomUUID(), userId, `Akun OWNER disiapkan melalui CLI: ${email}`]
  );
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.warn('Peringatan: production tanpa DATABASE_URL tidak akan memakai database persisten.');
  }
} finally {
  await db.close();
}
