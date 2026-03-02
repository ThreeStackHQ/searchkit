import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, searchIndexes } from '@searchkit/db';
import { authenticateApiKey } from '@/lib/api-auth';

const PLAN_INDEX_LIMITS: Record<string, number> = {
  free: 1,
  indie: 5,
  pro: Infinity,
};

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const indexes = await db
    .select()
    .from(searchIndexes)
    .where(eq(searchIndexes.workspaceId, auth.workspaceId))
    .orderBy(searchIndexes.createdAt);

  return NextResponse.json({ indexes });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { name: string; description?: string; tsvector_config?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Check plan limits
  const limit = PLAN_INDEX_LIMITS[auth.plan] ?? 1;
  if (limit !== Infinity) {
    const existing = await db
      .select({ count: searchIndexes.id })
      .from(searchIndexes)
      .where(eq(searchIndexes.workspaceId, auth.workspaceId));

    if (existing.length >= limit) {
      return NextResponse.json(
        { error: `Index limit reached (${limit} for ${auth.plan} plan)` },
        { status: 403 }
      );
    }
  }

  const [idx] = await db
    .insert(searchIndexes)
    .values({
      workspaceId: auth.workspaceId,
      name: body.name,
      description: body.description,
      tsvectorConfig: body.tsvector_config ?? 'english',
    })
    .returning();

  return NextResponse.json({ index: idx }, { status: 201 });
}
