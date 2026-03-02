/**
 * Dashboard API Keys — session-authenticated
 * Allows dashboard users to create, list, and delete API keys for their workspace.
 * The raw key is returned ONCE on creation and never stored in plain-text DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { db, apiKeys } from '@searchkit/db';
import { auth } from '@/lib/auth';

async function getWorkspaceId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;
  return (session as unknown as Record<string, unknown>).workspaceId as string | null;
}

export async function GET() {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.workspaceId, workspaceId), eq(apiKeys.isActive, true)))
    .orderBy(apiKeys.createdAt);

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Generate a secure random API key: sk_live_<32 hex chars>
  const rawKey = `sk_live_${randomBytes(20).toString('hex')}`;
  const keyPrefix = rawKey.slice(0, 8); // "sk_live_" (first 8 chars)
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const [created] = await db
    .insert(apiKeys)
    .values({
      workspaceId,
      name: body.name.trim(),
      keyPrefix,
      keyHash,
      isActive: true,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  // Return the raw key ONCE — it won't be retrievable again
  return NextResponse.json({ key: created, rawKey }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const keyId = url.searchParams.get('id');
  if (!keyId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const deleted = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)))
    .returning({ id: apiKeys.id });

  if (!deleted[0]) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
