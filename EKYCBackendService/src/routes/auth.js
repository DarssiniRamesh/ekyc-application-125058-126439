/**
 * Authentication routes: register, login, request OTP, verify OTP
 */
const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User authentication and OTP flows
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a user using email or mobile and password. Returns a JWT on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email (optional if mobile provided)
 *               mobile:
 *                 type: string
 *                 description: User mobile number (digits only, optional if email provided)
 *               password:
 *                 type: string
 *                 description: Password (min 6 chars)
 *             required:
 *               - password
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email or Mobile already registered
 */
router.post('/register', authController.register.bind(authController));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     description: Login using email or mobile and password. Returns a JWT on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /auth/request-otp:
 *   post:
 *     summary: Request OTP (mocked)
 *     description: Generates and stores a mocked OTP (123456) with 5 minutes validity.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP generated (mock)
 *       400:
 *         description: Invalid input or no OTP possible
 *       404:
 *         description: User not found
 */
router.post('/request-otp', authController.requestOtp.bind(authController));

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP (mocked)
 *     description: Verifies a mocked OTP (123456). Returns JWT on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: One-time password (use 123456 for mock)
 *             required:
 *               - otp
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid input or invalid/expired OTP
 *       404:
 *         description: User not found
 */
router.post('/verify-otp', authController.verifyOtp.bind(authController));

module.exports = router;
