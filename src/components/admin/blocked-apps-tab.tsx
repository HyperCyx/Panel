'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, ShieldOff } from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '@/app/actions';
import type { AdminSettings } from '@/lib/types';

export function BlockedAppsTab() {
    const { toast } = useToast();
    const [blockedApps, setBlockedApps] = useState<string[]>([]);
    const [newApp, setNewApp] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadSettings() {
            try {
                const result = await getAdminSettings();
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Error', description: result.error });
                } else {
                    setBlockedApps(result.blockedApps ?? []);
                }
            } catch {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load settings' });
            }
            setIsLoading(false);
        }
        loadSettings();
    }, [toast]);

    const handleAddApp = () => {
        const trimmed = newApp.trim();
        if (!trimmed) return;
        if (blockedApps.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Already exists', description: `"${trimmed}" is already in the blocked list.` });
            return;
        }
        setBlockedApps(prev => [...prev, trimmed]);
        setNewApp('');
    };

    const handleRemoveApp = (index: number) => {
        setBlockedApps(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateAdminSettings({ blockedApps } as Partial<AdminSettings>);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Failed to save', description: result.error });
            } else {
                toast({ title: 'Blocked Apps Updated' });
            }
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings' });
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldOff className="h-5 w-5" />
                        Blocked Applications
                    </CardTitle>
                    <CardDescription>
                        OTPs from blocked applications will not be shown to users. The number will stay in pending state and the OTP will never be revealed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter app name (e.g. Telegram, WhatsApp)"
                            value={newApp}
                            onChange={(e) => setNewApp(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddApp(); } }}
                        />
                        <Button onClick={handleAddApp} size="sm" className="shrink-0">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    {blockedApps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No applications are blocked. Add an app name above to block its OTPs.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {blockedApps.map((app, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-full text-sm font-medium"
                                >
                                    {app}
                                    <button
                                        onClick={() => handleRemoveApp(index)}
                                        className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="pt-2">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
