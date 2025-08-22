/**
 * KYC onboarding routes: profile, identity, address, bank, status
 */
const express = require('express');
const kycController = require('../controllers/kyc');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: KYC
 *     description: KYC Onboarding (Profile, Identity, Address, Bank)
 */

/**
 * @swagger
 * /kyc/profile:
 *   get:
 *     summary: Get profile section
 *     description: Returns the profile information for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *   put:
 *     summary: Update profile section
 *     description: Upsert profile information for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               dob: { type: string, description: "YYYY-MM-DD" }
 *               gender: { type: string }
 *               marital_status: { type: string }
 *               email: { type: string }
 *               mobile: { type: string }
 *     responses:
 *       200:
 *         description: Updated profile
 */
router.get('/profile', auth, kycController.getProfile.bind(kycController));
router.put('/profile', auth, kycController.updateProfile.bind(kycController));

/**
 * @swagger
 * /kyc/identity:
 *   get:
 *     summary: Get identity section
 *     description: Returns identity info (PAN/Aadhaar) for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Identity data
 *   put:
 *     summary: Update identity section
 *     description: Upsert identity info (PAN/Aadhaar) for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pan: { type: string }
 *               aadhaar: { type: string }
 *               pan_verified: { type: integer, enum: [0,1] }
 *               aadhaar_verified: { type: integer, enum: [0,1] }
 *     responses:
 *       200:
 *         description: Updated identity
 */
router.get('/identity', auth, kycController.getIdentity.bind(kycController));
router.put('/identity', auth, kycController.updateIdentity.bind(kycController));

/**
 * @swagger
 * /kyc/address:
 *   get:
 *     summary: Get address section
 *     description: Returns address information for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address data
 *   put:
 *     summary: Update address section
 *     description: Upsert address information for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               line1: { type: string }
 *               line2: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               postal_code: { type: string }
 *               country: { type: string }
 *               address_type: { type: string }
 *     responses:
 *       200:
 *         description: Updated address
 */
router.get('/address', auth, kycController.getAddress.bind(kycController));
router.put('/address', auth, kycController.updateAddress.bind(kycController));

/**
 * @swagger
 * /kyc/bank:
 *   get:
 *     summary: Get bank section
 *     description: Returns bank information for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank data
 *   put:
 *     summary: Update bank section
 *     description: Upsert bank information for the authenticated user.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               account_holder_name: { type: string }
 *               account_number: { type: string }
 *               ifsc: { type: string }
 *               bank_name: { type: string }
 *               branch: { type: string }
 *               verified: { type: integer, enum: [0,1] }
 *     responses:
 *       200:
 *         description: Updated bank
 */
router.get('/bank', auth, kycController.getBank.bind(kycController));
router.put('/bank', auth, kycController.updateBank.bind(kycController));

/**
 * @swagger
 * /kyc/onboarding/status:
 *   get:
 *     summary: Get onboarding completion status
 *     description: Returns a summary of which sections are complete and overall completion.
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status
 */
router.get('/onboarding/status', auth, kycController.getStatus.bind(kycController));

module.exports = router;
