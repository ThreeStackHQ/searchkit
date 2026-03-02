import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db, workspaces, subscriptions } from '@searchkit/db';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${String(err)}` }, { status: 400 });
  }

  const stripe = getStripe();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        if (!workspaceId || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id ?? '';
        const plan = getPlanFromPriceId(priceId);

        await upsertSubscription(workspaceId, sub, plan, priceId);
        await db.update(workspaces).set({ plan }).where(eq(workspaces.id, workspaceId));
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) break;

        const priceId = sub.items.data[0]?.price.id ?? '';
        const plan = getPlanFromPriceId(priceId);

        await upsertSubscription(workspaceId, sub, plan, priceId);
        await db.update(workspaces).set({ plan }).where(eq(workspaces.id, workspaceId));
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const workspaceId = sub.metadata?.workspaceId;
        if (!workspaceId) break;

        await db
          .update(subscriptions)
          .set({ status: 'canceled', plan: 'free', updatedAt: new Date() })
          .where(eq(subscriptions.workspaceId, workspaceId));

        await db.update(workspaces).set({ plan: 'free' }).where(eq(workspaces.id, workspaceId));
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Required to disable body parsing for Stripe webhook signature verification
export const dynamic = 'force-dynamic';

function getPlanFromPriceId(priceId: string): 'free' | 'indie' | 'pro' {
  if (priceId === process.env.STRIPE_PRICE_INDIE) return 'indie';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  return 'free';
}

async function upsertSubscription(
  workspaceId: string,
  sub: Stripe.Subscription,
  plan: 'free' | 'indie' | 'pro',
  priceId: string
) {
  const periodEnd = new Date((sub.current_period_end ?? 0) * 1000);

  await db
    .insert(subscriptions)
    .values({
      workspaceId,
      stripeSubId: sub.id,
      stripePriceId: priceId,
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd,
    })
    .onConflictDoUpdate({
      target: [subscriptions.workspaceId],
      set: {
        stripeSubId: sub.id,
        stripePriceId: priceId,
        plan,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      },
    });
}

