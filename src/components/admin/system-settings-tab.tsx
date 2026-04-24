'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Settings, Palette, ShieldOff, AlertTriangle, Database } from 'lucide-react';

const SettingsTab = dynamic(() => import('./settings-tab').then(m => ({ default: m.SettingsTab })));
const AppearanceTab = dynamic(() => import('./appearance-tab').then(m => ({ default: m.AppearanceTab })));
const BlockedAppsTab = dynamic(() => import('./blocked-apps-tab').then(m => ({ default: m.BlockedAppsTab })));
const ErrorManagementTab = dynamic(() => import('./error-management-tab').then(m => ({ default: m.ErrorManagementTab })));
const AccessListSettingsTab = dynamic(() => import('./access-list-settings-tab').then(m => ({ default: m.AccessListSettingsTab })));

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'accessList', label: 'Access List Sync', icon: Database },
  { id: 'blockedApps', label: 'Blocked Apps', icon: ShieldOff },
  { id: 'errors', label: 'Custom Errors', icon: AlertTriangle },
];

export function SystemSettingsTab() {
  const [activeTab, setActiveTab] = useState('general');

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <SettingsTab />;
      case 'appearance': return <AppearanceTab />;
      case 'accessList': return <AccessListSettingsTab />;
      case 'blockedApps': return <BlockedAppsTab />;
      case 'errors': return <ErrorManagementTab />;
      default: return <SettingsTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary tracking-tight">System Settings</h2>
      </div>

      <div className="glass-panel rounded-3xl p-2 flex overflow-x-auto gap-2 no-scrollbar border-border/50">
        {SETTINGS_NAV.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        {renderContent()}
      </div>
    </div>
  );
}
