/**
 * Payments routes: calculate, initiate, get, list, webhook simulation
 */
const express = require('express');
const paymentsController = require('../controllers/payments');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Mock payment calculation and processing (Stripe-like)
 */

/**
 * @swagger
 * /payments/calculate:
 *   post:
 *     summary: Calculate payment fees
 *     description: Returns total amount in paise with a breakdown for fees and GST.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_amount:
 *                 type: number
 *                 description: Base amount in INR
 *               addons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label: { type: string }
 *                     amount: { type: number, description: "Add-on amount in INR" }
 *               discount:
 *                 type: number
 *                 description: Discount in INR
 *     responses:
 *       200:
 *         description: Calculation result
 */
router.post('/calculate', auth, paymentsController.calculate.bind(paymentsController));

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate a payment (mock)
 *     description: Creates a mock payment intent and returns a client_secret-like token. Use /payments/webhook/simulate to update status.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_amount: { type: number, description: "Base amount in INR" }
 *               addons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label: { type: string }
 *                     amount: { type: number }
 *               discount: { type: number }
 *               provider: { type: string, example: "MOCK_STRIPE" }
 *               application_id: { type: integer }
 *     responses:
 *       201:
 *         description: Payment intent created
 */
router.post('/initiate', auth, paymentsController.initiate.bind(paymentsController));

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List payments
 *     description: Returns recent payments for the authenticated user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, example: "SUCCEEDED" }
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/', auth, paymentsController.list.bind(paymentsController));

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment by id
 *     description: Returns payment detail if it belongs to the authenticated user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Payment detail
 *       404:
 *         description: Not found
 */
router.get('/:id', auth, paymentsController.getOne.bind(paymentsController));

/**
 * @swagger
 * /payments/webhook/simulate:
 *   post:
 *     summary: Simulate payment webhook/callback
 *     description: Update payment status as if provider sent a webhook. Allowed statuses: succeeded, failed, canceled.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payment_id, status]
 *             properties:
 *               payment_id: { type: integer }
 *               status:
 *                 type: string
 *                 enum: [succeeded, failed, canceled, processing]
 *               provider_event:
 *                 type: string
 *                 example: payment_intent.succeeded
 *     responses:
 *       200:
 *         description: Updated payment
 *       404:
 *         description: Payment not found
 */
router.post('/webhook/simulate', paymentsController.simulateWebhook.bind(paymentsController));

module.exports = router;
