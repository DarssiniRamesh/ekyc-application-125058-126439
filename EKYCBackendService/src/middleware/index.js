const auth = require('./auth');
const adminAuth = require('./adminAuth');

// This file will export middleware as the application grows
module.exports = {
  auth,
  adminAuth,
};
