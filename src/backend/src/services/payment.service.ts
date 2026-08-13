import Stripe from 'stripe';
import { prisma } from '../lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  
});

export const PaymentService = {
  async createCheckoutSession(userId: string, coachId: string) {
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
      include: { user: true }
    });

    if (!coachProfile || !coachProfile.isVerified) {
      throw new Error('Coach not found or not verified');
    }

    // In a real app, you would create a Stripe Customer for the user here
    // and a Stripe Connected Account for the coach. 
    // For this prototype, we'll simulate a standard checkout session.

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
              unit_amount: Math.round(coachProfile.hourlyRate * 100), // convert to cents
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
        cancel_url: `${frontendUrl}/coaches/${coachId}`,
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
  }
};
