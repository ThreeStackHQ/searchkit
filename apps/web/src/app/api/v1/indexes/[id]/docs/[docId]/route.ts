import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, documents, searchIndexes } from '@searchkit/db';
import { authenticateApiKey } from '@/lib/api-auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Verify index ownership
  const idx = await db
    .select({ id: searchIndexes.id })
    .from(searchIndexes)
    .where(and(eq(searchIndexes.id, params.id), eq(searchIndexes.workspaceId, auth.workspaceId)))
    .limit(1);

  if (!idx[0]) return NextResponse.json({ error: 'Index not found' }, { status: 404 });

  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.indexId, params.id), eq(documents.docId, params.docId)))
    .returning({ id: documents.id });

  if (!deleted[0]) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Decrement count
  await db
    .update(searchIndexes)
    .set({ documentCount: sql`GREATEST(${searchIndexes.documentCount} - 1, 0)` })
    .where(eq(searchIndexes.id, params.id));

  return NextResponse.json({ deleted: true });
}
