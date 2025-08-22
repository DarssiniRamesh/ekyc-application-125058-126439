const path = require('path');
const fs = require('fs');
const multer = require('multer');
const documentsService = require('../services/documents');

/**
 * Configure Multer for disk storage with safe filenames.
 * Files are stored under ./uploads/{userId}/ with a unique timestamped name.
 */
const BASE_UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

// Ensure base uploads directory exists
if (!fs.existsSync(BASE_UPLOAD_DIR)) {
  fs.mkdirSync(BASE_UPLOAD_DIR, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user?.id;
    const userDir = path.join(BASE_UPLOAD_DIR, String(userId || 'anonymous'));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Create a unique and safe filename: <timestamp>_<random>_<sanitized original>
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const original = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${rand}_${original}`);
  },
});

// File filter: whitelist common doc/image types
const allowedMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'image/gif',
  'image/tiff',
  'application/octet-stream', // fallback if some browsers send this; consider tightening later
]);

function fileFilter(req, file, cb) {
  if (allowedMimes.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Unsupported file type');
    err.status = 400;
    cb(err);
  }
}

// Limits: e.g., 10 MB
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || 10 * 1024 * 1024),
    files: 1,
  },
});

class DocumentsController {
  // PUBLIC_INTERFACE
  /**
   * Upload a document for the authenticated user.
   * Accepts multipart/form-data with field "file".
   * Optional fields: category, description
   */
  async upload(req, res, next) {
    try {
      const userId = req.user.id;
      const { category, description } = req.body || {};
      const saved = await documentsService.saveUpload({
        userId,
        file: req.file,
        category,
        description,
      });
      return res.status(201).json(saved);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * List documents for the authenticated user. Optional query param: category
   */
  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const { category } = req.query || {};
      const docs = await documentsService.listDocuments(userId, { category });
      return res.status(200).json({ items: docs });
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get a single document metadata by id for the authenticated user
   */
  async getOne(req, res, next) {
    try {
      const userId = req.user.id;
      const id = Number(req.params.id);
      const doc = await documentsService.getDocument(userId, id);
      return res.status(200).json(doc);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Delete a document by id for the authenticated user
   */
  async remove(req, res, next) {
    try {
      const userId = req.user.id;
      const id = Number(req.params.id);
      const result = await documentsService.deleteDocument(userId, id);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = {
  controller: new DocumentsController(),
  uploadMiddleware: upload.single('file'),
};
