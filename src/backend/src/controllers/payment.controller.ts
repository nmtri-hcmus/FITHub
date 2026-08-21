import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

export const PaymentController = {
  async checkout(req: Request, res: Response) {
    try {
      // @ts-ignore
      const userId = req.user.id;
      const { coachId } = req.body;
      const session = await PaymentService.createCheckoutSession(userId, coachId);
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async webhook(req: Request, res: Response) {
    try {
      const sig = req.headers['stripe-signature'] as string;
      // Note: Stripe requires the raw body buffer, which needs to be configured in Express middleware
      const result = await PaymentService.handleStripeWebhook(req.body, sig);
      res.json(result);
    } catch (err: any) {
      console.error(err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  },

  async confirm(req: Request, res: Response) {
    try {
      const { session_id } = req.query;
      if (!session_id) {
        res.status(400).json({ error: 'session_id is required' });
        return;
      }
      const result = await PaymentService.confirmCheckoutSession(session_id as string);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
