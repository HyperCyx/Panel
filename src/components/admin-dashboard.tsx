'use client'

import { useState, useRef } from 'react';
import {
  Menu, X, Users, Palette, AlertTriangle, Settings, CreditCard,
  LogOut, LayoutDashboard, Globe, UserCheck, BarChart3, ShieldOff, Banknote, Bell,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { logout } from '@/app/actions';
import Link from 'next/link';

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
import { useSettings } from '@/contexts/settings-provider';

const ADMIN_NAV = [
  { id: 'overview',    label: 'Overview',       icon: BarChart3 },
  { id: 'users',       label: 'Users',          icon: Users },
  { id: 'agents',      label: 'Agents',         icon: UserCheck },
  { id: 'payments',    label: 'Payments',       icon: CreditCard },
  { id: 'paymentMethods', label: 'Payment Methods', icon: Banknote },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'appearance',  label: 'Appearance',     icon: Palette },
  { id: 'blockedApps', label: 'Blocked Apps',   icon: ShieldOff },
  { id: 'errors',      label: 'Custom Errors',  icon: AlertTriangle },
  { id: 'settings',    label: 'Settings',       icon: Settings },
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
      case 'appearance': return <AppearanceTab />;
      case 'blockedApps': return <BlockedAppsTab />;
      case 'errors': return <ErrorManagementTab />;
      case 'settings': return <SettingsTab />;
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {item.label}
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
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border lg:pl-72">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold text-primary tracking-wide">Admin Panel</h1>
          </div>
          <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-md">
            ADMIN MODE
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-7xl mx-auto lg:pl-72 overflow-x-hidden">
        {renderContent()}
      </main>

      {/* Footer */}
      {processedFooter && (
        <footer className="border-t border-border bg-background/80 lg:pl-72">
          <div className="px-4 py-4 max-w-7xl mx-auto text-center text-xs text-muted-foreground">
            {processedFooter}
          </div>
        </footer>
      )}
    </div>
  );
}
