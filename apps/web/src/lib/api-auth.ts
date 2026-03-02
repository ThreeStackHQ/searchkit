import { createHash } from 'crypto';

import { db, apiKeys, workspaces, subscriptions } from '@searchkit/db';
import { eq, and } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

export type AuthResult =
  | { ok: true; apiKeyId: string; workspaceId: string; plan: 'free' | 'indie' | 'pro' }
  | { ok: false; error: string; status: number };

// In-memory rate limit store: apiKeyId -> sliding window timestamps
const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(apiKeyId: string, maxPerMin = 100): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const timestamps = (rateLimitStore.get(apiKeyId) ?? []).filter(
    (t) => now - t < windowMs
  );
  if (timestamps.length >= maxPerMin) return false;
  timestamps.push(now);
  rateLimitStore.set(apiKeyId, timestamps);
  return true;
}

export async function authenticateApiKey(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { ok: false, error: 'Missing Bearer token', status: 401 };
  }

  // Hash the token
  const keyHash = createHash('sha256').update(token).digest('hex');

  const result = await db
    .select({
      id: apiKeys.id,
      workspaceId: apiKeys.workspaceId,
      isActive: apiKeys.isActive,
      plan: workspaces.plan,
    })
    .from(apiKeys)
    .innerJoin(workspaces, eq(apiKeys.workspaceId, workspaces.id))
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!result[0]) {
    return { ok: false, error: 'Invalid API key', status: 401 };
  }

  const { id, workspaceId, plan } = result[0];

  // Update last_used_at asynchronously
  void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));

  return { ok: true, apiKeyId: id, workspaceId, plan };
}

// Check daily search limits
export async function checkDailySearchLimit(
  workspaceId: string,
  plan: 'free' | 'indie' | 'pro'
): Promise<{ allowed: boolean; limit: number; used: number }> {
  if (plan === 'pro') return { allowed: true, limit: Infinity, used: 0 };

  const limit = plan === 'indie' ? 50_000 : 1_000;

  // Import searchLogs here to avoid circular
  const { searchLogs } = await import('@searchkit/db');
  const { sql } = await import('drizzle-orm');

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchLogs)
    .where(
      and(
        eq(searchLogs.workspaceId, workspaceId),
        sql`${searchLogs.createdAt} > now() - interval '1 day'`
      )
    );

  const used = Number(result[0]?.count ?? 0);
  return { allowed: used < limit, limit, used };
}
