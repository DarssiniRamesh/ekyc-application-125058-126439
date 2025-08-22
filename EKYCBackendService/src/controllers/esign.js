const esignService = require('../services/esign');

class EsignController {
  // PUBLIC_INTERFACE
  /**
   * Initiate an e-sign request (mock).
   */
  async initiate(req, res, next) {
    try {
      const userId = req.user.id;
      const { document_id, provider, application_id } = req.body || {};
      const out = await esignService.initiateEsign(userId, { document_id, provider, application_id });
      return res.status(201).json(out);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get a specific e-sign request.
   */
  async getOne(req, res, next) {
    try {
      const userId = req.user.id;
      const id = Number(req.params.id);
      const row = await esignService.getEsign(userId, id);
      return res.status(200).json(row);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * List e-sign requests for the user.
   */
  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit, status } = req.query || {};
      const items = await esignService.listEsign(userId, { limit, status });
      return res.status(200).json({ items });
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Simulate callback for e-sign request status update.
   */
  async simulateCallback(req, res, next) {
    try {
      const { esign_id, status } = req.body || {};
      const row = await esignService.simulateEsignCallback({ esign_id, status });
      return res.status(200).json(row);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new EsignController();
