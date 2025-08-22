-- Migration: Create KYC verifications table to store results of mocked checks
BEGIN;

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  check_type TEXT NOT NULL, -- 'PAN' | 'AADHAAR' | 'KRA' | 'NPCI' | 'BANK'
  status TEXT NOT NULL,     -- 'success' | 'failed'
  message TEXT,
  raw_data TEXT,            -- JSON string containing provider payload
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_type ON kyc_verifications(user_id, check_type);

COMMIT;
