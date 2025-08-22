const { get, run, all } = require('../db');

/**
 * Utility: now in epoch ms
 */
function nowMs() {
  return Date.now();
}

/**
 * Ensure verification tables exist (idempotent). This is a lightweight guard in case
 * older DBs are missing the migration. Main creation is handled via migrations.
 */
async function ensureTables() {
  // Create tables if they don't exist (no-op if exist)
  await run(
    'CREATE TABLE IF NOT EXISTS kyc_verifications (\n' +
      '    id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '    user_id INTEGER NOT NULL,\n' +
      '    check_type TEXT NOT NULL, -- \'PAN\' | \'AADHAAR\' | \'KRA\' | \'NPCI\' | \'BANK\'\n' +
      '    status TEXT NOT NULL,     -- \'success\' | \'failed\'\n' +
      '    message TEXT,\n' +
      '    raw_data TEXT,            -- JSON string of the simulated response\n' +
      '    created_at INTEGER NOT NULL,\n' +
      '    updated_at INTEGER NOT NULL,\n' +
      '    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE\n' +
      '  )'
  );

  await run('CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user ON kyc_verifications(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_type ON kyc_verifications(user_id, check_type)');
}

/**
 * Simulators for verification checks. These are mocks with simple heuristics.
 * In real-world, integrate with external providers.
 */

/**
 * Simulate PAN verification:
 * - success if pan matches regex /^[A-Z]{5}[0-9]{4}[A-Z]$/i
 * - name match heuristic if provided in profile (not used here for simplicity)
 */
function simulatePanVerification(pan) {
  const isValid = typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan);
  return {
    status: isValid ? 'success' : 'failed',
    message: isValid ? 'PAN verified against mock provider' : 'PAN format invalid',
    provider: 'MOCK_PAN',
    reference_id: `PAN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    pan: pan || null,
  };
}

/**
 * Simulate Aadhaar verification:
 * - success if aadhaar is 12 digits and Luhn-like checksum passes simple rule
 */
function simulateAadhaarVerification(aadhaar) {
  const isDigits = typeof aadhaar === 'string' && /^[0-9]{12}$/.test(aadhaar);
  const simpleCheck = isDigits ? Number(aadhaar[aadhaar.length - 1]) % 2 === 0 : false;
  const ok = isDigits && simpleCheck;
  return {
    status: ok ? 'success' : 'failed',
    message: ok ? 'Aadhaar verified via mock OTP eKYC' : 'Aadhaar invalid or checksum failed',
    provider: 'MOCK_AADHAAR',
    reference_id: `AAD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    aadhaar: aadhaar || null,
  };
}

/**
 * Simulate KRA verification:
 * - success if pan is present and valid-looking; returns mocked KRA record status
 */
function simulateKraVerification(pan) {
  const hasPan = typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan);
  const ok = !!hasPan;
  return {
    status: ok ? 'success' : 'failed',
    message: ok ? 'KRA record found and active (mock)' : 'KRA record not found (mock)',
    provider: 'MOCK_KRA',
    reference_id: `KRA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    kra_status: ok ? 'ACTIVE' : 'NOT_FOUND',
    pan: pan || null,
  };
}

/**
 * Simulate NPCI mapping check:
 * - success if account_number and ifsc exist and pass trivial checks
 */
function simulateNpciMapping(accountNumber, ifsc) {
  const accOk =
    typeof accountNumber === 'string' &&
    accountNumber.length >= 9 &&
    accountNumber.length <= 18 &&
    /^[0-9]+$/.test(accountNumber);
  const ifscOk = typeof ifsc === 'string' && /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc);
  const ok = accOk && ifscOk;
  return {
    status: ok ? 'success' : 'failed',
    message: ok ? 'NPCI account mapping verified (mock)' : 'Account or IFSC invalid',
    provider: 'MOCK_NPCI',
    reference_id: `NPCI-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    account_number_tail: accountNumber ? accountNumber.slice(-4) : null,
    ifsc: ifsc || null,
  };
}

/**
 * Fetch current KYC fields to use in verifications.
 */
async function fetchKycSnapshot(userId) {
  const identity = await get('SELECT * FROM kyc_identities WHERE user_id = ?', [userId]);
  const profile = await get('SELECT * FROM kyc_profiles WHERE user_id = ?', [userId]);
  const bank = await get('SELECT * FROM kyc_banks WHERE user_id = ?', [userId]);
  return { identity, profile, bank };
}

/**
 * Persist a verification result row.
 */
async function saveVerification(userId, checkType, resultObj) {
  const ts = nowMs();
  const status = resultObj.status || 'failed';
  const message = resultObj.message || null;
  const raw = JSON.stringify(resultObj);
  await run(
    'INSERT INTO kyc_verifications (user_id, check_type, status, message, raw_data, created_at, updated_at)\n' +
      '     VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, checkType, status, message, raw, ts, ts]
  );
}

/**
 * Update KYC tables based on verification outcomes.
 * - If PAN success -> kyc_identities.pan_verified = 1
 * - If Aadhaar success -> kyc_identities.aadhaar_verified = 1
 * - If NPCI success -> kyc_banks.verified = 1
 */
async function applyVerificationSideEffects(userId, results) {
  const ts = nowMs();
  for (const r of results) {
    if (r.check === 'PAN' && r.status === 'success') {
      await run('UPDATE kyc_identities SET pan_verified = 1, updated_at = ? WHERE user_id = ?', [
        ts,
        userId,
      ]);
    }
    if (r.check === 'AADHAAR' && r.status === 'success') {
      await run(
        'UPDATE kyc_identities SET aadhaar_verified = 1, updated_at = ? WHERE user_id = ?',
        [ts, userId]
      );
    }
    if (r.check === 'NPCI' && r.status === 'success') {
      await run('UPDATE kyc_banks SET verified = 1, updated_at = ? WHERE user_id = ?', [
        ts,
        userId,
      ]);
    }
  }
}

/**
 * PUBLIC_INTERFACE
 * Run verification checks for the authenticated user. If body contains "checks" array,
 * restrict to those; otherwise run all available.
 * Supported checks: PAN, AADHAAR, KRA, NPCI
 */
async function runVerifications(userId, options = {}) {
  await ensureTables();
  const checksRequested =
    Array.isArray(options.checks) && options.checks.length
      ? options.checks.map((c) => String(c || '').toUpperCase())
      : ['PAN', 'AADHAAR', 'KRA', 'NPCI'];

  const { identity, bank } = await fetchKycSnapshot(userId);

  const results = [];

  for (const check of checksRequested) {
    if (check === 'PAN') {
      const res = simulatePanVerification(identity?.pan || null);
      await saveVerification(userId, 'PAN', res);
      results.push({ check: 'PAN', status: res.status, message: res.message, data: res });
    } else if (check === 'AADHAAR') {
      const res = simulateAadhaarVerification(identity?.aadhaar || null);
      await saveVerification(userId, 'AADHAAR', res);
      results.push({ check: 'AADHAAR', status: res.status, message: res.message, data: res });
    } else if (check === 'KRA') {
      const res = simulateKraVerification(identity?.pan || null);
      await saveVerification(userId, 'KRA', res);
      results.push({ check: 'KRA', status: res.status, message: res.message, data: res });
    } else if (check === 'NPCI') {
      const res = simulateNpciMapping(bank?.account_number || null, bank?.ifsc || null);
      await saveVerification(userId, 'NPCI', res);
      results.push({ check: 'NPCI', status: res.status, message: res.message, data: res });
    }
  }

  await applyVerificationSideEffects(userId, results);

  return { user_id: userId, ran: checksRequested, results };
}

/**
 * PUBLIC_INTERFACE
 * Get recent verification results for the authenticated user.
 * Optional query: check_type to filter, limit (default 20)
 */
async function getVerificationResults(userId, { check_type, limit } = {}) {
  await ensureTables();
  const l = Math.min(Number(limit) || 20, 100);
  if (check_type) {
    return all(
      'SELECT id, user_id, check_type, status, message, raw_data, created_at, updated_at\n' +
        '       FROM kyc_verifications\n' +
        '       WHERE user_id = ? AND check_type = ?\n' +
        '       ORDER BY created_at DESC\n' +
        '       LIMIT ?',
      [userId, String(check_type).toUpperCase(), l]
    );
  }
  return all(
    'SELECT id, user_id, check_type, status, message, raw_data, created_at, updated_at\n' +
      '     FROM kyc_verifications\n' +
      '     WHERE user_id = ?\n' +
      '     ORDER BY created_at DESC\n' +
      '     LIMIT ?',
    [userId, l]
  );
}

module.exports = {
  runVerifications,
  getVerificationResults,
};
