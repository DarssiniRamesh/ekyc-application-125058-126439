require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db, DB_PATH } = require('./index');

/**
 * Reads all .sql files from the migrations directory and runs them sequentially.
 * This is a lightweight migration runner suitable for SQLite and simple projects.
 */
async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');

  // If migrations directory doesn't exist or is empty, just log and exit gracefully.
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found. Skipping migrations.');
    console.log('DB path:', DB_PATH);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // run in lexicographic order like 001_x.sql, 002_y.sql

  if (files.length === 0) {
    console.log('No migration files found. Skipping migrations.');
    console.log('DB path:', DB_PATH);
    return;
  }

  console.log(`Running ${files.length} migration(s) against DB at: ${DB_PATH}`);

  // Execute each SQL file
  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    await execMultiStatement(sql);
    console.log(`Applied migration: ${file}`);
  }

  console.log('Migrations complete.');
}

/**
 * Execute a multi-statement SQL script against sqlite3 using serialize and exec.
 * sqlite3 Database#exec supports multiple statements.
 */
function execMultiStatement(sql) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
