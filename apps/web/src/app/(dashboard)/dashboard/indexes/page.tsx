'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Copy, Check, Trash2, AlertTriangle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

interface IndexItem {
  id: string;
  name: string;
  description: string | null;
  documentCount: number;
  searchesPerDay: number;
  createdAt: string;
}

const MOCK_INDEXES: IndexItem[] = [
  {
    id: 'idx_1',
    name: 'docs',
    description: 'Product documentation and API reference',
    documentCount: 18_432,
    searchesPerDay: 842,
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'idx_2',
    name: 'blog',
    description: 'Blog posts and articles',
    documentCount: 6_248,
    searchesPerDay: 405,
    createdAt: '2026-02-15T14:00:00Z',
  },
  {
    id: 'idx_3',
    name: 'changelog',
    description: null,
    documentCount: 0,
    searchesPerDay: 0,
    createdAt: '2026-02-28T09:00:00Z',
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function IndexesPage() {
  const [indexes, setIndexes] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newIndexOpen, setNewIndexOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchIndexes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/indexes');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json() as { indexes: IndexItem[] };
      setIndexes(data.indexes ?? []);
    } catch {
      setError('Failed to load indexes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIndexes();
  }, [fetchIndexes]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(form.name)) {
      setFormError('Name must be lowercase alphanumeric with hyphens only');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/dashboard/indexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description || undefined }),
      });
      const data = await res.json() as { index?: { id: string; name: string }; error?: string };
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to create index');
        return;
      }
      // Show success — user must go to API Keys page to create a bearer token
      setCreatedKey('__created__');
      setIndexes((prev) => [
        ...prev,
        {
          id: data.index?.id ?? `idx_${Date.now()}`,
          name: form.name,
          description: form.description || null,
          documentCount: 0,
          searchesPerDay: 0,
          createdAt: new Date().toISOString(),
        },
      ]);
      setForm({ name: '', description: '' });
    } catch {
      setFormError('Network error, please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/dashboard/indexes?id=${id}`, { method: 'DELETE' });
    } catch {
      // continue
    }
    setIndexes((prev) => prev.filter((i) => i.id !== id));
    setDeleteTarget(null);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Indexes</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your search indexes</p>
        </div>
        <Button onClick={() => setNewIndexOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Index
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <p className="text-slate-300 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchIndexes}>Retry</Button>
          </CardContent>
        </Card>
      ) : indexes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Database className="h-10 w-10 text-slate-600 mx-auto mb-4" />
            <h3 className="text-slate-300 font-medium mb-2">No indexes yet</h3>
            <p className="text-slate-500 text-sm mb-6">Create your first index to start ingesting documents.</p>
            <Button onClick={() => setNewIndexOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Index
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Name</th>
                  <th className="text-left px-6 py-4 hidden md:table-cell">Description</th>
                  <th className="text-right px-6 py-4">Documents</th>
                  <th className="text-right px-6 py-4 hidden lg:table-cell">Searches/day</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4 hidden lg:table-cell">Created</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {indexes.map((idx) => (
                  <tr
                    key={idx.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors last:border-0"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-indigo-300 font-medium">{idx.name}</span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-slate-400 max-w-xs truncate">
                      {idx.description ?? <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      {idx.documentCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 hidden lg:table-cell">
                      {idx.searchesPerDay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={idx.documentCount > 0 ? 'success' : 'gray'}>
                        {idx.documentCount > 0 ? 'Active' : 'Empty'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-400 hidden lg:table-cell text-xs">
                      {formatDate(idx.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <Popover
                        open={deleteTarget === idx.id}
                        onOpenChange={(open) => !open && setDeleteTarget(null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            onClick={() => setDeleteTarget(idx.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-amber-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm font-medium">Delete index?</span>
                            </div>
                            <p className="text-xs text-slate-400">
                              This will permanently delete <span className="font-mono text-slate-200">{idx.name}</span> and all its documents.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleDelete(idx.id)}
                              >
                                Delete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Index Dialog */}
      <Dialog open={newIndexOpen && !createdKey} onOpenChange={(open) => { if (!open) { setNewIndexOpen(false); setFormError(''); setForm({ name: '', description: '' }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Index</DialogTitle>
            <DialogDescription>
              Indexes organize your documents for full-text search.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium" htmlFor="idx-name">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="idx-name"
                placeholder="my-index"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <p className="text-xs text-slate-500">Lowercase alphanumeric and hyphens only</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium" htmlFor="idx-desc">
                Description
              </label>
              <Textarea
                id="idx-desc"
                placeholder="What does this index contain?"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewIndexOpen(false); setFormError(''); setForm({ name: '', description: '' }); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Index'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Display (shown once after creation) */}
      <Dialog open={!!createdKey} onOpenChange={(open) => { if (!open) { setCreatedKey(null); setNewIndexOpen(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Index Created! 🎉</DialogTitle>
            <DialogDescription>
              Your API key is shown below. Copy it now — it won&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-amber-600/30 bg-amber-900/10 p-3">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Save this key now</span>
              </div>
              <p className="text-xs text-amber-400/80">This key will not be displayed again after you close this dialog.</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm bg-slate-900 border border-slate-600 rounded px-3 py-2.5 text-indigo-300 overflow-x-auto whitespace-nowrap">
                {createdKey}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleCopy(createdKey ?? '')}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setCreatedKey(null); setNewIndexOpen(false); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
