/**
 * Dashboard Indexes API — session-authenticated
 * Used by the dashboard UI (not the public /api/v1/* API).
 * The public API routes require Bearer token; this uses NextAuth session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, searchIndexes } from '@searchkit/db';
import { auth } from '@/lib/auth';

const PLAN_INDEX_LIMITS: Record<string, number> = {
  free: 1,
  indie: 5,
  pro: Infinity,
};

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

  const indexes = await db
    .select()
    .from(searchIndexes)
    .where(eq(searchIndexes.workspaceId, workspaceId))
    .orderBy(searchIndexes.createdAt);

  return NextResponse.json({ indexes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = (session as unknown as Record<string, unknown>).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
  }

  // Get workspace plan for limit check
  const { workspaces } = await import('@searchkit/db');
  const ws = await db
    .select({ plan: workspaces.plan })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const plan = ws[0]?.plan ?? 'free';
  const limit = PLAN_INDEX_LIMITS[plan] ?? 1;

  if (limit !== Infinity) {
    const existing = await db
      .select({ id: searchIndexes.id })
      .from(searchIndexes)
      .where(eq(searchIndexes.workspaceId, workspaceId));

    if (existing.length >= limit) {
      return NextResponse.json(
        { error: `Index limit reached (${limit} for ${plan} plan)` },
        { status: 403 }
      );
    }
  }

  let body: { name: string; description?: string; tsvector_config?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const [idx] = await db
    .insert(searchIndexes)
    .values({
      workspaceId,
      name: body.name,
      description: body.description,
      tsvectorConfig: body.tsvector_config ?? 'english',
    })
    .returning();

  return NextResponse.json({ index: idx }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const workspaceId = await getWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const deleted = await db
    .delete(searchIndexes)
    .where(and(eq(searchIndexes.id, id), eq(searchIndexes.workspaceId, workspaceId)))
    .returning({ id: searchIndexes.id });

  if (!deleted[0]) {
    return NextResponse.json({ error: 'Index not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
