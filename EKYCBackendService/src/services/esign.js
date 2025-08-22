const path = require('path');
const fs = require('fs');
const { get, run, all } = require('../db');
const adminService = require('./admin');

function nowMs() {
  return Date.now();
}

// PUBLIC_INTERFACE
/**
 * Initiate an e-sign request (mock). Optionally link to a document_id.
 * Returns a redirect_url to "complete" the mock signing.
 */
async function initiateEsign(userId, { document_id = null, provider = 'MOCK_ESIGN', application_id } = {}) {
  if (!userId) {
    const e = new Error('Unauthorized');
    e.status = 401;
    throw e;
  }
  // Ensure application exists or create one
  let applicationId = application_id || null;
  try {
    if (!applicationId) {
      const app = await get('SELECT id FROM kyc_applications WHERE user_id = ?', [userId]);
      if (app) applicationId = app.id;
      else {
        const created = await adminService.ensureApplicationForUser(userId);
        applicationId = created?.id || null;
      }
    }
  } catch (e) {}

  const ts = nowMs();
  const providerRequestId = `es_${Math.random().toString(36).slice(2, 12)}`;
  // Simulated redirect URL
  const redirectUrl = `/esign/mock/${providerRequestId}`;

  const r = await run(
    `INSERT INTO esign_requests
      (user_id, application_id, document_id, provider, provider_request_id, status, redirect_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'INITIATED', ?, ?, ?)`,
    [userId, applicationId, document_id || null, provider, providerRequestId, redirectUrl, ts, ts]
  );

  return {
    esign_id: r.lastID,
    provider_request_id: providerRequestId,
    redirect_url: redirectUrl,
    status: 'INITIATED'
  };
}

// PUBLIC_INTERFACE
/**
 * Get e-sign request by id for user
 */
async function getEsign(userId, esignId) {
  const row = await get('SELECT * FROM esign_requests WHERE id = ? AND user_id = ?', [esignId, userId]);
  if (!row) {
    const e = new Error('E-sign request not found');
    e.status = 404;
    throw e;
  }
  return row;
}

// PUBLIC_INTERFACE
/**
 * List e-sign requests for user
 */
async function listEsign(userId, { limit = 20, status } = {}) {
  const l = Math.min(Number(limit) || 20, 100);
  if (status) {
    return all(
      'SELECT * FROM esign_requests WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?',
      [userId, String(status).toUpperCase(), l]
    );
  }
  return all('SELECT * FROM esign_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, l]);
}

/**
 * Create a mock signed artifact and set status to SIGNED.
 */
function createMockSignedFile(esignId) {
  try {
    const dir = path.join(__dirname, '../../uploads/esigned');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `esign_${esignId}.txt`);
    fs.writeFileSync(
      file,
      `Mock Signed Document\nESign ID: ${esignId}\nSigned At: ${new Date().toISOString()}\nProvider: MOCK_ESIGN\n`,
      'utf8'
    );
    return path.relative(path.join(__dirname, '../../'), file).replace(/\\/g, '/');
  } catch (e) {
    return null;
  }
}

// PUBLIC_INTERFACE
/**
 * Simulate e-sign callback: update status to SIGNED/DECLINED/FAILED/CANCELED/EXPIRED
 */
async function simulateEsignCallback({ esign_id, status }) {
  const row = await get('SELECT * FROM esign_requests WHERE id = ?', [esign_id]);
  if (!row) {
    const e = new Error('E-sign request not found');
    e.status = 404;
    throw e;
  }
  const normalized = String(status || '').toUpperCase();
  const allowed = new Set(['SIGNED', 'DECLINED', 'FAILED', 'CANCELED', 'EXPIRED', 'PENDING']);
  const finalStatus = allowed.has(normalized) ? normalized : 'PENDING';

  const ts = nowMs();
  let signedFilePath = row.signed_file_path;
  if (finalStatus === 'SIGNED' && !signedFilePath) {
    signedFilePath = createMockSignedFile(row.id);
  }
  const newAuditTrail = {
    previous: row.status,
    new: finalStatus,
    at: new Date(ts).toISOString(),
    provider: row.provider,
    provider_request_id: row.provider_request_id
  };

  const mergedAuditTrail = (() => {
    try {
      const existing = row.audit_trail ? JSON.parse(row.audit_trail) : [];
      return JSON.stringify([...existing, newAuditTrail]);
    } catch (_) {
      return JSON.stringify([newAuditTrail]);
    }
  })();

  await run(
    'UPDATE esign_requests SET status = ?, signed_file_path = ?, audit_trail = ?, updated_at = ? WHERE id = ?',
    [finalStatus, signedFilePath || null, mergedAuditTrail, ts, row.id]
  );

  return get('SELECT * FROM esign_requests WHERE id = ?', [row.id]);
}

module.exports = {
  initiateEsign,
  getEsign,
  listEsign,
  simulateEsignCallback
};
