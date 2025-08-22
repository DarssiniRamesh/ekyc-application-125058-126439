/**
 * Admin routes: login, application queue, application detail, approve/reject
 */
const express = require('express');
const adminController = require('../controllers/admin');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Admin authentication and application review workflow
 */

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login
 *     description: Login as admin with email and password. Returns an admin JWT.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', adminController.login.bind(adminController));

/**
 * @swagger
 * /admin/applications:
 *   get:
 *     summary: Get application review queue
 *     description: Returns a list of applications filtered by status. CSV statuses accepted, default includes PENDING and UNDER_REVIEW.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: PENDING,UNDER_REVIEW
 *         description: CSV of statuses to include (PENDING|UNDER_REVIEW|APPROVED|REJECTED)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of applications
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/applications', adminAuth, adminController.getQueue.bind(adminController));

/**
 * @swagger
 * /admin/applications/{id}:
 *   get:
 *     summary: Get application detail
 *     description: Returns full application detail including KYC sections, documents, and verification results.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Detailed application data
 *       404:
 *         description: Application not found
 */
router.get('/applications/:id', adminAuth, adminController.getApplication.bind(adminController));

/**
 * @swagger
 * /admin/applications/{id}/approve:
 *   post:
 *     summary: Approve an application
 *     description: Approves the application. Optionally add a comment.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Application ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application approved
 *       404:
 *         description: Application not found
 */
router.post('/applications/:id/approve', adminAuth, adminController.approve.bind(adminController));

/**
 * @swagger
 * /admin/applications/{id}/reject:
 *   post:
 *     summary: Reject an application
 *     description: Rejects the application with a reason.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application rejected
 *       400:
 *         description: Reason required
 *       404:
 *         description: Application not found
 */
router.post('/applications/:id/reject', adminAuth, adminController.reject.bind(adminController));

module.exports = router;
