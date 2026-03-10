'use client'

import { useState, useRef } from 'react';
import {
  Menu, X, Users, Palette, AlertTriangle, Settings, CreditCard,
  LogOut, LayoutDashboard, Globe, UserCheck,
} from 'lucide-react';
import { adminLogout } from '@/app/actions';
import { UserManagementTab } from './admin/user-management-tab';
import { ErrorManagementTab } from './admin/error-management-tab';
import { SettingsTab } from './admin/settings-tab';
import { AppearanceTab } from './admin/appearance-tab';
import { PaymentManagementTab } from './admin/payment-management-tab';
import { AgentManagementTab } from './admin/agent-management-tab';
import Link from 'next/link';
import { useSettings } from '@/contexts/settings-provider';

const ADMIN_NAV = [
  { id: 'users',      label: 'Users',          icon: Users },
  { id: 'agents',     label: 'Agents',         icon: UserCheck },
  { id: 'payments',   label: 'Payments',       icon: CreditCard },
  { id: 'appearance', label: 'Appearance',     icon: Palette },
  { id: 'errors',     label: 'Custom Errors',  icon: AlertTriangle },
  { id: 'settings',   label: 'Settings',       icon: Settings },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const { siteName, footerText } = useSettings();

  const processedFooter = (footerText || '')
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{SITENAME}', siteName);

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <UserManagementTab />;
      case 'agents': return <AgentManagementTab />;
      case 'payments': return <PaymentManagementTab />;
      case 'appearance': return <AppearanceTab />;
      case 'errors': return <ErrorManagementTab />;
      case 'settings': return <SettingsTab />;
      default: return <UserManagementTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <form ref={logoutFormRef} action={adminLogout} className="hidden" />

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
