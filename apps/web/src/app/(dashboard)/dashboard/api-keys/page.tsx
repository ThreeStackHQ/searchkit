import { Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">API Keys</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-400" />
            <CardTitle>Manage API Keys</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            API key management coming soon. Create index-specific keys from the{' '}
            <a href="/dashboard/indexes" className="text-indigo-400 hover:text-indigo-300">
              Indexes
            </a>{' '}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
