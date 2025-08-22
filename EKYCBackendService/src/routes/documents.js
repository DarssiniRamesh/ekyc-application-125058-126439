/**
 * Document management routes: upload, list, metadata view, delete
 */
const express = require('express');
const { controller, uploadMiddleware } = require('../controllers/documents');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Documents
 *     description: Document uploads and retrieval
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List documents
 *     description: Returns a list of documents uploaded by the authenticated user. Filter by category with query param.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by document category (e.g., pan, address, bank, income, nominee, signature, other)
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get('/', auth, controller.list.bind(controller));

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Upload a document
 *     description: Upload a single file using multipart/form-data with field name "file". Optional form fields: category, description.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category:
 *                 type: string
 *                 description: Document category (e.g., pan, address, bank, income, nominee, signature, other)
 *               description:
 *                 type: string
 *                 description: Optional description for the file
 *     responses:
 *       201:
 *         description: Document uploaded
 *       400:
 *         description: Invalid file or request
 */
router.post('/', auth, uploadMiddleware, controller.upload.bind(controller));

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get document metadata
 *     description: Returns metadata for a single document belonging to the authenticated user.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document metadata
 *       404:
 *         description: Document not found
 */
router.get('/:id', auth, controller.getOne.bind(controller));

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete document
 *     description: Deletes a document and its stored file for the authenticated user.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted
 *       404:
 *         description: Document not found
 */
router.delete('/:id', auth, controller.remove.bind(controller));

module.exports = router;
