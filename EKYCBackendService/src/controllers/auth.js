const authService = require('../services/auth');

class AuthController {
  // PUBLIC_INTERFACE
  /**
   * Handle user registration
   */
  async register(req, res, next) {
    try {
      const { email, mobile, password } = req.body || {};
      const result = await authService.register({ email, mobile, password });
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Handle user login
   */
  async login(req, res, next) {
    try {
      const { email, mobile, password } = req.body || {};
      const result = await authService.login({ email, mobile, password });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Handle OTP request
   */
  async requestOtp(req, res, next) {
    try {
      const { email, mobile } = req.body || {};
      const result = await authService.requestOtp({ email, mobile });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Handle OTP verification
   */
  async verifyOtp(req, res, next) {
    try {
      const { email, mobile, otp } = req.body || {};
      const result = await authService.verifyOtp({ email, mobile, otp });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AuthController();
