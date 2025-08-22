const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { run, get, all } = require('../db');

/**
 * Compute SHA256 checksum for a given file path.
 * Returns hex string or null if fails.
 */
function computeChecksum(filePath) {
  try {
    const hash = crypto.createHash('sha256');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
  } catch (e) {
    // Log but do not fail the request if checksum can't be computed
    console.warn('Checksum computation failed:', e.message);
    return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * Save uploaded file metadata to DB.
 * Expects: userId, file (from multer), optional category, description
 */
async function saveUpload({ userId, file, category, description }) {
  if (!file) {
    const err = new Error('No file provided');
    err.status = 400;
    throw err;
  }
  const ts = Date.now();
  const relativePath = path.relative(path.join(__dirname, '../../'), file.path).replace(/\\/g, '/');
  const checksum = computeChecksum(file.path);

  const { lastID } = await run(
    `INSERT INTO documents
      (user_id, original_name, stored_name, mime_type, size, category, description, path, checksum, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      file.originalname,
      file.filename,
      file.mimetype,
      file.size,
      category || null,
      description || null,
      relativePath,
      checksum,
      ts,
      ts
    ]
  );

  return get('SELECT * FROM documents WHERE id = ?', [lastID]);
}

/**
 * PUBLIC_INTERFACE
 * List documents for the current user. Optional filter by category.
 */
async function listDocuments(userId, { category } = {}) {
  if (category) {
    return all(
      'SELECT * FROM documents WHERE user_id = ? AND category = ? ORDER BY created_at DESC',
      [userId, category]
    );
  }
  return all('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

/**
 * PUBLIC_INTERFACE
 * Get single document metadata by id (must belong to user).
 */
async function getDocument(userId, id) {
  const row = await get('SELECT * FROM documents WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }
  return row;
}

/**
 * PUBLIC_INTERFACE
 * Delete a document by id (removes file and DB record). Must belong to user.
 */
async function deleteDocument(userId, id) {
  const row = await get('SELECT * FROM documents WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }
  // Attempt to remove file
  try {
    const absPath = path.join(__dirname, '../../', row.path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (e) {
    console.warn('Failed to delete file from disk:', e.message);
  }
  await run('DELETE FROM documents WHERE id = ?', [id]);
  return { deleted: true };
}

module.exports = {
  saveUpload,
  listDocuments,
  getDocument,
  deleteDocument,
};
