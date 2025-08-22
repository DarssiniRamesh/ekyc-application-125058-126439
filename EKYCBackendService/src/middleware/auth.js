const jwt = require('jsonwebtoken');

/**
 * Simple JWT auth middleware.
 * Expects Authorization: Bearer <token>
 * Attaches req.user = { id, email, mobile } on success.
 */
module.exports = function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (scheme !== 'Bearer' || !token) {
      const err = new Error('Unauthorized');
      err.status = 401;
      return next(err);
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const err = new Error('JWT_SECRET not configured');
      err.status = 500;
      return next(err);
    }
    const decoded = jwt.verify(token, secret);
    req.user = { id: decoded.sub, email: decoded.email, mobile: decoded.mobile };
    return next();
  } catch (e) {
    e.status = 401;
    return next(e);
  }
};
