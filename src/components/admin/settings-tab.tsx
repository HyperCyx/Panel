'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '@/app/actions';
import type { ProxySettings, AdminSettings } from '@/lib/types';
import { Switch } from '@/components/ui/switch';

export function SettingsTab() {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState('');
    const [proxySettings, setProxySettings] = useState<ProxySettings>({ ip: '', port: '', username: '', password: '' });
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [emailChangeEnabled, setEmailChangeEnabled] = useState(true);
    const [numberExpiryMinutes, setNumberExpiryMinutes] = useState(5);
    const [currency, setCurrency] = useState('৳');
    const [paymentNetwork, setPaymentNetwork] = useState('TRC20');
    const [minimumWithdrawal, setMinimumWithdrawal] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        async function loadSettings() {
            try {
                const result = await getAdminSettings();
                if (result.error) {
                     toast({ variant: 'destructive', title: 'Error fetching settings', description: result.error });
                } else {
                    setApiKey(result.apiKey || '');
                    setProxySettings(result.proxySettings || { ip: '', port: '', username: '', password: '' });
                    setSignupEnabled(result.signupEnabled ?? true);
                    setEmailChangeEnabled(result.emailChangeEnabled ?? true);
                    setNumberExpiryMinutes(result.numberExpiryMinutes ?? 5);
                    setCurrency(result.currency ?? '৳');
                    setPaymentNetwork(result.paymentNetwork ?? 'TRC20');
                    setMinimumWithdrawal(result.minimumWithdrawal ?? 10);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load settings' });
            }
            setIsLoading(false);
        }
        loadSettings();
    }, [toast]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const result = await updateAdminSettings({ 
                apiKey, 
                proxySettings, 
                signupEnabled,
                emailChangeEnabled,
                numberExpiryMinutes,
                currency,
                paymentNetwork,
                minimumWithdrawal,
            } as Partial<AdminSettings>);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Failed to save settings', description: result.error });
            } else {
                toast({ title: 'Settings Saved' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings' });
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>User & Access Policies</CardTitle>
                    <CardDescription>Manage how users sign up and what they can change.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="signup-enabled" className="cursor-pointer">Allow User Signups</Label>
                            <p className="text-sm text-muted-foreground">
                                Enable or disable new user registration.
                            </p>
                        </div>
                        <Switch
                            id="signup-enabled"
                            checked={signupEnabled}
                            onCheckedChange={setSignupEnabled}
                            disabled={isLoading}
                            aria-label="Toggle user signups"
                        />
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-change-enabled" className="cursor-pointer">Allow Users to Change Email</Label>
                            <p className="text-sm text-muted-foreground">
                               If disabled, users cannot update their email address from settings.
                            </p>
                        </div>
                        <Switch
                            id="email-change-enabled"
                            checked={emailChangeEnabled}
                            onCheckedChange={setEmailChangeEnabled}
                            disabled={isLoading}
                            aria-label="Toggle email change ability"
                        />
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="number-expiry" className="cursor-pointer">Number Expiry Timer (minutes)</Label>
                            <p className="text-sm text-muted-foreground">
                                How long users wait for OTP before a number expires.
                            </p>
                        </div>
                        <Input
                            id="number-expiry"
                            type="number"
                            min={1}
                            max={60}
                            className="w-20 text-center"
                            value={numberExpiryMinutes}
                            onChange={(e) => setNumberExpiryMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
                            disabled={isLoading}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Currency & Payment Settings</CardTitle>
                    <CardDescription>Configure currency symbol and payment withdrawal options.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="currency-symbol" className="cursor-pointer">Currency Symbol</Label>
                            <p className="text-sm text-muted-foreground">
                                The currency symbol displayed across the site (e.g., ৳, $, €).
                            </p>
                        </div>
                        <Input
                            id="currency-symbol"
                            className="w-20 text-center"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="payment-network" className="cursor-pointer">Payment Network</Label>
                            <p className="text-sm text-muted-foreground">
                                The crypto network for withdrawals (e.g., TRC20, ERC20, BEP20).
                            </p>
                        </div>
                        <Input
                            id="payment-network"
                            className="w-28 text-center"
                            value={paymentNetwork}
                            onChange={(e) => setPaymentNetwork(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="min-withdrawal" className="cursor-pointer">Minimum Withdrawal Amount</Label>
                            <p className="text-sm text-muted-foreground">
                                The minimum amount a user must request for a withdrawal.
                            </p>
                        </div>
                        <Input
                            id="min-withdrawal"
                            type="number"
                            min={1}
                            className="w-24 text-center"
                            value={minimumWithdrawal}
                            onChange={(e) => setMinimumWithdrawal(Math.max(1, parseInt(e.target.value) || 10))}
                            disabled={isLoading}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>API & Proxy Settings</CardTitle>
                    <CardDescription>Configure outbound requests. The proxy connection will be tested on save.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="api-key">Premiumy API Key</Label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder="Enter your API key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="proxy-ip">Proxy IP Address</Label>
                            <Input
                                id="proxy-ip"
                                placeholder="e.g., 40.81.241.64"
                                value={proxySettings.ip || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, ip: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="proxy-port">Proxy Port</Label>
                            <Input
                                id="proxy-port"
                                placeholder="e.g., 3128"
                                value={proxySettings.port || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, port: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="proxy-username">Proxy Username (Optional)</Label>
                            <Input
                                id="proxy-username"
                                placeholder="Username"
                                value={proxySettings.username || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, username: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="proxy-password">Proxy Password (Optional)</Label>
                            <Input
                                id="proxy-password"
                                type="password"
                                placeholder="Password"
                                value={proxySettings.password || ''}
                                onChange={(e) => setProxySettings(prev => ({ ...prev, password: e.target.value }))}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} size="lg">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>
        </div>
    );
}
