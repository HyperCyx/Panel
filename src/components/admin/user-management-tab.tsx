'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldBan, ShieldCheck, Wallet } from 'lucide-react';
import { getAllUsers, toggleUserStatus, updateUserWallet, getPublicSettings } from '@/app/actions';
import type { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

export function UserManagementTab() {
    const { toast } = useToast();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Wallet modal state
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [walletUser, setWalletUser] = useState<UserProfile | null>(null);
    const [walletBalance, setWalletBalance] = useState('');
    const [otpRate, setOtpRate] = useState('');
    const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);
    const [currency, setCurrency] = useState('৳');

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const result = await getAllUsers();
            if (result.error) {
                toast({ variant: 'destructive', title: 'Error fetching users', description: result.error });
            } else {
                setUsers(result.users || []);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users' });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchUsers();
        getPublicSettings().then(s => setCurrency(s.currency || '৳'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggleStatus = async (user: UserProfile) => {
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        try {
            const result = await toggleUserStatus(user.id, newStatus);
            if (result.error) {
                toast({ variant: 'destructive', title: 'Update failed', description: result.error });
            } else {
                toast({ title: 'Status Updated' });
                fetchUsers();
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' });
        }
    };

    const openWalletModal = (user: UserProfile) => {
        setWalletUser(user);
        setWalletBalance(String(user.walletBalance ?? 0));
        setOtpRate(String(user.otpRate ?? 0.50));
        setIsWalletModalOpen(true);
    };

    const handleUpdateWallet = async () => {
        if (!walletUser) return;
        setIsUpdatingWallet(true);
        try {
            const result = await updateUserWallet(
                walletUser.id,
                parseFloat(walletBalance) || 0,
                parseFloat(otpRate) || 0
            );
            if (result.error) {
                toast({ variant: 'destructive', title: 'Update failed', description: result.error });
            } else {
                toast({ title: 'Wallet Updated', description: `Balance and rate updated for ${walletUser.name}.` });
                setUsers(current =>
                    current.map(u =>
                        u.id === walletUser.id
                            ? { ...u, walletBalance: parseFloat(walletBalance) || 0, otpRate: parseFloat(otpRate) || 0 }
                            : u
                    )
                );
                setIsWalletModalOpen(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update wallet' });
        }
        setIsUpdatingWallet(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View and manage all registered users, their permissions, and wallet balances.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                    <>
                    {/* Desktop Table */}
                    <ScrollArea className="h-[60vh] w-full rounded-md border hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="hidden md:table-cell">Balance / Rate</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.photoURL || ''} alt={user.name || 'User'} />
                                                        <AvatarFallback className="text-xs">{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium truncate max-w-[120px]">{user.name || 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="truncate max-w-[160px]">{user.email}</TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="text-sm">
                                                    <span className="text-emerald-400 font-semibold">{currency}{(user.walletBalance ?? 0).toFixed(2)}</span>
                                                    <span className="text-muted-foreground mx-1">/</span>
                                                    <span className="text-amber-400 font-semibold">{currency}{(user.otpRate ?? 0).toFixed(2)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                    {user.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => openWalletModal(user)} disabled={user.isAdmin}>
                                                    <Wallet className="h-4 w-4 mr-1" />
                                                    Wallet
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(user)} disabled={user.isAdmin}>
                                                    {user.status === 'active' ? <ShieldBan className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-green-600" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>

                    {/* Mobile Card List */}
                    <div className="sm:hidden space-y-3 max-h-[60vh] overflow-y-auto">
                        {users.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No users found.</p>
                        ) : (
                            users.map((user) => (
                                <div key={user.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={user.photoURL || ''} alt={user.name || 'User'} />
                                                <AvatarFallback className="text-xs">{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{user.name || 'N/A'}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[10px] rounded-full flex-shrink-0 ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs border-t pt-2">
                                        <div>
                                            <span className="text-muted-foreground">Bal: </span>
                                            <span className="text-emerald-600 font-semibold">{currency}{(user.walletBalance ?? 0).toFixed(2)}</span>
                                            <span className="text-muted-foreground mx-1">|</span>
                                            <span className="text-muted-foreground">Rate: </span>
                                            <span className="text-amber-600 font-semibold">{currency}{(user.otpRate ?? 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => openWalletModal(user)} disabled={user.isAdmin}>
                                                <Wallet className="h-3 w-3 mr-1" />
                                                Wallet
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(user)} disabled={user.isAdmin}>
                                                {user.status === 'active' ? <ShieldBan className="h-3.5 w-3.5 text-destructive" /> : <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    </>
                    )}
                </CardContent>
            </Card>

            {/* Wallet Modal */}
            <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Manage Wallet — {walletUser?.name}</DialogTitle>
                        <DialogDescription>
                            Set the wallet balance and per-OTP rate for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Wallet Balance ({currency})</label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={walletBalance}
                                onChange={(e) => setWalletBalance(e.target.value)}
                                placeholder="0.00"
                                disabled={isUpdatingWallet}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">OTP Rate per message ({currency})</label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={otpRate}
                                onChange={(e) => setOtpRate(e.target.value)}
                                placeholder="0.50"
                                disabled={isUpdatingWallet}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleUpdateWallet} disabled={isUpdatingWallet}>
                            {isUpdatingWallet && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
