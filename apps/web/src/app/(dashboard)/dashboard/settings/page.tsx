import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-400" />
            <CardTitle>Workspace Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            Workspace configuration, billing, and team management coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
