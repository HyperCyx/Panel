'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu, X, Bell, LayoutDashboard, LogOut, ShieldCheck,
  Smartphone, Globe, Code, Trophy, Target, ClipboardList, Wifi,
  CreditCard, User, BellRing, Pencil, Loader2,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { logout, updateUserProfile, getUnreadNotificationCount } from '@/app/actions';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-provider';

// ─── Nav items with URL paths ─────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     icon: 'LayoutDashboard', path: '/dashboard' },
  { id: 'getNumber',     label: 'Get Number',     icon: 'Smartphone',      path: '/dashboard/get-number' },
  { id: 'console',       label: 'Console',        icon: 'Code',            path: '/dashboard/console' },
  { id: 'accessList',    label: 'Access List',    icon: 'Wifi',            path: '/dashboard/access-list' },
  { id: 'payment',       label: 'Payment',        icon: 'CreditCard',      path: '/dashboard/payment' },
  { id: 'profile',       label: 'Profile',        icon: 'User',            path: '/dashboard/profile' },
  { id: 'notifications', label: 'Notifications',  icon: 'BellRing',        path: '/dashboard/notifications' },
];

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const cls = `h-5 w-5 ${active ? 'text-primary-foreground' : 'text-primary'}`;
  const map: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className={cls} />,
    Smartphone:      <Smartphone      className={cls} />,
    Code:            <Code            className={cls} />,
    Trophy:          <Trophy          className={cls} />,
    Target:          <Target          className={cls} />,
    ClipboardList:   <ClipboardList   className={cls} />,
    Wifi:            <Wifi            className={cls} />,
    CreditCard:      <CreditCard      className={cls} />,
    User:            <User            className={cls} />,
    BellRing:        <BellRing        className={cls} />,
  };
  return <>{map[name] ?? null}</>;
}

// ─── DashboardShell ───────────────────────────────────────────────────────────

interface DashboardShellProps {
  user: UserProfile;
  siteName: string;
  children: React.ReactNode;
}

export function DashboardShell({ user, siteName, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user.name ?? '');
  const [editEmail, setEditEmail] = useState(user.email ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { footerText, siteName: ctxSiteName, siteVersion } = useSettings();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    getUnreadNotificationCount().then(r => setUnreadCount(r.count));
  }, [pathname]);

  const processedFooterText = (footerText || '')
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{SITENAME}', ctxSiteName || siteName)
    .replace('{VERSION}', siteVersion || '');

  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const result = await updateUserProfile(user.id, { name: editName, email: editEmail });
    setIsUpdating(false);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    } else {
      toast({ title: 'Profile Updated', description: 'Your details have been saved.' });
      setEditProfileOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Sidebar Backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 bg-card border-r border-border shadow-lg flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Globe className="h-7 w-7 text-primary" />
            <div>
              <span className="text-xl font-extrabold text-primary tracking-wide">{siteName}</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <NavIcon name={item.icon} active={isActive} />
                {item.label}
              </Link>
            );
          })}

          {user.isAdmin && (
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border lg:pl-72">
        <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-extrabold text-primary tracking-wide">{siteName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm cursor-pointer select-none hover:bg-primary/90 transition-colors"
                  aria-label="Profile menu"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditName(user.name ?? '');
                    setEditEmail(user.email ?? '');
                    setEditProfileOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-600"
                  onSelect={(e) => {
                    e.preventDefault();
                    const form = document.getElementById('header-logout-form') as HTMLFormElement | null;
                    form?.requestSubmit();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <form id="header-logout-form" action={logout} className="hidden" />
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="px-4 py-6 max-w-5xl mx-auto lg:pl-72 overflow-x-hidden">
        {children}
      </main>

      {/* ── Footer ── */}
      {processedFooterText && (
        <footer className="border-t border-border bg-background/80 lg:pl-72">
          <div className="px-4 py-4 max-w-5xl mx-auto text-center text-xs text-muted-foreground">
            {processedFooterText}
            {siteVersion && (
              <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                v{siteVersion}
              </span>
            )}
          </div>
        </footer>
      )}

      {/* ── Edit Profile Dialog ── */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Your email"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditProfileOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating || !editName.trim() || !editEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-colors"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
