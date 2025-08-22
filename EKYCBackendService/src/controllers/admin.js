const adminService = require('../services/admin');

class AdminController {
  // PUBLIC_INTERFACE
  /**
   * Admin login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const result = await adminService.login(
        { email, password },
        { ip: req.ip, user_agent: req.headers['user-agent'] }
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get application review queue
   */
  async getQueue(req, res, next) {
    try {
      const { status, limit, offset } = req.query || {};
      const items = await adminService.getQueue({
        status: status ? String(status).split(',').map(s => s.trim().toUpperCase()) : undefined,
        limit,
        offset,
      });
      return res.status(200).json({ items });
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get application detail by ID
   */
  async getApplication(req, res, next) {
    try {
      const id = Number(req.params.id);
      const detail = await adminService.getApplicationDetail(id);
      return res.status(200).json(detail);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Approve application
   */
  async approve(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { comment } = req.body || {};
      const adminId = req.admin.id;
      const result = await adminService.approveApplication(
        { applicationId: id, adminId, comment },
        { ip: req.ip, user_agent: req.headers['user-agent'] }
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Reject application
   */
  async reject(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { reason } = req.body || {};
      const adminId = req.admin.id;
      const result = await adminService.rejectApplication(
        { applicationId: id, adminId, reason },
        { ip: req.ip, user_agent: req.headers['user-agent'] }
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AdminController();
