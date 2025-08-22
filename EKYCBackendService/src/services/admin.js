const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { get, all, run } = require('../db');

const SALT_ROUNDS = 10;

// Helpers
function nowMs() {
  return Date.now();
}

function adminJwtSecret() {
  const s = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('ADMIN_JWT_SECRET/JWT_SECRET not configured in environment');
  return s;
}

function issueAdminJwt(admin) {
  const expiresIn = process.env.ADMIN_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '2h';
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role || 'admin', scope: 'admin' },
    adminJwtSecret(),
    { expiresIn }
  );
}

/**
 * Ensure there's at least one admin user present.
 * Default: admin@example.com / admin123 (only for dev; should be changed in production).
 */
async function ensureDefaultAdmin() {
  const existing = await get('SELECT id FROM admin_users WHERE email = ?', ['admin@example.com']);
  if (!existing) {
    const ts = nowMs();
    const password_hash = await bcrypt.hash('admin123', SALT_ROUNDS);
    await run(
      'INSERT INTO admin_users (email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['admin@example.com', password_hash, 'admin', ts, ts]
    );
  }
}

/**
 * Write an audit log entry.
 */
async function auditLog({ admin_id, action, entity_type, entity_id, details, ip, user_agent }) {
  const ts = nowMs();
  await run(
    `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [admin_id, action, entity_type || null, entity_id || null, details ? JSON.stringify(details) : null, ip || null, user_agent || null, ts]
  );
}

// PUBLIC_INTERFACE
/**
 * Admin login with email and password; returns JWT and admin profile.
 */
async function login({ email, password }, reqMeta = {}) {
  if (!email || !password) {
    const e = new Error('Email and password are required');
    e.status = 400;
    throw e;
  }
  await ensureDefaultAdmin(); // in case DB is fresh
  const admin = await get('SELECT * FROM admin_users WHERE email = ?', [email]);
  if (!admin) {
    const e = new Error('Invalid credentials');
    e.status = 401;
    throw e;
  }
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) {
    const e = new Error('Invalid credentials');
    e.status = 401;
    throw e;
  }
  const token = issueAdminJwt(admin);
  await auditLog({
    admin_id: admin.id,
    action: 'ADMIN_LOGIN',
    entity_type: null,
    entity_id: null,
    details: { email },
    ip: reqMeta.ip,
    user_agent: reqMeta.user_agent
  });
  return { token, admin: { id: admin.id, email: admin.email, role: admin.role } };
}

// PUBLIC_INTERFACE
/**
 * Get application review queue.
 * Filters: status (default: PENDING|UNDER_REVIEW), limit, offset
 */
async function getQueue({ status, limit = 50, offset = 0 }) {
  const statuses = Array.isArray(status)
    ? status
    : status
      ? [status]
      : ['PENDING', 'UNDER_REVIEW'];
  const placeholders = statuses.map(() => '?').join(', ');
  const l = Math.min(Number(limit) || 50, 200);
  const o = Math.max(Number(offset) || 0, 0);

  // Join basic profile to show queue info
  const rows = await all(
    `
    SELECT
      a.id AS application_id,
      a.user_id,
      a.status,
      a.assigned_admin_id,
      a.last_action,
      a.last_action_at,
      p.first_name,
      p.last_name,
      p.email AS kyc_email,
      p.mobile AS kyc_mobile,
      a.created_at,
      a.updated_at
    FROM kyc_applications a
    LEFT JOIN kyc_profiles p ON p.user_id = a.user_id
    WHERE a.status IN (${placeholders})
    ORDER BY a.updated_at DESC
    LIMIT ? OFFSET ?
    `,
    [...statuses, l, o]
  );
  return rows;
}

// PUBLIC_INTERFACE
/**
 * Get detailed application view by application id.
 * Includes profile, identity, address, bank, uploaded documents, and latest verification results.
 */
async function getApplicationDetail(applicationId) {
  const app = await get('SELECT * FROM kyc_applications WHERE id = ?', [applicationId]);
  if (!app) {
    const e = new Error('Application not found');
    e.status = 404;
    throw e;
  }
  const profile = await get('SELECT * FROM kyc_profiles WHERE user_id = ?', [app.user_id]);
  const identity = await get('SELECT * FROM kyc_identities WHERE user_id = ?', [app.user_id]);
  const address = await get('SELECT * FROM kyc_addresses WHERE user_id = ?', [app.user_id]);
  const bank = await get('SELECT * FROM kyc_banks WHERE user_id = ?', [app.user_id]);
  const documents = await all('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC', [app.user_id]);
  const verifications = await all(
    `SELECT id, check_type, status, message, raw_data, created_at
     FROM kyc_verifications WHERE user_id = ?
     ORDER BY created_at DESC LIMIT 100`,
    [app.user_id]
  );
  return { application: app, profile, identity, address, bank, documents, verifications };
}

// PUBLIC_INTERFACE
/**
 * Approve an application with optional comment.
 * Updates status and writes audit log.
 */
async function approveApplication({ applicationId, adminId, comment }, reqMeta = {}) {
  const app = await get('SELECT * FROM kyc_applications WHERE id = ?', [applicationId]);
  if (!app) {
    const e = new Error('Application not found');
    e.status = 404;
    throw e;
  }
  const ts = nowMs();
  await run(
    `UPDATE kyc_applications
     SET status = 'APPROVED', last_action = 'APPROVED', last_action_at = ?, updated_at = ?, assigned_admin_id = ?
     WHERE id = ?`,
    [ts, ts, adminId, applicationId]
  );
  await auditLog({
    admin_id: adminId,
    action: 'APPROVE',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    details: { comment: comment || null, previous_status: app.status },
    ip: reqMeta.ip,
    user_agent: reqMeta.user_agent
  });
  return { application_id: applicationId, status: 'APPROVED' };
}

// PUBLIC_INTERFACE
/**
 * Reject an application with required reason.
 * Updates status and writes audit log.
 */
async function rejectApplication({ applicationId, adminId, reason }, reqMeta = {}) {
  if (!reason || typeof reason !== 'string') {
    const e = new Error('Rejection reason is required');
    e.status = 400;
    throw e;
  }
  const app = await get('SELECT * FROM kyc_applications WHERE id = ?', [applicationId]);
  if (!app) {
    const e = new Error('Application not found');
    e.status = 404;
    throw e;
  }
  const ts = nowMs();
  await run(
    `UPDATE kyc_applications
     SET status = 'REJECTED', last_action = 'REJECTED', last_action_at = ?, updated_at = ?, assigned_admin_id = ?
     WHERE id = ?`,
    [ts, ts, adminId, applicationId]
  );
  await auditLog({
    admin_id: adminId,
    action: 'REJECT',
    entity_type: 'APPLICATION',
    entity_id: applicationId,
    details: { reason, previous_status: app.status },
    ip: reqMeta.ip,
    user_agent: reqMeta.user_agent
  });
  return { application_id: applicationId, status: 'REJECTED' };
}

// PUBLIC_INTERFACE
/**
 * Ensure an application row exists for a user (called when user completes onboarding or at admin view time).
 * Creates an entry with PENDING status if it doesn't exist.
 */
async function ensureApplicationForUser(userId) {
  const existing = await get('SELECT * FROM kyc_applications WHERE user_id = ?', [userId]);
  if (existing) return existing;
  const ts = nowMs();
  const r = await run(
    `INSERT INTO kyc_applications (user_id, status, last_action, last_action_at, created_at, updated_at)
     VALUES (?, 'PENDING', 'SUBMITTED', ?, ?, ?)`,
    [userId, ts, ts, ts]
  );
  return get('SELECT * FROM kyc_applications WHERE id = ?', [r.lastID]);
}

module.exports = {
  login,
  getQueue,
  getApplicationDetail,
  approveApplication,
  rejectApplication,
  ensureApplicationForUser,
};
