const path = require('path');
const fs = require('fs');
const { get, run, all } = require('../db');
const adminService = require('./admin');

/**
 * Utility: return epoch ms
 */
function nowMs() {
  return Date.now();
}

/**
 * Calculate fees in mock Stripe/BillDesk style.
 * Accepts: base_amount (in INR rupees), addons, discount
 * Returns integer in paise with breakdown JSON.
 */
function calculateFees({ base_amount = 0, addons = [], discount = 0 }) {
  const rupeesToPaise = (v) => Math.round(Number(v || 0) * 100);

  const basePaise = rupeesToPaise(base_amount);
  const addonsPaise = Array.isArray(addons)
    ? addons.reduce((acc, a) => acc + rupeesToPaise(a.amount || 0), 0)
    : 0;
  const subtotal = basePaise + addonsPaise;

  // Mock convenience fee (1.5%) and GST (18% on fee). Round to nearest paise.
  const convenienceFee = Math.round(subtotal * 0.015);
  const gst = Math.round(convenienceFee * 0.18);
  const discountPaise = rupeesToPaise(discount);

  const total = Math.max(subtotal + convenienceFee + gst - discountPaise, 0);

  const breakdown = {
    base_paise: basePaise,
    addons_paise: addonsPaise,
    convenience_fee_paise: convenienceFee,
    gst_paise: gst,
    discount_paise: discountPaise,
    currency: 'INR',
    provider: 'MOCK_STRIPE'
  };

  return { total, breakdown };
}

// PUBLIC_INTERFACE
/**
 * Initiate a payment intent using mock provider behavior.
 * Creates a payments row with status REQUIRES_PAYMENT_METHOD and returns client_secret-like token.
 */
async function initiatePayment(userId, { base_amount, addons, discount, provider = 'MOCK_STRIPE', application_id } = {}) {
  if (!userId) {
    const e = new Error('Unauthorized');
    e.status = 401;
    throw e;
  }
  const { total, breakdown } = calculateFees({ base_amount, addons, discount });
  const ts = nowMs();

  // Ensure application exists if provided or if user has started KYC
  let applicationId = application_id || null;
  try {
    if (!applicationId) {
      const existingApp = await get('SELECT id FROM kyc_applications WHERE user_id = ?', [userId]);
      if (existingApp) applicationId = existingApp.id;
      else {
        const app = await adminService.ensureApplicationForUser(userId);
        applicationId = app?.id || null;
      }
    }
  } catch (e) {
    // non-fatal
  }

  const providerIntentId = `pi_${Math.random().toString(36).slice(2, 12)}`;
  const clientSecret = `cs_${Math.random().toString(36).slice(2, 24)}`;

  const r = await run(
    `INSERT INTO payments (user_id, application_id, amount, currency, fee_breakdown, provider, provider_intent_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'REQUIRES_PAYMENT_METHOD', ?, ?)`,
    [userId, applicationId, total, 'INR', JSON.stringify(breakdown), provider, providerIntentId, ts, ts]
  );

  return {
    payment_id: r.lastID,
    provider_intent_id: providerIntentId,
    client_secret: clientSecret,
    amount: total,
    currency: 'INR',
    status: 'REQUIRES_PAYMENT_METHOD',
    fee_breakdown: breakdown
  };
}

// PUBLIC_INTERFACE
/**
 * Get payment by id for the current user.
 */
async function getPayment(userId, paymentId) {
  const row = await get('SELECT * FROM payments WHERE id = ? AND user_id = ?', [paymentId, userId]);
  if (!row) {
    const e = new Error('Payment not found');
    e.status = 404;
    throw e;
  }
  return row;
}

// PUBLIC_INTERFACE
/**
 * List payments for the current user.
 */
async function listPayments(userId, { limit = 20, status } = {}) {
  const l = Math.min(Number(limit) || 20, 100);
  if (status) {
    return all(
      'SELECT * FROM payments WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?',
      [userId, String(status).toUpperCase(), l]
    );
  }
  return all('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, l]);
}

/**
 * Record a payment event (simulated webhook).
 */
async function recordPaymentEvent(paymentId, eventType, payload) {
  const ts = nowMs();
  await run(
    'INSERT INTO payment_events (payment_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)',
    [paymentId, eventType, payload ? JSON.stringify(payload) : null, ts]
  );
}

/**
 * Create a simple static receipt file (txt) to simulate receipt_url generation.
 */
function createMockReceipt(paymentId, amountPaise) {
  try {
    const receiptsDir = path.join(__dirname, '../../uploads/receipts');
    if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });
    const file = path.join(receiptsDir, `receipt_${paymentId}.txt`);
    fs.writeFileSync(
      file,
      `Payment Receipt\nPayment ID: ${paymentId}\nAmount: INR ${(amountPaise / 100).toFixed(2)}\nTimestamp: ${new Date().toISOString()}\nProvider: MOCK_STRIPE\nStatus: SUCCEEDED\n`,
      'utf8'
    );
    // Return relative path for storage
    return path.relative(path.join(__dirname, '../../'), file).replace(/\\/g, '/');
  } catch (e) {
    return null;
  }
}

// PUBLIC_INTERFACE
/**
 * Simulate provider webhook/callback to update payment status.
 * Accepts status: 'succeeded'|'failed'|'canceled'
 */
async function simulateWebhook({ payment_id, status, provider_event }) {
  const payment = await get('SELECT * FROM payments WHERE id = ?', [payment_id]);
  if (!payment) {
    const e = new Error('Payment not found');
    e.status = 404;
    throw e;
  }
  const normalized =
    String(status || '').toLowerCase() === 'succeeded'
      ? 'SUCCEEDED'
      : String(status || '').toLowerCase() === 'failed'
      ? 'FAILED'
      : String(status || '').toLowerCase() === 'canceled'
      ? 'CANCELED'
      : 'PROCESSING';

  const ts = nowMs();

  let receiptPath = payment.receipt_url;
  if (normalized === 'SUCCEEDED' && !receiptPath) {
    receiptPath = createMockReceipt(payment.id, payment.amount);
  }

  await run(
    'UPDATE payments SET status = ?, receipt_url = ?, updated_at = ? WHERE id = ?',
    [normalized, receiptPath || null, ts, payment.id]
  );

  await recordPaymentEvent(payment.id, provider_event || `payment_intent.${normalized.toLowerCase()}`, {
    provider: payment.provider,
    provider_intent_id: payment.provider_intent_id,
    new_status: normalized
  });

  return get('SELECT * FROM payments WHERE id = ?', [payment.id]);
}

module.exports = {
  calculateFees,
  initiatePayment,
  getPayment,
  listPayments,
  simulateWebhook
};
