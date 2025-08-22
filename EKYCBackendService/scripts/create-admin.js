#!/usr/bin/env node
/**
 * Seed script to create or update an admin user in SQLite.
 * Accepts input via environment variables or interactive prompts:
 *   - ADMIN_EMAIL
 *   - ADMIN_MOBILE (optional)
 *   - ADMIN_PASSWORD
 *
 * Behavior:
 *   - Ensures DB and migrations are initialized.
 *   - If admin with the same email exists:
 *       - If ADMIN_PASSWORD is provided, updates its password hash and mobile (if provided).
 *       - Otherwise, leaves password unchanged and prints info.
 *   - If no admin exists for the email, inserts a new admin row.
 *   - Safe to rerun.
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Ensure we can load DB and migrations from src
const migrate = require('../src/db/migrate'); // side-effect: runs migrations
const { get, run, DB_PATH } = require('../src/db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Simple masked prompt for password input
 */
function promptMasked(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.openStdin();
    process.stdin.on('data', (char) => {
      // Hide input characters
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          rl.output.write('\n');
          break;
        default:
          rl.output.write('\x1B[2K\x1B[200D' + question + Array(rl.line.length + 1).join('*'));
          break;
      }
    });

    rl.question(question, (value) => {
      rl.history = rl.history || [];
      rl.history.shift();
      rl.close();
      resolve(value);
    });
  });
}

/**
 * Simple text prompt (not masked)
 */
function promptText(question, { defaultValue } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const q = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(q, (value) => {
      rl.close();
      resolve(value || defaultValue || '');
    });
  });
}

async function ensureMigrations() {
  // migrate.js runs immediately on require, but we call migrate() by importing the file, which triggers it.
  // No-op here, but we keep function for clarity.
  return;
}

async function upsertAdmin({ email, mobile, password }) {
  const ts = Date.now();
  const existing = await get('SELECT * FROM admin_users WHERE email = ?', [email]);

  if (existing) {
    let updated = false;
    if (password) {
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      await run('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?', [
        password_hash,
        ts,
        existing.id,
      ]);
      updated = true;
    }
    if (mobile !== undefined && mobile !== null && mobile !== '') {
      await run('UPDATE admin_users SET updated_at = ? WHERE id = ?', [ts, existing.id]);
      // Mobile isn't a column in admin_users schema. We ignore storing it but allow passing in for parity per requirements.
      // Kept here for forward compatibility; document present schema limitation.
    }
    return {
      action: updated ? 'updated' : 'skipped',
      id: existing.id,
      email: existing.email,
      role: existing.role || 'admin',
      note:
        updated
          ? 'Existing admin found; password updated.'
          : 'Existing admin found; no password change requested.',
    };
  }

  if (!password) {
    throw new Error('ADMIN_PASSWORD is required when creating a new admin.');
  }
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const res = await run(
    'INSERT INTO admin_users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [email, password_hash, 'admin', ts, ts]
  );
  return { action: 'created', id: res.lastID, email, role: 'admin' };
}

function validateEmail(email) {
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
}

async function main() {
  try {
    console.log('Admin seed script starting...');
    console.log(`Using SQLite DB at: ${DB_PATH}`);

    await ensureMigrations();

    let email = process.env.ADMIN_EMAIL;
    let mobile = process.env.ADMIN_MOBILE; // currently not stored; optional input
    let password = process.env.ADMIN_PASSWORD;

    if (!email) {
      email = await promptText('Enter admin email', { defaultValue: 'admin@example.com' });
    }
    if (!validateEmail(email)) {
      throw new Error('Invalid email provided.');
    }

    if (mobile === undefined) {
      const m = await promptText('Enter admin mobile (optional)', { defaultValue: '' });
      mobile = m || '';
    }

    if (!password) {
      // Ask interactively if not provided via env
      password = await promptMasked('Enter admin password: ');
      const confirm = await promptMasked('Confirm admin password: ');
      if (password !== confirm) {
        throw new Error('Passwords do not match.');
      }
    }

    const result = await upsertAdmin({ email, mobile, password });
    console.log('------------------------------------------');
    console.log(
      result.action === 'created'
        ? `Admin created successfully.\n - id: ${result.id}\n - email: ${result.email}\n - role: ${result.role}`
        : `Admin ${result.email} ${result.action}.\n - id: ${result.id}\n - role: ${result.role}\n - note: ${result.note}`
    );
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create/update admin:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
