-- Migration: Create e-signature tables to track initiation, status, and artifacts

BEGIN;

CREATE TABLE IF NOT EXISTS esign_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  application_id INTEGER, -- optional link to kyc_applications
  document_id INTEGER, -- optional reference to a document needing signature
  provider TEXT NOT NULL DEFAULT 'MOCK_ESIGN', -- possible: 'MOCK_DIGIO', 'MOCK_NSDL'
  provider_request_id TEXT, -- mock request/session id
  status TEXT NOT NULL DEFAULT 'INITIATED', -- INITIATED|PENDING|SIGNED|DECLINED|EXPIRED|FAILED|CANCELED
  redirect_url TEXT, -- simulated URL to complete e-sign
  signed_file_path TEXT, -- stored signed PDF path, if any
  audit_trail TEXT, -- JSON string with events
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(application_id) REFERENCES kyc_applications(id) ON DELETE SET NULL,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_esign_requests_user ON esign_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_esign_requests_status ON esign_requests(status);
CREATE INDEX IF NOT EXISTS idx_esign_requests_provider_id ON esign_requests(provider_request_id);

COMMIT;
