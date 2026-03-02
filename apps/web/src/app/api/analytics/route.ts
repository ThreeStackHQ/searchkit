import { NextRequest, NextResponse } from 'next/server';
import { db, searchLogs, searchIndexes, users, eq, and, sql } from '@searchkit/db';
import { auth } from '@/lib/auth';

const PERIOD_MAP: Record<string, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
};

// Optional Redis cache
let redis: import('ioredis').Redis | null = null;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redis;
  try {
    const { default: Redis } = await import('ioredis');
    redis = new Redis(process.env.REDIS_URL);
    return redis;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Require session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get workspaceId from session
  const workspaceId = (session as unknown as Record<string, unknown>).workspaceId as string | undefined;
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? '7d';
  const interval = PERIOD_MAP[period] ?? '7 days';

  // Check Redis cache
  const cacheKey = `analytics:${workspaceId}:${period}`;
  const r = await getRedis();
  if (r) {
    try {
      const cached = await r.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  // Aggregate search logs
  const since = sql`now() - interval ${sql.raw(`'${interval}'`)}`;
  const baseWhere = and(
    eq(searchLogs.workspaceId, workspaceId),
    sql`${searchLogs.createdAt} > ${since}`
  );

  // Total searches + zero result rate + avg response ms
  const summaryResult = await db
    .select({
      total: sql<number>`count(*)`,
      zero_results: sql<number>`count(*) filter (where ${searchLogs.resultsCount} = 0)`,
      avg_response_ms: sql<number>`avg(${searchLogs.responseMs})`,
      unique_ips: sql<number>`count(distinct ${searchLogs.ipHash})`,
    })
    .from(searchLogs)
    .where(baseWhere);

  const summary = summaryResult[0] ?? { total: 0, zero_results: 0, avg_response_ms: 0, unique_ips: 0 };
  const total = Number(summary.total);
  const zeroResults = Number(summary.zero_results);

  // Daily volume
  const dailyVolume = await db
    .select({
      date: sql<string>`date_trunc('day', ${searchLogs.createdAt})::date`,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(baseWhere)
    .groupBy(sql`date_trunc('day', ${searchLogs.createdAt})`)
    .orderBy(sql`date_trunc('day', ${searchLogs.createdAt})`);

  // Top queries
  const topQueries = await db
    .select({
      query: searchLogs.query,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(baseWhere)
    .groupBy(searchLogs.query)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  // Zero result queries
  const zeroResultQueries = await db
    .select({
      query: searchLogs.query,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .where(and(baseWhere, eq(searchLogs.resultsCount, 0)))
    .groupBy(searchLogs.query)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  // Searches by index
  const searchesByIndex = await db
    .select({
      indexId: searchLogs.indexId,
      indexName: searchIndexes.name,
      count: sql<number>`count(*)`,
    })
    .from(searchLogs)
    .leftJoin(searchIndexes, eq(searchLogs.indexId, searchIndexes.id))
    .where(baseWhere)
    .groupBy(searchLogs.indexId, searchIndexes.name)
    .orderBy(sql`count(*) desc`);

  const result = {
    period,
    total_searches: total,
    zero_result_rate: total > 0 ? zeroResults / total : 0,
    avg_response_ms: Number(summary.avg_response_ms ?? 0),
    unique_ips: Number(summary.unique_ips ?? 0),
    daily_volume: dailyVolume.map((d) => ({ date: d.date, count: Number(d.count) })),
    top_queries: topQueries.map((q) => ({ query: q.query, count: Number(q.count) })),
    zero_result_queries: zeroResultQueries.map((q) => ({ query: q.query, count: Number(q.count) })),
    searches_by_index: searchesByIndex.map((s) => ({
      index_id: s.indexId,
      index_name: s.indexName ?? 'Unknown',
      count: Number(s.count),
    })),
  };

  // Cache for 5 minutes
  if (r) {
    try {
      await r.setex(cacheKey, 300, JSON.stringify(result));
    } catch {
      // ignore
    }
  }

  return NextResponse.json(result);
}
