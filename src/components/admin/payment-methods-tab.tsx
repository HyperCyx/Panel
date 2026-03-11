'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, Banknote, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { getAdminSettings, updateAdminSettings } from '@/app/actions';
import type { AdminSettings, PaymentMethod } from '@/lib/types';

export function PaymentMethodsTab() {
    const { toast } = useToast();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // New method form
    const [newName, setNewName] = useState('');
    const [newPlaceholder, setNewPlaceholder] = useState('');
    const [newFieldType, setNewFieldType] = useState<'number' | 'text'>('number');

    useEffect(() => {
        async function loadSettings() {
            try {
                const result = await getAdminSettings();
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Error', description: result.error });
                } else {
                    setMethods(result.paymentMethods ?? []);
                }
            } catch {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load settings' });
            }
            setIsLoading(false);
        }
        loadSettings();
    }, [toast]);

    const handleAdd = () => {
        const name = newName.trim();
        if (!name) {
            toast({ variant: 'destructive', title: 'Name required' });
            return;
        }
        if (methods.some(m => m.name.toLowerCase() === name.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Already exists', description: `"${name}" already exists.` });
            return;
        }
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        setMethods(prev => [...prev, {
            id,
            name,
            placeholder: newPlaceholder.trim() || `Enter ${name} address`,
            fieldType: newFieldType,
            enabled: true,
        }]);
        setNewName('');
        setNewPlaceholder('');
        setNewFieldType('number');
    };

    const handleRemove = (index: number) => {
        setMethods(prev => prev.filter((_, i) => i !== index));
    };

    const handleToggle = (index: number) => {
        setMethods(prev => prev.map((m, i) => i === index ? { ...m, enabled: !m.enabled } : m));
    };

    const handleFieldTypeChange = (index: number, fieldType: 'number' | 'text') => {
        setMethods(prev => prev.map((m, i) => i === index ? { ...m, fieldType } : m));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateAdminSettings({ paymentMethods: methods } as Partial<AdminSettings>);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Failed to save', description: result.error });
            } else {
                toast({ title: 'Payment Methods Updated' });
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
                        <Banknote className="h-5 w-5" />
                        Payment Methods
                    </CardTitle>
                    <CardDescription>
                        Configure the wallet/payment methods available for user withdrawals. You can add, remove, enable/disable methods and choose the input field type (number or text).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add new method form */}
                    <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                        <h4 className="text-sm font-semibold text-foreground">Add New Method</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                                <Input
                                    placeholder="e.g. bKash, Nagad, Binance"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Placeholder</label>
                                <Input
                                    placeholder="e.g. 01XXXXXXXXX"
                                    value={newPlaceholder}
                                    onChange={(e) => setNewPlaceholder(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Field Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewFieldType('number')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                            newFieldType === 'number'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                        }`}
                                    >
                                        Number
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewFieldType('text')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                            newFieldType === 'text'
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                        }`}
                                    >
                                        Text
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1" />
                            <Button onClick={handleAdd} size="sm" className="self-end">
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </div>
                    </div>

                    {/* Methods list */}
                    {methods.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No payment methods configured. Add a method above to get started.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {methods.map((method, index) => (
                                <div
                                    key={method.id}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                                        method.enabled
                                            ? 'bg-card border-border'
                                            : 'bg-muted/50 border-border/50 opacity-60'
                                    }`}
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-foreground">{method.name}</span>
                                            <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border ${
                                                method.fieldType === 'number'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                    : 'bg-purple-50 text-purple-600 border-purple-200'
                                            }`}>
                                                {method.fieldType}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{method.placeholder}</p>
                                    </div>

                                    {/* Field type toggle */}
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleFieldTypeChange(index, 'number')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                                method.fieldType === 'number'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                            }`}
                                        >
                                            Num
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFieldTypeChange(index, 'text')}
                                            className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                                method.fieldType === 'text'
                                                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                                                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                            }`}
                                        >
                                            Text
                                        </button>
                                    </div>

                                    {/* Enable/disable toggle */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(index)}
                                        className="flex-shrink-0"
                                        title={method.enabled ? 'Disable' : 'Enable'}
                                    >
                                        {method.enabled ? (
                                            <ToggleRight className="h-6 w-6 text-emerald-500" />
                                        ) : (
                                            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </button>

                                    {/* Remove */}
                                    <button
                                        onClick={() => handleRemove(index)}
                                        className="flex-shrink-0 hover:bg-destructive/10 rounded-full p-1 transition-colors"
                                        title="Remove"
                                    >
                                        <X className="h-4 w-4 text-destructive" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={isSaving} className="w-full">
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Banknote className="h-4 w-4 mr-2" />}
                        {isSaving ? 'Saving...' : 'Save Payment Methods'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
