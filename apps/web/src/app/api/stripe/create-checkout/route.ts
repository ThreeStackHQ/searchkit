import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, workspaces } from '@searchkit/db';
import { auth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';

const PRICE_IDS: Record<string, string | undefined> = {
  indie: process.env.STRIPE_PRICE_INDIE,
  pro: process.env.STRIPE_PRICE_PRO,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = (session as unknown as Record<string, unknown>).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
  }

  let body: { plan: 'indie' | 'pro' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const priceId = PRICE_IDS[body.plan];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  // Get or create Stripe customer
  const ws = await db
    .select({ stripeCustomerId: workspaces.stripeCustomerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  let customerId = ws[0]?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      metadata: { workspaceId },
    });
    customerId = customer.id;
    await db
      .update(workspaces)
      .set({ stripeCustomerId: customerId })
      .where(eq(workspaces.id, workspaceId));
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/billing?success=true`,
    cancel_url: `${baseUrl}/dashboard/billing`,
    metadata: { workspaceId },
    subscription_data: {
      metadata: { workspaceId },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
