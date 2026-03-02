import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { db, workspaces, subscriptions, searchLogs, users } from '@searchkit/db';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all workspaces with users that had searches in the past 7 days
  const activeWorkspaces = await db
    .selectDistinct({ workspaceId: searchLogs.workspaceId })
    .from(searchLogs)
    .where(sql`${searchLogs.createdAt} > ${sevenDaysAgo}`);

  let sent = 0;
  let skipped = 0;

  for (const { workspaceId } of activeWorkspaces) {
    try {
      // Aggregate stats
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          zero_results: sql<number>`count(*) filter (where ${searchLogs.resultsCount} = 0)`,
          avg_ms: sql<number>`avg(${searchLogs.responseMs})`,
        })
        .from(searchLogs)
        .where(
          and(
            eq(searchLogs.workspaceId, workspaceId),
            sql`${searchLogs.createdAt} > ${sevenDaysAgo}`
          )
        );

      const totalSearches = Number(stats?.total ?? 0);
      if (totalSearches === 0) { skipped++; continue; }

      const zeroResultRate = totalSearches > 0
        ? Math.round((Number(stats?.zero_results ?? 0) / totalSearches) * 100)
        : 0;

      // Top 5 queries
      const topQueries = await db
        .select({ query: searchLogs.query, count: sql<number>`count(*)` })
        .from(searchLogs)
        .where(
          and(
            eq(searchLogs.workspaceId, workspaceId),
            sql`${searchLogs.createdAt} > ${sevenDaysAgo}`
          )
        )
        .groupBy(searchLogs.query)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      // Get workspace info + user email
      const wsInfo = await db
        .select({ name: workspaces.name, plan: workspaces.plan })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      const wsUser = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.workspaceId, workspaceId))
        .limit(1);

      if (!wsUser[0]?.email) { skipped++; continue; }

      const wsName = wsInfo[0]?.name ?? 'Your Workspace';
      const isPaidPlan = wsInfo[0]?.plan !== 'free';

      // Send email
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? 'SearchKit <noreply@searchkit.app>',
        to: wsUser[0].email,
        subject: `📊 Your SearchKit Weekly Report — ${totalSearches.toLocaleString()} searches`,
        html: buildEmailHtml({
          wsName,
          userName: wsUser[0].name ?? wsUser[0].email,
          totalSearches,
          zeroResultRate,
          avgMs: Math.round(Number(stats?.avg_ms ?? 0)),
          topQueries: topQueries.map((q) => ({ query: q.query, count: Number(q.count) })),
          plan: wsInfo[0]?.plan ?? 'free',
          isPaidPlan,
        }),
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send digest for workspace ${workspaceId}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    total: activeWorkspaces.length,
  });
}

function buildEmailHtml(data: {
  wsName: string;
  userName: string;
  totalSearches: number;
  zeroResultRate: number;
  avgMs: number;
  topQueries: { query: string; count: number }[];
  plan: string;
  isPaidPlan: boolean;
}): string {
  const topQueriesRows = data.topQueries
    .map(
      (q) => `
      <tr style="border-bottom:1px solid #2d2d4e">
        <td style="padding:10px 0;color:#e0e0ff;font-size:14px">${escHtml(q.query)}</td>
        <td style="padding:10px 0;color:#a78bfa;font-size:14px;text-align:right">${q.count.toLocaleString()}</td>
      </tr>`
    )
    .join('');

  const upgradeCTA = !data.isPaidPlan
    ? `<div style="margin-top:32px;padding:20px;background:#1a0a3e;border:1px solid #7c3aed;border-radius:10px;text-align:center">
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 12px">Unlock 50K searches/day and analytics with Indie</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://searchkit.app'}/dashboard/billing" 
           style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
          Upgrade to Indie → $9/mo
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:28px;font-weight:700;color:#fff">
        <span style="color:#7c3aed">Search</span>Kit
      </div>
      <div style="color:#888;font-size:13px;margin-top:4px">Weekly Performance Report</div>
    </div>

    <!-- Greeting -->
    <p style="color:#ccc;font-size:15px">Hi ${escHtml(data.userName)},</p>
    <p style="color:#ccc;font-size:15px">Here's your weekly summary for <strong style="color:#fff">${escHtml(data.wsName)}</strong>:</p>

    <!-- Stats Cards -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0">
      <div style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#a78bfa">${data.totalSearches.toLocaleString()}</div>
        <div style="font-size:12px;color:#888;margin-top:4px">Total Searches</div>
      </div>
      <div style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:${data.zeroResultRate > 20 ? '#f87171' : '#34d399'}">${data.zeroResultRate}%</div>
        <div style="font-size:12px;color:#888;margin-top:4px">Zero-Result Rate</div>
      </div>
      <div style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:10px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#60a5fa">${data.avgMs}ms</div>
        <div style="font-size:12px;color:#888;margin-top:4px">Avg Response</div>
      </div>
    </div>

    <!-- Top Queries -->
    ${data.topQueries.length > 0 ? `
    <div style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:10px;padding:20px;margin-top:24px">
      <h3 style="color:#fff;font-size:15px;margin:0 0 16px">🔍 Top Queries</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="color:#666;font-size:12px;text-align:left;padding-bottom:8px">Query</th>
            <th style="color:#666;font-size:12px;text-align:right;padding-bottom:8px">Searches</th>
          </tr>
        </thead>
        <tbody>${topQueriesRows}</tbody>
      </table>
    </div>` : ''}

    ${upgradeCTA}

    <!-- Footer -->
    <div style="margin-top:40px;text-align:center;color:#555;font-size:12px">
      <p>SearchKit · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://searchkit.app'}/dashboard" style="color:#7c3aed">View Dashboard</a></p>
      <p style="margin-top:4px">You're on the <span style="color:#a78bfa;text-transform:capitalize">${escHtml(data.plan)}</span> plan</p>
    </div>
  </div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
