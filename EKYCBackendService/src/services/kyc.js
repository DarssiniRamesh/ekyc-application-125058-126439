const { get, run } = require('../db');

/**
 * Returns epoch milliseconds
 */
function nowMs() {
  return Date.now();
}

/**
 * Upsert helper for single-row-per-user tables.
 * Inserts if not exists, otherwise updates fields provided.
 */
async function upsert(table, userId, fields) {
  const existing = await get(`SELECT id FROM ${table} WHERE user_id = ?`, [userId]);
  const keys = Object.keys(fields || {});
  const ts = nowMs();

  if (!existing) {
    const cols = ['user_id', ...keys, 'updated_at'];
    const placeholders = cols.map(() => '?').join(', ');
    const values = [userId, ...keys.map((k) => fields[k]), ts];
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
    await run(sql, values);
  } else {
    if (keys.length === 0) {
      await run(`UPDATE ${table} SET updated_at = ? WHERE user_id = ?`, [ts, userId]);
      return;
    }
    const setClause = keys.map((k) => `${k} = ?`).join(', ') + ', updated_at = ?';
    const values = [...keys.map((k) => fields[k]), ts, userId];
    const sql = `UPDATE ${table} SET ${setClause} WHERE user_id = ?`;
    await run(sql, values);
  }
}

async function getRow(table, userId) {
  return get(`SELECT * FROM ${table} WHERE user_id = ?`, [userId]);
}

// PUBLIC_INTERFACE
/**
 * Get profile section for the current user
 */
async function getProfile(userId) {
  const row = await getRow('kyc_profiles', userId);
  return row || {};
}

// PUBLIC_INTERFACE
/**
 * Update profile section for the current user (upsert)
 */
async function updateProfile(userId, data) {
  const allowed = ['first_name', 'last_name', 'dob', 'gender', 'marital_status', 'email', 'mobile'];
  const payload = {};
  for (const k of allowed) {
    if (data[k] !== undefined) payload[k] = data[k];
  }
  await upsert('kyc_profiles', userId, payload);
  return getProfile(userId);
}

// PUBLIC_INTERFACE
/**
 * Get identity section for the current user
 */
async function getIdentity(userId) {
  const row = await getRow('kyc_identities', userId);
  return row || {};
}

// PUBLIC_INTERFACE
/**
 * Update identity section for the current user (upsert)
 */
async function updateIdentity(userId, data) {
  const allowed = ['pan', 'aadhaar', 'pan_verified', 'aadhaar_verified'];
  const payload = {};
  for (const k of allowed) {
    if (data[k] !== undefined) payload[k] = data[k];
  }
  await upsert('kyc_identities', userId, payload);
  return getIdentity(userId);
}

// PUBLIC_INTERFACE
/**
 * Get address section for the current user
 */
async function getAddress(userId) {
  const row = await getRow('kyc_addresses', userId);
  return row || {};
}

// PUBLIC_INTERFACE
/**
 * Update address section for the current user (upsert)
 */
async function updateAddress(userId, data) {
  const allowed = ['line1', 'line2', 'city', 'state', 'postal_code', 'country', 'address_type'];
  const payload = {};
  for (const k of allowed) {
    if (data[k] !== undefined) payload[k] = data[k];
  }
  await upsert('kyc_addresses', userId, payload);
  return getAddress(userId);
}

// PUBLIC_INTERFACE
/**
 * Get bank section for the current user
 */
async function getBank(userId) {
  const row = await getRow('kyc_banks', userId);
  return row || {};
}

// PUBLIC_INTERFACE
/**
 * Update bank section for the current user (upsert)
 */
async function updateBank(userId, data) {
  const allowed = ['account_holder_name', 'account_number', 'ifsc', 'bank_name', 'branch', 'verified'];
  const payload = {};
  for (const k of allowed) {
    if (data[k] !== undefined) payload[k] = data[k];
  }
  await upsert('kyc_banks', userId, payload);
  return getBank(userId);
}

// PUBLIC_INTERFACE
/**
 * Compute onboarding status for current user.
 * Simple completion check: section considered complete if a minimal subset is present.
 */
async function getOnboardingStatus(userId) {
  const [profile, identity, address, bank] = await Promise.all([
    getProfile(userId),
    getIdentity(userId),
    getAddress(userId),
    getBank(userId),
  ]);

  const hasProfile = !!(profile && (profile.first_name || profile.last_name));
  const hasIdentity = !!(identity && (identity.pan || identity.aadhaar));
  const hasAddress = !!(address && (address.line1 && address.city && address.state && address.postal_code));
  const hasBank = !!(bank && (bank.account_number && bank.ifsc));

  const completedSections = {
    profile: hasProfile,
    identity: hasIdentity,
    address: hasAddress,
    bank: hasBank,
  };

  const completionCount = Object.values(completedSections).filter(Boolean).length;
  const totalSections = 4;

  return {
    sections: completedSections,
    completed: completionCount,
    total: totalSections,
    is_complete: completionCount === totalSections,
  };
}

module.exports = {
  getProfile,
  updateProfile,
  getIdentity,
  updateIdentity,
  getAddress,
  updateAddress,
  getBank,
  updateBank,
  getOnboardingStatus,
};
