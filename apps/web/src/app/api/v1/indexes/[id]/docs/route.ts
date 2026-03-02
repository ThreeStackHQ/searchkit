import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, documents, searchIndexes } from '@searchkit/db';
import { authenticateApiKey } from '@/lib/api-auth';

const PLAN_DOC_LIMITS: Record<string, number> = {
  free: 10_000,
  indie: 100_000,
  pro: Infinity,
};

async function verifyIndexOwnership(indexId: string, workspaceId: string) {
  const idx = await db
    .select({ id: searchIndexes.id, documentCount: searchIndexes.documentCount })
    .from(searchIndexes)
    .where(and(eq(searchIndexes.id, indexId), eq(searchIndexes.workspaceId, workspaceId)))
    .limit(1);
  return idx[0] ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const idx = await verifyIndexOwnership(params.id, auth.workspaceId);
  if (!idx) return NextResponse.json({ error: 'Index not found' }, { status: 404 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const docs = await db
    .select({
      id: documents.id,
      docId: documents.docId,
      content: documents.content,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.indexId, params.id))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ docs, total: idx.documentCount });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const idx = await verifyIndexOwnership(params.id, auth.workspaceId);
  if (!idx) return NextResponse.json({ error: 'Index not found' }, { status: 404 });

  let body: { doc_id: string; content: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.doc_id || !body.content) {
    return NextResponse.json({ error: 'doc_id and content are required' }, { status: 400 });
  }

  // Plan doc limit
  const docLimit = PLAN_DOC_LIMITS[auth.plan] ?? 10_000;
  if (docLimit !== Infinity && idx.documentCount >= docLimit) {
    return NextResponse.json(
      { error: `Document limit reached (${docLimit} for ${auth.plan} plan)` },
      { status: 403 }
    );
  }

  const [doc] = await db
    .insert(documents)
    .values({
      indexId: params.id,
      docId: body.doc_id,
      content: body.content,
    })
    .onConflictDoUpdate({
      target: [documents.indexId, documents.docId],
      set: {
        content: body.content,
        updatedAt: new Date(),
      },
    })
    .returning({ id: documents.id, docId: documents.docId, indexId: documents.indexId, content: documents.content, createdAt: documents.createdAt, updatedAt: documents.updatedAt, xmax: sql<string>`xmax::text` });

  // Only increment count for genuine inserts (xmax = '0'), not updates
  if (doc?.xmax === '0') {
    await db
      .update(searchIndexes)
      .set({
        documentCount: sql`${searchIndexes.documentCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(searchIndexes.id, params.id));
  }

  // Strip internal xmax field before returning
  if (doc) {
    const { xmax: _xmax, ...docOut } = doc;
    return NextResponse.json({ doc: docOut }, { status: 201 });
  }
  return NextResponse.json({ doc }, { status: 201 });
}
