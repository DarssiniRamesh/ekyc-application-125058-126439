const paymentsService = require('../services/payments');

class PaymentsController {
  // PUBLIC_INTERFACE
  /**
   * Calculate fees (mock).
   */
  async calculate(req, res, next) {
    try {
      const { base_amount, addons, discount } = req.body || {};
      const calc = paymentsService.calculateFees({ base_amount, addons, discount });
      return res.status(200).json(calc);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Initiate a payment intent in mock mode.
   */
  async initiate(req, res, next) {
    try {
      const userId = req.user.id;
      const { base_amount, addons, discount, provider, application_id } = req.body || {};
      const intent = await paymentsService.initiatePayment(userId, {
        base_amount,
        addons,
        discount,
        provider,
        application_id
      });
      return res.status(201).json(intent);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Get a specific payment.
   */
  async getOne(req, res, next) {
    try {
      const userId = req.user.id;
      const id = Number(req.params.id);
      const row = await paymentsService.getPayment(userId, id);
      return res.status(200).json(row);
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * List payments for the user.
   */
  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit, status } = req.query || {};
      const items = await paymentsService.listPayments(userId, { limit, status });
      return res.status(200).json({ items });
    } catch (err) {
      return next(err);
    }
  }

  // PUBLIC_INTERFACE
  /**
   * Simulate webhook/callback to change payment status.
   */
  async simulateWebhook(req, res, next) {
    try {
      const { payment_id, status, provider_event } = req.body || {};
      const row = await paymentsService.simulateWebhook({ payment_id, status, provider_event });
      return res.status(200).json(row);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new PaymentsController();
