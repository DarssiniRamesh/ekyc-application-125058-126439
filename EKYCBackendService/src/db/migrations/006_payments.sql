-- Migration: Create payments tables for fee calculation, initiation, status, and receipts

BEGIN;

-- Payment intents/transactions table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  application_id INTEGER, -- optional link to kyc_applications
  amount INTEGER NOT NULL, -- amount in minor units (e.g., paise)
  currency TEXT NOT NULL DEFAULT 'INR',
  fee_breakdown TEXT, -- JSON string for calculation details
  provider TEXT NOT NULL DEFAULT 'MOCK_STRIPE', -- or 'MOCK_BILLDESK'
  provider_intent_id TEXT, -- mock intent id
  status TEXT NOT NULL DEFAULT 'REQUIRES_PAYMENT_METHOD', -- 'REQUIRES_PAYMENT_METHOD'|'PROCESSING'|'SUCCEEDED'|'FAILED'|'CANCELED'
  receipt_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(application_id) REFERENCES kyc_applications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_intent ON payments(provider_intent_id);

-- Payment events (webhook/callback simulation log)
CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'payment_intent.succeeded'|'payment_intent.payment_failed'...
  payload TEXT, -- raw JSON string payload
  created_at INTEGER NOT NULL,
  FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);

COMMIT;
