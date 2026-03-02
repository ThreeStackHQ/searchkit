import Link from 'next/link';
import { Check, X, Search, Zap, BarChart2, Code, Database, Activity } from 'lucide-react';

const features = [
  {
    icon: Database,
    title: 'Full-Text Search',
    desc: 'PostgreSQL FTS under the hood. No Elasticsearch, no Solr, no separate infra.',
  },
  {
    icon: Zap,
    title: '5KB Widget',
    desc: 'Cmd+K search modal, keyboard navigation, zero dependencies. Drop in two lines.',
  },
  {
    icon: BarChart2,
    title: 'Search Analytics',
    desc: 'Track zero-result queries, top queries, response times. Know what users want.',
  },
  {
    icon: Code,
    title: 'Developer First',
    desc: 'REST API, batch ingest 500 docs at once, JSON everywhere, no SDKs needed.',
  },
  {
    icon: Database,
    title: 'Zero Infrastructure',
    desc: 'Uses the PostgreSQL you already have. No new services to provision or maintain.',
  },
  {
    icon: Activity,
    title: 'Real-Time',
    desc: 'Sub-100ms search results, Redis-cached analytics. Speed you can actually feel.',
  },
];

const pricing = [
  {
    name: 'Free',
    price: '$0',
    desc: 'For personal projects',
    features: ['1 index', '10K documents', '1K searches/day', 'Basic analytics', 'Community support'],
    cta: 'Get Started Free',
    href: '/auth/signin',
    highlight: false,
  },
  {
    name: 'Indie',
    price: '$9',
    period: '/mo',
    desc: 'For indie developers',
    features: ['5 indexes', '100K documents', '50K searches/day', 'Full analytics', 'Email support', 'Custom widget branding'],
    cta: 'Start Indie',
    href: '/auth/signin?plan=indie',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For growing products',
    features: ['Unlimited indexes', 'Unlimited documents', 'Unlimited searches', 'Advanced analytics', 'Priority support', 'SLA guarantee'],
    cta: 'Start Pro',
    href: '/auth/signin?plan=pro',
    highlight: false,
  },
];

const comparisonRows = [
  {
    feature: 'Self-hosted option',
    searchkit: true,
    algolia: false,
    typesense: true,
    meilisearch: true,
  },
  {
    feature: 'No infra setup',
    searchkit: true,
    algolia: true,
    typesense: false,
    meilisearch: false,
  },
  {
    feature: 'JS Widget (Cmd+K)',
    searchkit: true,
    algolia: true,
    typesense: false,
    meilisearch: false,
  },
  {
    feature: 'Search Analytics',
    searchkit: true,
    algolia: true,
    typesense: false,
    meilisearch: true,
  },
  {
    feature: 'Price (hosted)',
    searchkit: '$9/mo',
    algolia: '$50+/mo',
    typesense: '$29/mo',
    meilisearch: '$25/mo',
  },
];

function CheckIcon({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="font-semibold text-indigo-400">{value}</span>;
  }
  return value ? (
    <Check className="h-5 w-5 text-green-400 mx-auto" />
  ) : (
    <X className="h-5 w-5 text-slate-600 mx-auto" />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      {/* Sticky Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Search className="h-4 w-4 text-white" />
            </div>
            <span className="text-white">SearchKit</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <Link href="https://docs.searchkit.threestack.io" className="hover:text-white transition-colors">Docs</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="https://github.com/ThreeStackHQ/searchkit" className="hover:text-white transition-colors">GitHub</Link>
          </div>
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-600/30 bg-indigo-600/10 text-indigo-400 text-xs font-medium mb-6">
                <Activity className="h-3 w-3" />
                Search-as-a-Service · PostgreSQL FTS · $9/mo
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
                Search that<br />
                <span className="text-indigo-400">just works</span>
              </h1>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Drop-in search API powered by PostgreSQL full-text search. Add a 5KB Cmd+K widget to your site in two lines. No Elasticsearch, no extra infra.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-base"
                >
                  Get Started Free →
                </Link>
                <Link
                  href="https://docs.searchkit.threestack.io"
                  className="inline-flex items-center justify-center px-6 py-3 border border-slate-600 text-slate-300 hover:bg-slate-800 font-semibold rounded-xl transition-colors text-base"
                >
                  View Docs
                </Link>
              </div>
            </div>

            {/* Cmd+K Widget Mockup */}
            <div className="relative">
              <div className="bg-slate-800/60 border border-slate-600/50 rounded-2xl p-2 shadow-2xl backdrop-blur-sm">
                <div className="bg-[#1e293b] rounded-xl overflow-hidden">
                  {/* Fake browser chrome */}
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                    <div className="h-3 w-3 rounded-full bg-red-500/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-green-500/60" />
                    <div className="flex-1 mx-4 bg-slate-800 rounded px-3 py-1 text-xs text-slate-500">
                      myapp.com/docs
                    </div>
                    <kbd className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded text-xs text-slate-400">⌘K</kbd>
                  </div>
                  {/* Search modal */}
                  <div className="p-4">
                    <div className="bg-slate-900 border border-indigo-500/40 rounded-xl shadow-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
                        <Search className="h-4 w-4 text-indigo-400" />
                        <span className="text-slate-300 text-sm">Search documentation...</span>
                        <span className="ml-auto text-xs text-slate-600">ESC to close</span>
                      </div>
                      <div className="p-2">
                        {[
                          { title: 'Getting Started Guide', section: 'docs', active: true },
                          { title: 'API Reference — Indexes', section: 'api' },
                          { title: 'Widget Installation', section: 'guide' },
                          { title: 'Analytics Dashboard', section: 'docs' },
                        ].map((r, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${i === 0 ? 'bg-indigo-600/20 border border-indigo-600/30' : 'hover:bg-slate-700/40'}`}
                          >
                            <div className="h-5 w-5 rounded bg-indigo-900/40 flex items-center justify-center">
                              <Search className="h-3 w-3 text-indigo-400" />
                            </div>
                            <span className={i === 0 ? 'text-white' : 'text-slate-300'}>{r.title}</span>
                            <span className="ml-auto text-xs text-slate-500">{r.section}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-2 border-t border-slate-700 flex items-center gap-3 text-xs text-slate-600">
                        <span>↑↓ navigate</span>
                        <span>⏎ select</span>
                        <span>Powered by <span className="text-indigo-500">SearchKit</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-slate-400">From zero to search in under 10 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Ingest your data via API',
                desc: 'Send your documents to the REST API. Batch up to 500 docs per request. Works with any data structure.',
                code: `curl -X POST /api/v1/indexes/docs/ingest \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -d '{"documents": [...]}'`,
              },
              {
                step: '02',
                title: 'Add the 5KB JS widget',
                desc: 'Drop two lines of HTML/JS into your site. The Cmd+K modal works with zero configuration.',
                code: `<script src="https://cdn.searchkit.io/widget.js"
  data-index="docs"
  data-key="pk_xxx">
</script>`,
              },
              {
                step: '03',
                title: 'Search analytics out of the box',
                desc: "See what users search for, what returns no results, and how fast searches run — no extra setup.",
                code: `// Your dashboard shows:
// - Top queries
// - Zero-result rate
// - Avg response time
// - Daily search volume`,
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="flex items-start gap-4 mb-4">
                  <span className="text-4xl font-black text-indigo-600/30">{s.step}</span>
                  <div className="pt-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-green-300 font-mono leading-relaxed overflow-x-auto">
                  {s.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Everything you need</h2>
            <p className="text-slate-400">Built for developers who want search done right</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="p-6 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:border-indigo-600/30 hover:bg-slate-800/60 transition-all group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-600/30 mb-4 group-hover:bg-indigo-600/30 transition-colors">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Simple pricing</h2>
            <p className="text-slate-400">No usage surprises. Start free, upgrade when you&apos;re ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-8 flex flex-col ${
                  p.highlight
                    ? 'border-indigo-500 bg-indigo-600/10 ring-1 ring-indigo-500/30'
                    : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                {p.highlight && (
                  <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{p.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white">{p.price}</span>
                  {p.period && <span className="text-slate-400 text-sm">{p.period}</span>}
                </div>
                <ul className="space-y-2.5 flex-1 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`inline-flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                    p.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'border border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">SearchKit vs. the rest</h2>
            <p className="text-slate-400">Why pay $50/mo when $9 gets you everything you need?</p>
          </div>
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-slate-400 font-medium">Feature</th>
                  <th className="px-4 py-4 text-center">
                    <span className="text-indigo-400 font-bold">SearchKit</span>
                  </th>
                  <th className="px-4 py-4 text-center text-slate-400 font-medium">Algolia</th>
                  <th className="px-4 py-4 text-center text-slate-400 font-medium">Typesense</th>
                  <th className="px-4 py-4 text-center text-slate-400 font-medium">Meilisearch</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-slate-700/50 last:border-0 ${i % 2 === 0 ? 'bg-slate-800/20' : ''}`}
                  >
                    <td className="px-6 py-4 text-slate-300">{row.feature}</td>
                    <td className="px-4 py-4 text-center">
                      <CheckIcon value={row.searchkit} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <CheckIcon value={row.algolia} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <CheckIcon value={row.typesense} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <CheckIcon value={row.meilisearch} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Search className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-white">SearchKit</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="https://docs.searchkit.threestack.io" className="hover:text-white transition-colors">Docs</Link>
              <Link href="https://docs.searchkit.threestack.io/api" className="hover:text-white transition-colors">API</Link>
              <Link href="https://github.com/ThreeStackHQ/searchkit" className="hover:text-white transition-colors">GitHub</Link>
              <Link href="https://twitter.com/threestack_io" className="hover:text-white transition-colors">Twitter</Link>
            </div>
            <p className="text-xs text-slate-600">
              © 2026 ThreeStack. Built with 🔍 SearchKit.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
