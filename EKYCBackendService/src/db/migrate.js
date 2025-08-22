require('dotenv').config();
const { run, DB_PATH } = require('./index');

async function migrate() {
  // Create users table with required columns
  const sql = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    mobile TEXT UNIQUE,
    password_hash TEXT,
    otp_code TEXT,
    otp_expires_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `;
  await run(sql);
  // Add basic indices if not present
  await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  await run('CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);');
  console.log('Migration complete. DB at:', DB_PATH);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
