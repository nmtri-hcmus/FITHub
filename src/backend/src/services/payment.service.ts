import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { CoachingService } from './coaching.service';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
// Only use mock mode when key is absent or a placeholder ('sk_test_mock').
// A valid Stripe test key (sk_test_...) will redirect to the Stripe hosted payment page.
const IS_DEV_MODE = !STRIPE_KEY || STRIPE_KEY === 'sk_test_mock';

const stripe = new Stripe(IS_DEV_MODE ? 'sk_test_mock' : STRIPE_KEY, {});

export const PaymentService = {
  async createCheckoutSession(userId: string, coachId: string) {
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
      include: { user: true }
    });

    if (!coachProfile) {
      throw new Error('Coach profile not found');
    }

    // ── DEV / MOCK MODE: bypass Stripe entirely ─────────────────────────────
    // This runs when Stripe is not configured (no real secret key).
    // In production with a real Stripe key, the real checkout flow runs below.
    if (IS_DEV_MODE) {
      const sub = await CoachingService.createMockSubscription(userId, coachId);
      // Return a URL that takes the user straight to the coaching portal
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
      return { url: `${frontendUrl}/coaching`, sub };
    }

    // ── PRODUCTION: real Stripe checkout ───────────────────────────────────
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `1-on-1 Coaching with ${coachProfile.user.name}`,
            },
            unit_amount: Math.round(coachProfile.hourlyRate * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        coachId,
      },
      success_url: `${frontendUrl}/coaches/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/coaches/profile?id=${coachId}`,
    });

    return { url: session.url };
  },

  async handleStripeWebhook(payload: string | Buffer, signature: string) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.userId;
      const coachId = session.metadata?.coachId;
      const stripeSubscriptionId = session.subscription as string;

      if (userId && coachId && stripeSubscriptionId) {
        // Calculate 1 month from now
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        await prisma.subscription.create({
          data: {
            userId,
            coachId,
            stripeSubscriptionId,
            status: 'active',
            currentPeriodEnd
          }
        });
      }
    }

    return { received: true };
  },

  async confirmCheckoutSession(sessionId: string) {
    if (IS_DEV_MODE) {
      return { success: true, message: 'Bypassed in dev mode' };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new Error('Payment check failed or checkout is not completed');
    }

    const userId = session.metadata?.userId;
    const coachId = session.metadata?.coachId;
    const stripeSubscriptionId = (session.subscription as string) || session.id;

    if (!userId || !coachId) {
      throw new Error('Missing metadata in checkout session');
    }

    // Check if subscription already exists
    const existing = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId }
    });

    if (existing) {
      return { success: true, sub: existing };
    }

    // Create the subscription
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const sub = await prisma.subscription.create({
      data: {
        userId,
        coachId,
        stripeSubscriptionId,
        status: 'active',
        currentPeriodEnd
      }
    });

    return { success: true, sub };
  }
};
