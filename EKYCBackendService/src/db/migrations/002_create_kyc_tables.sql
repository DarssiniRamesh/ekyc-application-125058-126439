-- Migration: Create KYC onboarding tables (profile, identity, address, bank)

BEGIN;

-- PROFILE: basic personal info
CREATE TABLE IF NOT EXISTS kyc_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  dob TEXT, -- ISO date string YYYY-MM-DD
  gender TEXT,
  marital_status TEXT,
  email TEXT,
  mobile TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kyc_profiles_user ON kyc_profiles(user_id);

-- IDENTITY: PAN/Aadhaar & basic identity states
CREATE TABLE IF NOT EXISTS kyc_identities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  pan TEXT,         -- Permanent Account Number (optional at this stage)
  aadhaar TEXT,     -- Aadhaar number (optional at this stage)
  pan_verified INTEGER DEFAULT 0,     -- 0/1 flags
  aadhaar_verified INTEGER DEFAULT 0, -- 0/1 flags
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kyc_identities_user ON kyc_identities(user_id);

-- ADDRESS: current and permanent address
CREATE TABLE IF NOT EXISTS kyc_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  line1 TEXT,
  line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  address_type TEXT, -- e.g., 'current' or 'permanent' (for phase2 can be single)
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kyc_addresses_user ON kyc_addresses(user_id);

-- BANK: user's bank details
CREATE TABLE IF NOT EXISTS kyc_banks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  account_holder_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  bank_name TEXT,
  branch TEXT,
  verified INTEGER DEFAULT 0, -- 0/1 for verification status
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kyc_banks_user ON kyc_banks(user_id);

COMMIT;
