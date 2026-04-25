'use client';

import { useState, useEffect } from 'react';
import {
    getAllUsers, toggleUserStatus, deleteUser, updateUserWallet,
    updateUserProfile, updateUserApprovalStatus, updateAgentPassword
} from '@/app/actions';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Search, RefreshCcw, Pencil, Trash2, Wallet, Loader2,
    ShieldBan, ShieldCheck, CheckCircle2, UserX, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    DialogClose, DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/contexts/settings-provider';
import type { UserProfile } from '@/lib/types';

export function UserManagementTab() {
    const { toast } = useToast();
    const { currency } = useSettings();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Wallet Modal State
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [walletUser, setWalletUser] = useState<UserProfile | null>(null);
    const [walletBalance, setWalletBalance] = useState('');
    const [otpRate, setOtpRate] = useState('');
    const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);

    // Edit User Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserProfile | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);

    // Password Modal State
    const [pwUser, setPwUser] = useState<UserProfile | null>(null);
    const [newPw, setNewPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isUpdatingPw, setIsUpdatingPw] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        const result = await getAllUsers(search);
        if (result.users) setUsers(result.users);
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const handleToggleStatus = async (user: UserProfile) => {
        const result = await toggleUserStatus(user.id, user.status === 'active' ? 'blocked' : 'active');
        if (result.success) {
            toast({ title: 'Status Updated', description: `${user.name}'s status changed.` });
            fetchUsers();
        }
    };

    const handleToggleApproval = async (user: UserProfile) => {
        const nextStatus = user.approvalStatus === 'approved' ? 'rejected' : 'approved';
        const result = await updateUserApprovalStatus(user.id, nextStatus);
        if (result.success) {
            toast({ title: 'Approval Status Updated', description: `${user.name} is now ${nextStatus}.` });
            fetchUsers();
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
        const result = await updateUserWallet(
            walletUser.id,
            parseFloat(walletBalance),
            parseFloat(otpRate)
        );
        setIsUpdatingWallet(false);
        if (result.success) {
            toast({ title: 'Wallet Updated', description: 'User balance and rate updated.' });
            setIsWalletModalOpen(false);
            fetchUsers();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const openEditModal = (user: UserProfile) => {
        setEditUser(user);
        setEditName(user.name ?? '');
        setEditEmail(user.email ?? '');
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editUser) return;
        setIsUpdatingUser(true);
        const result = await updateUserProfile(editUser.id, { name: editName, email: editEmail });
        setIsUpdatingUser(false);
        if (result.success) {
            toast({ title: 'User Updated', description: 'Profile details saved.' });
            setIsEditModalOpen(false);
            fetchUsers();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const handleUpdatePw = async () => {
        if (!pwUser || newPw.length < 8) return;
        setIsUpdatingPw(true);
        const result = await updateAgentPassword(pwUser.id, newPw);
        setIsUpdatingPw(false);
        if (result.success) {
            toast({ title: 'Password Updated', description: `Password changed for ${pwUser.name}.` });
            setPwUser(null);
            setNewPw('');
            setShowPw(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const openDeleteModal = (user: UserProfile) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        const result = await deleteUser(userToDelete.id);
        setIsDeleting(false);
        if (result.success) {
            toast({ title: 'User Deleted', description: `${userToDelete.name} removed from system.` });
            setIsDeleteModalOpen(false);
            fetchUsers();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-foreground">User Management</CardTitle>
                        <CardDescription>View and manage all registered users and agents.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
                        <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {loading && users.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
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
                                    <TableHead>Password</TableHead>
                                    <TableHead className="hidden md:table-cell">Balance / Rate</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
                                                    <div className="flex flex-col">
                                                        <span className="font-medium truncate max-w-[120px]">{user.name || 'N/A'}</span>
                                                        {user.isAgent && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 w-fit">
                                                                AGENT
                                                            </span>
                                                        )}
                                                        {user.isAdmin && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 w-fit">
                                                                ADMIN
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="truncate max-w-[160px]">{user.email}</TableCell>
                                            <TableCell>
                                                <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                                                    {user.plainPassword || '••••••••'}
                                                </code>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="text-sm">
                                                    <span className="text-emerald-400 font-semibold">{currency}{(user.walletBalance ?? 0).toFixed(2)}</span>
                                                    <span className="text-muted-foreground mx-1">/</span>
                                                    <span className="text-amber-400 font-semibold">{currency}{(user.otpRate ?? 0).toFixed(2)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                        {user.status}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold tracking-wider border ${
                                                        user.approvalStatus === 'approved'
                                                            ? 'bg-primary/10 text-primary border-primary/20'
                                                            : user.approvalStatus === 'rejected'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200'
                                                    }`}>
                                                        {user.approvalStatus || 'pending'}
                                                    </span>
                                                    {user.agentEmail && (
                                                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={user.agentEmail}>
                                                            via {user.agentEmail}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="outline" size="sm" onClick={() => openWalletModal(user)} disabled={user.isAdmin} title="Manage Wallet">
                                                    <Wallet className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openEditModal(user)} disabled={user.isAdmin} title="Edit User">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => setPwUser(user)} disabled={user.isAdmin} title="Change Password">
                                                    <KeyRound className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleStatus(user)} disabled={user.isAdmin} title="Toggle Block/Active">
                                                    {user.status === 'active' ? <ShieldBan className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4 text-green-600" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleApproval(user)} disabled={user.isAdmin} title="Toggle Approval">
                                                    {user.approvalStatus === 'approved' ? <UserX className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteModal(user)} disabled={user.isAdmin}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
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
                                <div key={user.id} className={`border rounded-lg p-3 space-y-2 ${user.isAgent ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={user.photoURL || ''} alt={user.name || 'User'} />
                                                <AvatarFallback className="text-xs">{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-sm font-medium truncate">{user.name || 'N/A'}</p>
                                                    {user.isAgent && (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                                                            AGENT
                                                        </span>
                                                    )}
                                                    {user.isAdmin && (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                                                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {user.status}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                                                user.approvalStatus === 'approved'
                                                    ? 'bg-primary/10 text-primary'
                                                    : user.approvalStatus === 'rejected'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {user.approvalStatus || 'pending'}
                                            </span>
                                        </div>
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
                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openWalletModal(user)} disabled={user.isAdmin}>
                                                <Wallet className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => openEditModal(user)} disabled={user.isAdmin}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPwUser(user)} disabled={user.isAdmin}>
                                                <KeyRound className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(user)} disabled={user.isAdmin} title="Toggle Block/Active">
                                                {user.status === 'active' ? <ShieldBan className="h-3.5 w-3.5 text-amber-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleApproval(user)} disabled={user.isAdmin} title="Toggle Approval">
                                                {user.approvalStatus === 'approved' ? <UserX className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDeleteModal(user)} disabled={user.isAdmin}>
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Edit User Details</DialogTitle>
                        <DialogDescription>
                            Update the basic information for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="User's Name"
                                disabled={isUpdatingUser}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="user@example.com"
                                disabled={isUpdatingUser}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleUpdateUser} disabled={isUpdatingUser}>
                            {isUpdatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Password Modal */}
            <Dialog open={!!pwUser} onOpenChange={(open) => { if(!open) setPwUser(null); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-primary" />
                            Change User Password
                        </DialogTitle>
                        <DialogDescription>
                            Set a new password for {pwUser?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">New Password</label>
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                    placeholder="Min. 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleUpdatePw} disabled={isUpdatingPw || newPw.length < 8}>
                            {isUpdatingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
