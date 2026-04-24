'use client'

import { useState, useRef } from 'react';
import {
  Menu, X, Users, Palette, AlertTriangle, Settings, CreditCard,
  LogOut, LayoutDashboard, Globe, UserCheck, BarChart3, ShieldOff, Banknote, Bell, Database
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { logout } from '@/app/actions';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

const OverviewTab = dynamic(() => import('./admin/overview-tab').then(m => ({ default: m.OverviewTab })));
const UserManagementTab = dynamic(() => import('./admin/user-management-tab').then(m => ({ default: m.UserManagementTab })));
const ErrorManagementTab = dynamic(() => import('./admin/error-management-tab').then(m => ({ default: m.ErrorManagementTab })));
const SettingsTab = dynamic(() => import('./admin/settings-tab').then(m => ({ default: m.SettingsTab })));
const AppearanceTab = dynamic(() => import('./admin/appearance-tab').then(m => ({ default: m.AppearanceTab })));
const PaymentManagementTab = dynamic(() => import('./admin/payment-management-tab').then(m => ({ default: m.PaymentManagementTab })));
const AgentManagementTab = dynamic(() => import('./admin/agent-management-tab').then(m => ({ default: m.AgentManagementTab })));
const BlockedAppsTab = dynamic(() => import('./admin/blocked-apps-tab').then(m => ({ default: m.BlockedAppsTab })));
const PaymentMethodsTab = dynamic(() => import('./admin/payment-methods-tab').then(m => ({ default: m.PaymentMethodsTab })));
const NotificationsTab = dynamic(() => import('./admin/notifications-tab').then(m => ({ default: m.NotificationsTab })));
const SystemSettingsTab = dynamic(() => import('./admin/system-settings-tab').then(m => ({ default: m.SystemSettingsTab })));
import { useSettings } from '@/contexts/settings-provider';

const ADMIN_NAV = [
  { id: 'overview',    label: 'Overview',       icon: BarChart3 },
  { id: 'users',       label: 'Users',          icon: Users },
  { id: 'agents',      label: 'Agents',         icon: UserCheck },
  { id: 'payments',    label: 'Payments',       icon: CreditCard },
  { id: 'paymentMethods', label: 'Payment Methods', icon: Banknote },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'systemSettings', label: 'System Settings', icon: Settings },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const { siteName, footerText } = useSettings();

  const processedFooter = (footerText || '')
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{SITENAME}', siteName);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'users': return <UserManagementTab />;
      case 'agents': return <AgentManagementTab />;
      case 'payments': return <PaymentManagementTab />;
      case 'paymentMethods': return <PaymentMethodsTab />;
      case 'notifications': return <NotificationsTab />;
      case 'systemSettings': return <SystemSettingsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <form ref={logoutFormRef} action={logout} className="hidden" />

      {/* Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-4 bottom-4 left-4 h-[calc(100vh-2rem)] w-64 z-50 rounded-[2rem] glass-panel border-primary/20 shadow-[10px_0_40px_-10px_hsl(var(--primary)/0.15)] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-6 relative z-10">
          <div className="flex items-center gap-2.5">
            <Globe className="h-7 w-7 text-primary" />
            <div>
              <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-wide">{siteName}</span>
              <div className="mt-0.5">
                <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-md">
                  ADMIN
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 relative overflow-hidden group ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] backdrop-blur-md'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
                }`}
              >
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                <Icon className={`h-5 w-5 relative z-10 transition-transform duration-300 ${isActive ? 'text-primary-foreground scale-110 drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]' : 'text-primary group-hover:scale-110'}`} />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}

          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
          >
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Back to App
          </Link>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={() => logoutFormRef.current?.requestSubmit()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Admin Logout
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-4 z-30 glass-panel rounded-full mx-4 lg:ml-72 lg:mr-8 mb-8 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between px-6 py-3 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-wide">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-md hidden sm:block">
              ADMIN MODE
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-2 max-w-7xl mx-auto lg:ml-72">
        {renderContent()}
      </main>

      {/* Footer */}
      {processedFooter && (
        <footer className="relative mt-12 mb-4 mx-4 lg:ml-72 lg:mr-8 glass-panel rounded-2xl">
          <div className="px-4 py-4 text-center text-xs text-muted-foreground">
            {processedFooter}
          </div>
        </footer>
      )}
    </div>
  );
}
