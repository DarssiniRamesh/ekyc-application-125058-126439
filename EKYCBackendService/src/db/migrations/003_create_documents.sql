-- Migration: Create documents table for file uploads and metadata

BEGIN;

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  category TEXT, -- e.g., 'pan', 'address', 'bank', 'income', 'nominee', 'signature', 'other'
  description TEXT,
  path TEXT NOT NULL, -- relative path to uploads dir
  checksum TEXT, -- optional SHA256 or similar
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

COMMIT;
