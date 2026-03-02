import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, searchIndexes } from '@searchkit/db';
import { authenticateApiKey } from '@/lib/api-auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = params;

  const deleted = await db
    .delete(searchIndexes)
    .where(and(eq(searchIndexes.id, id), eq(searchIndexes.workspaceId, auth.workspaceId)))
    .returning({ id: searchIndexes.id });

  if (!deleted[0]) {
    return NextResponse.json({ error: 'Index not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
