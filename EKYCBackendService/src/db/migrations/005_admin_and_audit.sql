-- Migration: Admin users, review workflow, and audit logging

BEGIN;

-- Admin users table (separate from end-users table)
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- future: super_admin, auditor, etc.
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Application review state table: one row per end-user being reviewed
-- Tracks current status and assignment
CREATE TABLE IF NOT EXISTS kyc_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING|UNDER_REVIEW|APPROVED|REJECTED
  assigned_admin_id INTEGER, -- nullable
  last_action TEXT, -- e.g., 'SUBMITTED','APPROVED','REJECTED'
  last_action_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(assigned_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_kyc_applications_status ON kyc_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_assigned ON kyc_applications(assigned_admin_id);

-- Audit log table for admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- e.g., 'ADMIN_LOGIN','VIEW_APPLICATION','APPROVE','REJECT'
  entity_type TEXT,     -- e.g., 'APPLICATION','DOCUMENT','USER'
  entity_id INTEGER,    -- id of the entity (e.g., kyc_applications.id)
  details TEXT,         -- JSON with additional context
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Seed a default admin if none exists (email: admin@example.com / password: admin123)
-- NOTE: password hash is left empty here; it will be set by runtime seeding if needed.
-- Keeping SQL-only migration deterministic; runtime will insert on startup.

COMMIT;
