const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db');

// Constants
const OTP_FIXED = '123456'; // Mocked OTP for Phase 0/1
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SALT_ROUNDS = 10;

/**
 * Validate email format very simply.
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email);
}

/**
 * Validate mobile very simply (digits, length 8-15).
 */
function isValidMobile(mobile) {
  return typeof mobile === 'string' && /^[0-9]{8,15}$/.test(mobile);
}

/**
 * Get current epoch ms
 */
function nowMs() {
  return Date.now();
}

/**
 * PUBLIC_INTERFACE
 * Register a new user (by email or mobile) with password hashing and JWT issuance.
 * One of email or mobile is required. Password is required.
 * Returns a JWT and basic user info.
 */
async function register({ email, mobile, password }) {
  if ((!email && !mobile) || (email && !isValidEmail(email)) || (mobile && !isValidMobile(mobile))) {
    const message = !email && !mobile
      ? 'Either email or mobile is required'
      : 'Invalid email or mobile format';
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.status = 400;
    throw error;
  }

  // Check if user exists
  if (email) {
    const existingByEmail = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingByEmail) {
      const error = new Error('Email already registered');
      error.status = 409;
      throw error;
    }
  }
  if (mobile) {
    const existingByMobile = await get('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existingByMobile) {
      const error = new Error('Mobile already registered');
      error.status = 409;
      throw error;
    }
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const ts = nowMs();
  const { lastID } = await run(
    `INSERT INTO users (email, mobile, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [email || null, mobile || null, password_hash, ts, ts]
  );

  const user = { id: lastID, email: email || null, mobile: mobile || null };
  const token = issueJwt(user);
  return { token, user };
}

/**
 * PUBLIC_INTERFACE
 * Login user with email or mobile and password. Returns JWT if successful.
 */
async function login({ email, mobile, password }) {
  if ((!email && !mobile) || (email && !isValidEmail(email)) || (mobile && !isValidMobile(mobile))) {
    const message = !email && !mobile
      ? 'Either email or mobile is required'
      : 'Invalid email or mobile format';
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  if (!password || typeof password !== 'string') {
    const error = new Error('Password is required');
    error.status = 400;
    throw error;
  }

  const user = email
    ? await get('SELECT * FROM users WHERE email = ?', [email])
    : await get('SELECT * FROM users WHERE mobile = ?', [mobile]);

  if (!user || !user.password_hash) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const error = new Error('Invalid credentials');
    error.status = 401;
    throw error;
  }

  const payloadUser = { id: user.id, email: user.email, mobile: user.mobile };
  const token = issueJwt(payloadUser);
  return { token, user: payloadUser };
}

/**
 * PUBLIC_INTERFACE
 * Request OTP (mocked). Stores a fixed OTP and expiry for the user.
 */
async function requestOtp({ email, mobile }) {
  if ((!email && !mobile) || (email && !isValidEmail(email)) || (mobile && !isValidMobile(mobile))) {
    const message = !email && !mobile
      ? 'Either email or mobile is required'
      : 'Invalid email or mobile format';
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  const user = email
    ? await get('SELECT * FROM users WHERE email = ?', [email])
    : await get('SELECT * FROM users WHERE mobile = ?', [mobile]);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const expiresAt = nowMs() + OTP_TTL_MS;
  await run(
    'UPDATE users SET otp_code = ?, otp_expires_at = ?, updated_at = ? WHERE id = ?',
    [OTP_FIXED, expiresAt, nowMs(), user.id]
  );

  // In real world, send OTP via SMS/email. Here we return an informational message.
  return { message: 'OTP generated and stored (mock). Use 123456 within 5 minutes.' };
}

/**
 * PUBLIC_INTERFACE
 * Verify OTP (mocked). Validates the fixed OTP against stored data.
 */
async function verifyOtp({ email, mobile, otp }) {
  if ((!email && !mobile) || (email && !isValidEmail(email)) || (mobile && !isValidMobile(mobile))) {
    const message = !email && !mobile
      ? 'Either email or mobile is required'
      : 'Invalid email or mobile format';
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  if (!otp || typeof otp !== 'string') {
    const error = new Error('OTP is required');
    error.status = 400;
    throw error;
  }

  const user = email
    ? await get('SELECT * FROM users WHERE email = ?', [email])
    : await get('SELECT * FROM users WHERE mobile = ?', [mobile]);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (!user.otp_code || !user.otp_expires_at) {
    const error = new Error('No OTP requested');
    error.status = 400;
    throw error;
  }

  if (nowMs() > Number(user.otp_expires_at)) {
    const error = new Error('OTP expired');
    error.status = 400;
    throw error;
  }

  if (otp !== user.otp_code) {
    const error = new Error('Invalid OTP');
    error.status = 400;
    throw error;
  }

  // Clear OTP on success
  await run(
    'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, updated_at = ? WHERE id = ?',
    [nowMs(), user.id]
  );

  const payloadUser = { id: user.id, email: user.email, mobile: user.mobile };
  const token = issueJwt(payloadUser);
  return { token, user: payloadUser };
}

/**
 * Issue JWT with configured secret and expiry.
 */
function issueJwt(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  if (!secret) {
    throw new Error('JWT_SECRET not configured. Please set it in environment.');
  }
  return jwt.sign({ sub: user.id, email: user.email, mobile: user.mobile }, secret, { expiresIn });
}

module.exports = {
  register,
  login,
  requestOtp,
  verifyOtp,
};
