'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, X, Users, UserCheck, LogOut, Globe, LayoutDashboard,
  RefreshCcw, Loader2, CheckCircle, XCircle, Wallet, CreditCard, Save, ChevronDown, BellRing, Bell, CheckCheck, Clock, BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  logout, getPendingUsers, getAgentAllUsers, approveUser, rejectUser,
  getAgentStats, createAgentWithdrawal,
  getUserWallets, saveUserWallets, getPublicSettings,
  getNotifications, markNotificationAsRead, markAllNotificationsAsRead,
} from '@/app/actions';
import type { UserProfile, UserWalletInfo, PaymentMethod } from '@/lib/types';
import { useSettings } from '@/contexts/settings-provider';

const AGENT_NAV = [
  { id: 'dashboard', label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'pending',   label: 'Pending Approvals', icon: UserCheck },
  { id: 'all',       label: 'All Users',         icon: Users },
  { id: 'withdraw',  label: 'Withdraw',          icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: BellRing },
];

interface AgentStatsData {
  commissionRate: number;
  agentWalletBalance: number;
  totalUsersEarnings: number;
  totalCommissionEarned: number;
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
}

export function AgentDashboard({ user }: { user: UserProfile }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [stats, setStats] = useState<AgentStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  // Wallet state
  const [wallets, setWallets] = useState<UserWalletInfo>({});
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [savingWallets, setSavingWallets] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  // Notification state
  const [agentNotifications, setAgentNotifications] = useState<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { siteName, footerText, currency, siteVersion } = useSettings();

  const processedFooter = (footerText || '')
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{SITENAME}', siteName)
    .replace('{VERSION}', siteVersion || '');

  const fetchPending = async () => {
    setLoadingPending(true);
    const result = await getPendingUsers();
    if (result.users) setPendingUsers(result.users);
    setLoadingPending(false);
  };

  const fetchAll = async () => {
    setLoadingAll(true);
    const result = await getAgentAllUsers();
    if (result.users) setAllUsers(result.users);
    setLoadingAll(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    const result = await getAgentStats();
    if (result.data) setStats(result.data);
    setLoadingStats(false);
  };

  const fetchWallets = useCallback(async () => {
    setLoadingWallets(true);
    try {
      const [walletResult, settingsResult] = await Promise.all([
        getUserWallets(),
        getPublicSettings(),
      ]);
      if (walletResult.data) setWallets(walletResult.data);
      setPaymentMethods(settingsResult.paymentMethods ?? []);
    } catch { /* silent */ } finally {
      setLoadingWallets(false);
    }
  }, []);

  const fetchAgentNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const result = await getNotifications();
      if (result.data) setAgentNotifications(result.data);
    } catch { /* silent */ } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    fetchAll();
    fetchStats();
    fetchWallets();
    fetchAgentNotifications();
  }, [fetchWallets, fetchAgentNotifications]);

  const handleApprove = async (userId: string) => {
    setActionId(userId);
    const result = await approveUser(userId);
    if (result.success) {
      toast({ title: 'User Approved' });
      fetchPending();
      fetchAll();
      fetchStats();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setActionId(null);
  };

  const handleReject = async (userId: string) => {
    setActionId(userId);
    const result = await rejectUser(userId);
    if (result.success) {
      toast({ title: 'User Rejected' });
      fetchPending();
      fetchAll();
      fetchStats();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setActionId(null);
  };

  const handleSaveWallets = async () => {
    setSavingWallets(true);
    const result = await saveUserWallets(wallets);
    if (result.success) {
      toast({ title: 'Wallets Saved' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setSavingWallets(false);
  };

  const enabledMethods = paymentMethods.filter(m => m.enabled);
  const availableWallets = enabledMethods.filter(m => wallets[m.id]?.trim());
  const selectedWalletInfo = enabledMethods.find(m => m.id === selectedWallet);
  const selectedWalletAddress = selectedWallet ? wallets[selectedWallet] : '';

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount' });
      return;
    }
    if (!selectedWallet || !selectedWalletAddress) {
      toast({ variant: 'destructive', title: 'Please select a wallet' });
      return;
    }
    setWithdrawing(true);
    const result = await createAgentWithdrawal(amount, selectedWalletAddress, selectedWalletInfo?.name || selectedWallet);
    if (result.success) {
      toast({ title: 'Withdrawal Requested', description: `${currency}${amount} withdrawal submitted.` });
      setWithdrawAmount('');
      setSelectedWallet('');
      fetchStats();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setWithdrawing(false);
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Approved</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>;
      case 'pending':
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <form ref={logoutFormRef} action={logout} className="hidden" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-card border-r border-border shadow-lg flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Globe className="h-7 w-7 text-primary" />
            <div>
              <span className="text-xl font-extrabold text-primary tracking-wide">{siteName}</span>
              <div className="mt-0.5">
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md">
                  AGENT
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {AGENT_NAV.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {item.label}
                {item.id === 'pending' && pendingUsers.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-2">
          <div className="px-4 text-xs text-muted-foreground truncate">
            {user.email}
          </div>
          <button
            onClick={() => logoutFormRef.current?.requestSubmit()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border lg:pl-72">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold text-primary tracking-wide">Agent Panel</h1>
          </div>
          <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md">
            AGENT
          </span>
        </div>
      </header>

      <main className="px-4 py-6 max-w-7xl mx-auto lg:pl-72 overflow-x-hidden">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Overview</h2>
              <Button variant="outline" size="sm" onClick={fetchStats} disabled={loadingStats}>
                <RefreshCcw className={`h-4 w-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : stats ? (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Commission Balance</div>
                    <div className="text-2xl font-bold text-primary mt-1">{currency}{stats.agentWalletBalance.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Commission Rate</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{stats.commissionRate}%</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Users Total Earnings</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{currency}{stats.totalUsersEarnings.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Total Users</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{stats.totalUsers}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {stats.approvedUsers} approved · {stats.pendingUsers} pending
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Failed to load stats.</p>
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Pending Approvals
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchPending} disabled={loadingPending}>
                <RefreshCcw className={`h-4 w-4 mr-1 ${loadingPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending approvals.</p>
              ) : (
                <div className="space-y-3">
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.phone || '-'}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" onClick={() => handleApprove(u.id)} disabled={actionId === u.id}>
                                {actionId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)} disabled={actionId === u.id}>
                                {actionId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                Reject
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {pendingUsers.map((u) => (
                      <Card key={u.id} className="bg-card border-border">
                        <CardContent className="p-4 space-y-2">
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                          {u.phone && <div className="text-sm text-muted-foreground">{u.phone}</div>}
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" className="flex-1" onClick={() => handleApprove(u.id)} disabled={actionId === u.id}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleReject(u.id)} disabled={actionId === u.id}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Users Tab */}
        {activeTab === 'all' && (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                All Referred Users
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={loadingAll}>
                <RefreshCcw className={`h-4 w-4 mr-1 ${loadingAll ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users yet.</p>
              ) : (
                <div className="space-y-3">
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{statusBadge(u.approvalStatus)}</TableCell>
                            <TableCell className="text-right space-x-1">
                              {u.approvalStatus === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleApprove(u.id)} disabled={actionId === u.id}>
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)} disabled={actionId === u.id}>
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {allUsers.map((u) => (
                      <Card key={u.id} className="bg-card border-border">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-foreground">{u.name}</div>
                            {statusBadge(u.approvalStatus)}
                          </div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                          <div className="flex gap-2 pt-2">
                            {u.approvalStatus === 'pending' && (
                              <>
                                <Button size="sm" className="flex-1" onClick={() => handleApprove(u.id)} disabled={actionId === u.id}>
                                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleReject(u.id)} disabled={actionId === u.id}>
                                  <XCircle className="h-4 w-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6">
            {/* Balance Card */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Available Commission Balance</div>
                    <div className="text-2xl font-bold text-primary">{currency}{(stats?.agentWalletBalance ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Commission Rate</div>
                    <div className="text-lg font-bold text-foreground">{stats?.commissionRate ?? 0}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Setup */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Save className="h-5 w-5 text-primary" />
                  Wallet Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWallets ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-3">
                    {enabledMethods.map(m => (
                      <div key={m.id}>
                        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 block">{m.name}</label>
                        <Input
                          type={m.fieldType === 'number' ? 'tel' : 'text'}
                          value={wallets[m.id] || ''}
                          onChange={(e) => setWallets(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder={m.placeholder}
                        />
                      </div>
                    ))}
                    <Button onClick={handleSaveWallets} disabled={savingWallets}>
                      {savingWallets ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Wallets
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Withdrawal Form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Withdraw Commission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableWallets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Please add at least one wallet above before withdrawing.</p>
                ) : (
                  <>
                    {/* Wallet selector */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Select Wallet</label>
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-foreground"
                      >
                        <span>{selectedWalletInfo ? `${selectedWalletInfo.name}: ${selectedWalletAddress}` : 'Choose a wallet...'}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {showDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                          {availableWallets.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setSelectedWallet(m.id); setShowDropdown(false); }}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors ${
                                selectedWallet === m.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                              }`}
                            >
                              <span className="font-medium">{m.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{wallets[m.id]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleWithdraw} disabled={withdrawing || !selectedWallet}>
                        {withdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                        Withdraw
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-primary">Notifications</h3>
                {agentNotifications.filter(n => !n.isRead).length > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {agentNotifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              {agentNotifications.filter(n => !n.isRead).length > 0 && (
                <button
                  onClick={async () => {
                    setMarkingAllRead(true);
                    const result = await markAllNotificationsAsRead();
                    if (result.success) setAgentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    setMarkingAllRead(false);
                  }}
                  disabled={markingAllRead}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition disabled:opacity-50"
                >
                  {markingAllRead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                  Mark all as read
                </button>
              )}
            </div>

            {loadingNotifications ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : agentNotifications.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center">
                  <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {agentNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={async () => {
                      if (!n.isRead) {
                        setAgentNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
                        await markNotificationAsRead(n.id);
                      }
                    }}
                    className={`bg-card border rounded-2xl p-4 transition-colors cursor-pointer ${
                      n.isRead ? 'border-border/50 opacity-70' : 'border-primary/30 bg-primary/[0.03] shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Bell className={`h-4 w-4 mt-0.5 flex-shrink-0 ${n.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-semibold ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</h4>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className={`text-sm mt-1 whitespace-pre-wrap ${n.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>{n.message}</p>
                        <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {processedFooter && (
        <footer className="border-t border-border bg-background/80 lg:pl-72">
          <div className="px-4 py-4 max-w-7xl mx-auto text-center text-xs text-muted-foreground">
            {processedFooter}
            {siteVersion && (
              <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                v{siteVersion}
              </span>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
