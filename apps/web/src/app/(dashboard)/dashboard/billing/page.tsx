import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db, workspaces, subscriptions, searchLogs, eq, and, sql } from '@searchkit/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: ['1 search index', '10K documents', '1K searches/day'],
  },
  {
    id: 'indie',
    name: 'Indie',
    price: '$9/mo',
    features: ['5 search indexes', '100K documents', '50K searches/day', 'Analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19/mo',
    features: [
      'Unlimited indexes',
      'Unlimited documents',
      'Unlimited searches',
      'Analytics + Redis cache',
      'Priority support',
    ],
  },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const workspaceId = (session as unknown as Record<string, unknown>).workspaceId as string | undefined;
  if (!workspaceId) redirect('/dashboard');

  const [ws] = await db
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const [usageResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(
      and(
        eq(searchLogs.workspaceId, workspaceId),
        sql`${searchLogs.createdAt} > now() - interval '24 hours'`
      )
    );

  const dailySearches = Number(usageResult?.count ?? 0);
  const currentPlan = ws?.plan ?? 'free';
  const dailyLimit = currentPlan === 'pro' ? 'Unlimited' : currentPlan === 'indie' ? '50,000' : '1,000';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {searchParams.success && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-400">
          ✅ Subscription activated! Welcome to {currentPlan} plan.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-gray-400 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Current Plan</CardTitle>
          <CardDescription>
            You are on the <span className="text-violet-400 font-semibold capitalize">{currentPlan}</span> plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm">Searches today</div>
              <div className="text-white text-2xl font-bold">{dailySearches.toLocaleString()}</div>
              <div className="text-gray-500 text-xs">of {dailyLimit}/day</div>
            </div>
            {sub?.currentPeriodEnd && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Next billing date</div>
                <div className="text-white text-lg font-semibold">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </div>
                <div className="text-gray-500 text-xs capitalize">{sub.status}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`bg-gray-900 border-gray-800 ${currentPlan === plan.id ? 'border-violet-500' : ''}`}
          >
            <CardHeader>
              <CardTitle className="text-white">{plan.name}</CardTitle>
              <div className="text-2xl font-bold text-violet-400">{plan.price}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="text-gray-400 text-sm flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              {currentPlan !== plan.id && plan.id !== 'free' ? (
                <form action={`/api/stripe/create-checkout`} method="POST">
                  <input type="hidden" name="plan" value={plan.id} />
                  <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700">
                    Upgrade to {plan.name}
                  </Button>
                </form>
              ) : currentPlan === plan.id ? (
                <Button disabled className="w-full opacity-50">
                  Current Plan
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
