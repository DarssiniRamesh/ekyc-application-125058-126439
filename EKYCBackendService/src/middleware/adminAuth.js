const jwt = require('jsonwebtoken');

/**
 * Admin JWT auth middleware.
 * Expects Authorization: Bearer <token> signed with ADMIN_JWT_SECRET and payload containing { sub, email, role }
 * On success attaches req.admin = { id, email, role }.
 */
function adminAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (scheme !== 'Bearer' || !token) {
      const err = new Error('Unauthorized (admin)');
      err.status = 401;
      return next(err);
    }
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      const err = new Error('ADMIN_JWT_SECRET/JWT_SECRET not configured');
      err.status = 500;
      return next(err);
    }
    const decoded = jwt.verify(token, secret);
    if (!decoded || !decoded.role || !String(decoded.role).toLowerCase().includes('admin')) {
      const err = new Error('Forbidden: not an admin token');
      err.status = 403;
      return next(err);
    }
    req.admin = { id: decoded.sub, email: decoded.email, role: decoded.role };
    return next();
  } catch (e) {
    e.status = 401;
    return next(e);
  }
}

module.exports = adminAuth;
