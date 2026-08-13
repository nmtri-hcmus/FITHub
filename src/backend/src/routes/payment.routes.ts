import express, { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/checkout', express.json(), requireAuth, PaymentController.checkout);

// Stripe requires raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.webhook);

export default router;
