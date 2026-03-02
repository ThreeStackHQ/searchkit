import { Database, Search, BarChart2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const mockStats = {
  activeIndexes: 3,
  totalDocuments: 24_680,
  searchesToday: 1_247,
};

const mockActivity = [
  { query: 'typescript error handling', index: 'docs', results: 12, time: '2 min ago' },
  { query: 'next.js app router', index: 'blog', results: 8, time: '5 min ago' },
  { query: 'tailwind dark mode', index: 'docs', results: 0, time: '12 min ago' },
  { query: 'postgresql full text', index: 'docs', results: 23, time: '18 min ago' },
  { query: 'api rate limiting', index: 'blog', results: 4, time: '31 min ago' },
];

const quickStartSteps = [
  {
    step: 1,
    title: 'Create an Index',
    description: 'Set up your first search index to organize your documents.',
    href: '/dashboard/indexes',
    cta: 'Go to Indexes',
  },
  {
    step: 2,
    title: 'Ingest Documents',
    description: 'Use the REST API to push your documents for indexing.',
    href: '/dashboard/api-keys',
    cta: 'Get API Key',
  },
  {
    step: 3,
    title: 'Add the Widget',
    description: 'Drop the 5KB JS widget into your site with two lines of code.',
    href: 'https://docs.searchkit.threestack.io/widget',
    cta: 'View Docs',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Active Indexes</CardTitle>
                <Database className="h-4 w-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{mockStats.activeIndexes}</p>
              <p className="text-xs text-slate-500 mt-1">2 with documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Total Documents</CardTitle>
                <Search className="h-4 w-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{mockStats.totalDocuments.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">across all indexes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-400">Searches Today</CardTitle>
                <BarChart2 className="h-4 w-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{mockStats.searchesToday.toLocaleString()}</p>
              <p className="text-xs text-green-400 mt-1">↑ 12% vs yesterday</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity + Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Searches</CardTitle>
              <Link href="/dashboard/analytics" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockActivity.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate font-mono">&ldquo;{item.query}&rdquo;</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="text-indigo-400">{item.index}</span> · {item.time}
                    </p>
                  </div>
                  <div className="ml-3 text-right">
                    <span className={`text-xs font-medium ${item.results === 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {item.results === 0 ? 'No results' : `${item.results} results`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quickStartSteps.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-600/40 flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo-400">{step.step}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1.5"
                    >
                      {step.cta} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
