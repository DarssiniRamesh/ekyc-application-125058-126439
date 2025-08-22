/**
 * Verification routes: run checks and fetch results
 */
const express = require('express');
const verificationController = require('../controllers/verification');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Verification
 *     description: Mocked KYC verification checks (PAN, Aadhaar, KRA, NPCI)
 */

/**
 * @swagger
 * /verification/run:
 *   post:
 *     summary: Run KYC verification checks (mocked)
 *     description: >
 *       Triggers mocked verification checks for the authenticated user. If "checks" is omitted,
 *       runs PAN, AADHAAR, KRA, and NPCI. The results are stored and linked to the user's KYC record.
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checks:
 *                 type: array
 *                 description: Subset of checks to run
 *                 items:
 *                   type: string
 *                   enum: [PAN, AADHAAR, KRA, NPCI]
 *     responses:
 *       200:
 *         description: Verification run summary and results
 */
router.post('/run', auth, verificationController.run.bind(verificationController));

/**
 * @swagger
 * /verification/results:
 *   get:
 *     summary: Get recent verification results
 *     description: Returns recent verification results for the authenticated user. Filter by type and limit.
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: check_type
 *         schema:
 *           type: string
 *           enum: [PAN, AADHAAR, KRA, NPCI]
 *         description: Filter by verification type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Max rows to return (max 100)
 *     responses:
 *       200:
 *         description: List of verification results
 */
router.get('/results', auth, verificationController.list.bind(verificationController));

module.exports = router;
