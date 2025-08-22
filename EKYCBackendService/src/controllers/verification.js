const verificationService = require('../services/verification');

class VerificationController {
  // PUBLIC_INTERFACE
  /**
   * Run mocked KYC verification checks for the authenticated user.
   * Body:
   *  - checks?: string[] (subset of ['PAN','AADHAAR','KRA','NPCI'])
   */
  async run(req, res, next) {
    try {
      const userId = req.user.id;
      const { checks } = req.body || {};
      const result = await verificationService.runVerifications(userId, { checks });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get recent verification results for the authenticated user.
   * Query:
   *  - check_type?: string
   *  - limit?: number (default 20, max 100)
   */
  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const { check_type, limit } = req.query || {};
      const rows = await verificationService.getVerificationResults(userId, { check_type, limit });
      return res.status(200).json({ items: rows });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new VerificationController();
