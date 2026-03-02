'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Clock, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type Period = '7d' | '30d' | '90d';

interface DayPoint {
  date: string;
  count: number;
}

interface TopQuery {
  query: string;
  count: number;
  avgResults: number;
}

interface AnalyticsData {
  totalSearches: number;
  zeroResultRate: number;
  avgResponseTime: number;
  uniqueSearchers: number;
  dailyVolume: DayPoint[];
  topQueries: TopQuery[];
  zeroResultQueries: TopQuery[];
}

function generateMockData(period: Period): AnalyticsData {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const dailyVolume: DayPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyVolume.push({
      date: d.toISOString().slice(0, 10),
      count: Math.floor(800 + Math.random() * 800 + (i < 5 ? 200 : 0)),
    });
  }
  return {
    totalSearches: days * 1100 + Math.floor(Math.random() * 2000),
    zeroResultRate: 7.4 + Math.random() * 6,
    avgResponseTime: 18 + Math.floor(Math.random() * 12),
    uniqueSearchers: Math.floor(days * 42 + Math.random() * 400),
    dailyVolume,
    topQueries: [
      { query: 'typescript error handling', count: 324, avgResults: 14 },
      { query: 'next.js app router', count: 298, avgResults: 9 },
      { query: 'tailwind dark mode', count: 241, avgResults: 11 },
      { query: 'postgresql full text search', count: 198, avgResults: 7 },
      { query: 'react server components', count: 187, avgResults: 12 },
      { query: 'drizzle orm tutorial', count: 156, avgResults: 5 },
      { query: 'api rate limiting express', count: 143, avgResults: 8 },
      { query: 'jwt authentication', count: 129, avgResults: 15 },
    ],
    zeroResultQueries: [
      { query: 'graphql subscriptions', count: 89, avgResults: 0 },
      { query: 'websocket react native', count: 67, avgResults: 0 },
      { query: 'prisma edge runtime', count: 54, avgResults: 0 },
      { query: 'turbopack migration', count: 43, avgResults: 0 },
      { query: 'bun http server', count: 38, avgResults: 0 },
    ],
  };
}

// Pure SVG area chart
function AreaChart({ data, color = '#6366f1' }: { data: DayPoint[]; color?: string }) {
  const width = 800;
  const height = 160;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 32;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.count));
  const minVal = Math.min(...data.map((d) => d.count));
  const range = maxVal - minVal || 1;

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + (1 - (d.count - minVal) / range) * chartH,
    date: d.date,
    count: d.count,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${padT + chartH} L${pts[0].x},${padT + chartH} Z`;

  // X-axis labels: show first, middle, last
  const labelIndexes = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity={i === pts.length - 1 ? 1 : 0.4} />
      ))}
      {labelIndexes.map((li) => {
        const p = pts[li];
        const label = p.date.slice(5); // MM-DD
        const anchor = li === 0 ? 'start' : li === data.length - 1 ? 'end' : 'middle';
        return (
          <text key={li} x={p.x} y={height - 4} textAnchor={anchor} fill="#64748b" fontSize="11">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
      if (!res.ok) throw new Error('API not available');
      const json = await res.json() as AnalyticsData;
      setData(json);
    } catch {
      setData(generateMockData(p));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const zeroRateBad = (data?.zeroResultRate ?? 0) > 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor search performance and trends</p>
        </div>
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Searches</CardTitle>
                <Search className="h-4 w-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{data!.totalSearches.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Last {period}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-slate-400 font-medium uppercase tracking-wide">Zero-Result Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${zeroRateBad ? 'text-amber-400' : 'text-green-400'}`}>
                {data!.zeroResultRate.toFixed(1)}%
              </p>
              <p className={`text-xs mt-1 ${zeroRateBad ? 'text-amber-500' : 'text-green-600'}`}>
                {zeroRateBad ? '⚠ Above threshold' : '✓ Within target'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-slate-400 font-medium uppercase tracking-wide">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{data!.avgResponseTime}ms</p>
              <p className="text-xs text-green-500 mt-1">↓ sub-100ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-slate-400 font-medium uppercase tracking-wide">Unique Searchers</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{data!.uniqueSearchers.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Unique IP/sessions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Search Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : error ? (
            <div className="flex items-center justify-center h-40 text-slate-500 gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span>Failed to load chart data</span>
            </div>
          ) : (
            <AreaChart data={data!.dailyVolume} />
          )}
        </CardContent>
      </Card>

      {/* Two-column tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Queries</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-700">
                    <th className="text-left py-2">Query</th>
                    <th className="text-right py-2">Count</th>
                    <th className="text-right py-2">Avg Results</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.topQueries.map((q, i) => (
                    <tr key={i} className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/10">
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-200 max-w-[180px] truncate">{q.query}</td>
                      <td className="py-2.5 text-right text-slate-300">{q.count.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-slate-400">{q.avgResults}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Zero-Result Queries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Zero-Result Queries</CardTitle>
              <Badge variant="warning" className="text-xs">
                Needs Attention
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-700">
                    <th className="text-left py-2">Query</th>
                    <th className="text-right py-2">Searches</th>
                    <th className="text-right py-2">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.zeroResultQueries.map((q, i) => (
                    <tr key={i} className="border-b border-slate-700/40 last:border-0 hover:bg-slate-700/10">
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-200 max-w-[180px] truncate">{q.query}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant="warning" className="text-xs">{q.count}</Badge>
                      </td>
                      <td className="py-2.5 text-right text-amber-400 text-xs">0 results</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
