'use client'

import { useState, useEffect } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { forceSyncAccessList, getAdminSettings, updateAdminSettings } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

export function AccessListSettingsTab() {
  const [syncing, setSyncing] = useState(false);
  const [interval, setSyncInterval] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadSettings() {
      const settings = await getAdminSettings();
      if (settings.accessListSyncInterval !== undefined) {
        setSyncInterval(settings.accessListSyncInterval);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSaveInterval = async () => {
    setSaving(true);
    const res = await updateAdminSettings({ accessListSyncInterval: interval });
    setSaving(false);
    if (res?.error) {
      toast({ title: 'Failed to save', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'The sync interval has been updated successfully.' });
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    toast({
      title: "Sync Started",
      description: "Fetching global access list data from API in the background...",
    });

    const result = await forceSyncAccessList();

    if (result?.error) {
      toast({
        title: "Sync Failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sync Successful",
        description: "The database has been updated with the latest API records.",
      });
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Access List Settings</h2>
        <p className="text-muted-foreground mt-1">Manage the local database caching of the IPRN Access List API.</p>
      </div>

      <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-8 relative overflow-hidden">
        {/* Background glow for aesthetic */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Local Database Sync
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
                The Access List data is automatically synced to your local SQLite database in the background. 
                This prevents your users from constantly hitting the external API and makes searches instant. 
                You can manually force a synchronization immediately by clicking the button below, or adjust the automatic sync timing.
            </p>
            
            {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
                <div className="flex flex-col gap-4 mt-6">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                            Automatic Sync Interval (Minutes)
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                min="1" 
                                value={interval} 
                                onChange={(e) => setSyncInterval(Number(e.target.value))}
                                className="w-32 px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                            <button
                                onClick={handleSaveInterval}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-sm transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Interval
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={handleManualSync}
                disabled={syncing}
                className="mt-4 flex items-center justify-center gap-2 w-full sm:w-auto bg-primary text-primary-foreground py-3 px-6 rounded-xl hover:bg-primary/90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
            >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Data Manually from Server'}
            </button>
        </div>
      </div>
    </div>
  );
}
