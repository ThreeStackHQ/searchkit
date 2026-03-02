import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db, documents, searchLogs, searchIndexes } from '@searchkit/db';
import { authenticateApiKey, checkRateLimit, checkDailySearchLimit } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Authenticate
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Rate limit
  if (!checkRateLimit(auth.apiKeyId)) {
    return NextResponse.json({ error: 'Rate limit exceeded (100 req/min)' }, { status: 429 });
  }

  // Check daily search limit
  const limitCheck = await checkDailySearchLimit(auth.workspaceId, auth.plan);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Daily search limit reached (${limitCheck.limit}/day for ${auth.plan} plan)` },
      { status: 429 }
    );
  }

  // Parse body
  let body: { q: string; index_id: string; limit?: number; offset?: number; highlight?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { q, index_id, limit = 10, offset = 0, highlight = true } = body;

  if (!q || !index_id) {
    return NextResponse.json({ error: 'q and index_id are required' }, { status: 400 });
  }

  // Verify index belongs to workspace
  const idx = await db
    .select({ id: searchIndexes.id })
    .from(searchIndexes)
    .where(and(eq(searchIndexes.id, index_id), eq(searchIndexes.workspaceId, auth.workspaceId)))
    .limit(1);

  if (!idx[0]) {
    return NextResponse.json({ error: 'Index not found' }, { status: 404 });
  }

  // Execute full-text search
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);

  const hits = await db
    .select({
      id: documents.id,
      docId: documents.docId,
      content: documents.content,
      score: sql<number>`ts_rank(search_vector, plainto_tsquery('english', ${q}))`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.indexId, index_id),
        sql`search_vector @@ plainto_tsquery('english', ${q})`
      )
    )
    .orderBy(sql`ts_rank(search_vector, plainto_tsquery('english', ${q})) DESC`)
    .limit(safeLimit)
    .offset(safeOffset);

  const took_ms = Date.now() - start;

  // Build highlight
  function buildHighlight(content: unknown, query: string): string {
    if (!highlight) return '';
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const words = query.toLowerCase().split(/\s+/);
    let result = text.slice(0, 200);
    for (const w of words) {
      result = result.replace(new RegExp(`(${w})`, 'gi'), '<b>$1</b>');
    }
    return result;
  }

  const response = {
    hits: hits.map((h) => ({
      id: h.docId,
      content: h.content,
      _score: h.score,
      _highlight: buildHighlight(h.content, q),
    })),
    total: hits.length,
    took_ms,
    query: q,
  };

  // Log async (don't block)
  const ipHash = req.headers.get('x-forwarded-for')
    ? createHash('sha256').update(req.headers.get('x-forwarded-for')!).digest('hex').slice(0, 16)
    : null;

  void db.insert(searchLogs).values({
    workspaceId: auth.workspaceId,
    indexId: index_id,
    query: q,
    resultsCount: hits.length,
    responseMs: took_ms,
    ipHash,
  });

  return NextResponse.json(response);
}
