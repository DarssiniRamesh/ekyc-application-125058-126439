-- Migration: Create users table
-- This migration creates the users table with fields required for auth and OTP flow.

BEGIN;

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

-- Helpful indices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);

COMMIT;
