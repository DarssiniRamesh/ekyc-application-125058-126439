const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Ensure data directory exists if using relative path like ./data/app.db
function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/app.db');
ensureDirFor(DB_PATH);

// Open a single shared connection
const db = new sqlite3.Database(DB_PATH);

// Promise-based helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
  DB_PATH,
};
