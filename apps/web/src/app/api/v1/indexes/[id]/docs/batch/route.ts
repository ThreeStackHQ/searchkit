import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, documents, searchIndexes } from '@searchkit/db';
import { authenticateApiKey } from '@/lib/api-auth';

const PLAN_DOC_LIMITS: Record<string, number> = {
  free: 10_000,
  indie: 100_000,
  pro: Infinity,
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Verify index ownership
  const idx = await db
    .select({ id: searchIndexes.id, documentCount: searchIndexes.documentCount })
    .from(searchIndexes)
    .where(and(eq(searchIndexes.id, params.id), eq(searchIndexes.workspaceId, auth.workspaceId)))
    .limit(1);

  if (!idx[0]) return NextResponse.json({ error: 'Index not found' }, { status: 404 });

  let body: { docs: Array<{ doc_id: string; content: Record<string, unknown> }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.docs)) {
    return NextResponse.json({ error: 'docs must be an array' }, { status: 400 });
  }

  const batchDocs = body.docs.slice(0, 500); // Max 500

  // Plan limit check
  const docLimit = PLAN_DOC_LIMITS[auth.plan] ?? 10_000;
  if (docLimit !== Infinity && idx[0].documentCount + batchDocs.length > docLimit) {
    return NextResponse.json(
      { error: `Would exceed document limit (${docLimit} for ${auth.plan} plan)` },
      { status: 403 }
    );
  }

  // Batch upsert
  const values = batchDocs.map((d) => ({
    indexId: params.id,
    docId: d.doc_id,
    content: d.content,
  }));

  const inserted = await db
    .insert(documents)
    .values(values)
    .onConflictDoUpdate({
      target: [documents.indexId, documents.docId],
      set: {
        content: sql`excluded.content`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: documents.id });

  // Update document count
  await db
    .update(searchIndexes)
    .set({
      documentCount: sql`${searchIndexes.documentCount} + ${inserted.length}`,
      updatedAt: new Date(),
    })
    .where(eq(searchIndexes.id, params.id));

  return NextResponse.json({
    ingested: inserted.length,
    total: inserted.length,
  });
}
