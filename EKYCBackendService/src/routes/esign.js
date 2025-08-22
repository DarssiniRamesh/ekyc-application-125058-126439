/**
 * E-signature routes: initiate, list, get, callback simulation
 */
const express = require('express');
const esignController = require('../controllers/esign');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: ESign
 *     description: Mock e-signature initiation and status updates
 */

/**
 * @swagger
 * /esign/initiate:
 *   post:
 *     summary: Initiate e-sign request (mock)
 *     description: Creates an e-sign request and returns a redirect_url to simulate signing.
 *     tags: [ESign]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               document_id: { type: integer, description: "Optional document to be signed" }
 *               provider: { type: string, example: "MOCK_ESIGN" }
 *               application_id: { type: integer }
 *     responses:
 *       201:
 *         description: E-sign initiated
 */
router.post('/initiate', auth, esignController.initiate.bind(esignController));

/**
 * @swagger
 * /esign:
 *   get:
 *     summary: List e-sign requests
 *     description: Returns recent e-sign requests for the authenticated user.
 *     tags: [ESign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, example: "SIGNED" }
 *     responses:
 *       200:
 *         description: List of e-sign requests
 */
router.get('/', auth, esignController.list.bind(esignController));

/**
 * @swagger
 * /esign/{id}:
 *   get:
 *     summary: Get e-sign request by id
 *     description: Returns e-sign request details if it belongs to the authenticated user.
 *     tags: [ESign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: E-sign details
 *       404:
 *         description: Not found
 */
router.get('/:id', auth, esignController.getOne.bind(esignController));

/**
 * @swagger
 * /esign/callback/simulate:
 *   post:
 *     summary: Simulate e-sign provider callback
 *     description: Update e-sign status (SIGNED, DECLINED, FAILED, CANCELED, EXPIRED, PENDING)
 *     tags: [ESign]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [esign_id, status]
 *             properties:
 *               esign_id: { type: integer }
 *               status:
 *                 type: string
 *                 enum: [SIGNED, DECLINED, FAILED, CANCELED, EXPIRED, PENDING]
 *     responses:
 *       200:
 *         description: Updated e-sign request
 *       404:
 *         description: Not found
 */
router.post('/callback/simulate', esignController.simulateCallback.bind(esignController));

module.exports = router;
