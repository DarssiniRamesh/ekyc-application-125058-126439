const kycService = require('../services/kyc');

class KycController {
  // PUBLIC_INTERFACE
  /**
   * Get profile for current user (from JWT)
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.getProfile(userId);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update profile (upsert) for current user
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.updateProfile(userId, req.body || {});
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get identity for current user
   */
  async getIdentity(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.getIdentity(userId);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update identity (upsert) for current user
   */
  async updateIdentity(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.updateIdentity(userId, req.body || {});
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get address for current user
   */
  async getAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.getAddress(userId);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update address (upsert) for current user
   */
  async updateAddress(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.updateAddress(userId, req.body || {});
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get bank for current user
   */
  async getBank(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.getBank(userId);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Update bank (upsert) for current user
   */
  async updateBank(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.updateBank(userId, req.body || {});
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get onboarding status for current user
   */
  async getStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const data = await kycService.getOnboardingStatus(userId);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new KycController();
