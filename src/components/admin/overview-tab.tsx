'use client';

import { useState, useEffect } from 'react';
import { getAdminDashboardStats, getPublicSettings } from '@/app/actions';
import type { AdminDashboardStats } from '@/lib/types';
import {
  Users, UserCheck, UserX, Phone, CheckCircle2, Hash,
  Clock, DollarSign, Wallet, Activity, Loader2,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

function StatCard({
  label, value, icon, iconBg, subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 hover:border-primary/30 hover:shadow-md transition-all overflow-hidden">
      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider sm:tracking-widest text-muted-foreground leading-tight">{label}</p>
        <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 leading-none truncate">{value}</p>
        {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (current > previous) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (current < previous) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-36 pt-2">
      {data.map(({ date, count }) => (
        <div key={date} className="flex flex-col items-center flex-1 gap-1.5 h-full">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full rounded-t-md bg-primary hover:bg-primary/90 transition-all duration-300"
              style={{
                height: `${Math.max((count / maxCount) * 100, count > 0 ? 6 : 0)}%`,
                minHeight: count > 0 ? '6px' : '2px',
              }}
              title={`${count} numbers on ${date}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap select-none">{date}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary mb-4 uppercase tracking-widest">
      {icon}
      {title}
    </h2>
  );
}

export function OverviewTab() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [currency, setCurrency] = useState('৳');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [statsResult, settings] = await Promise.all([
          getAdminDashboardStats(),
          getPublicSettings(),
        ]);
        if (statsResult.error) {
          setError(statsResult.error);
        } else if (statsResult.data) {
          setStats(statsResult.data);
        }
        setCurrency(settings.currency || '৳');
      } catch {
        setError('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        {error || 'No data available'}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Users Overview */}
      <section>
        <SectionHeader icon={<Users className="h-4 w-4" />} title="Users Overview" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            label="Total Users"
            value={stats.totalUsers}
            iconBg="bg-blue-500/20"
            icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />}
          />
          <StatCard
            label="Active Users"
            value={stats.activeUsers}
            iconBg="bg-emerald-500/20"
            icon={<UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />}
          />
          <StatCard
            label="Blocked Users"
            value={stats.blockedUsers}
            iconBg="bg-red-500/20"
            icon={<UserX className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />}
          />
        </div>
      </section>

      {/* Numbers & OTP */}
      <section>
        <SectionHeader icon={<Phone className="h-4 w-4" />} title="Numbers & OTP" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Today's Numbers"
            value={stats.todayNumbersAll}
            iconBg="bg-sky-500/20"
            icon={<Phone className="h-5 w-5 sm:h-6 sm:w-6 text-sky-400" />}
            subtitle={
              stats.yesterdayNumbersAll > 0
                ? `Yesterday: ${stats.yesterdayNumbersAll}`
                : undefined
            }
          />
          <StatCard
            label="Today's Success"
            value={stats.todaySuccessAll}
            iconBg="bg-emerald-500/20"
            icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />}
            subtitle={
              stats.yesterdaySuccessAll > 0
                ? `Yesterday: ${stats.yesterdaySuccessAll}`
                : undefined
            }
          />
          <StatCard
            label="Yesterday's Numbers"
            value={stats.yesterdayNumbersAll}
            iconBg="bg-orange-500/20"
            icon={<Phone className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />}
          />
          <StatCard
            label="Yesterday's Success"
            value={stats.yesterdaySuccessAll}
            iconBg="bg-violet-500/20"
            icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-violet-400" />}
          />
          <StatCard
            label="Total Numbers (All Time)"
            value={stats.totalNumbersAll}
            iconBg="bg-cyan-500/20"
            icon={<Hash className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />}
          />
        </div>
      </section>

      {/* Payment Overview */}
      <section>
        <SectionHeader icon={<DollarSign className="h-4 w-4" />} title="Payment Overview" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pending Payments"
            value={`${currency} ${stats.pendingPaymentsAmount.toFixed(2)}`}
            iconBg="bg-amber-500/20"
            icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />}
            subtitle={`${stats.pendingPaymentsCount} request${stats.pendingPaymentsCount !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="Approved Payments"
            value={`${currency} ${stats.approvedPaymentsAmount.toFixed(2)}`}
            iconBg="bg-emerald-500/20"
            icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />}
            subtitle={`${stats.approvedPaymentsCount} payment${stats.approvedPaymentsCount !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="Total User Balances"
            value={`${currency} ${stats.totalUserBalances.toFixed(2)}`}
            iconBg="bg-purple-500/20"
            icon={<Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />}
            subtitle="Sum of all user wallets"
          />
        </div>
      </section>

      {/* Weekly Trend */}
      <section>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <SectionHeader icon={<Activity className="h-4 w-4" />} title="Number Allocations (Last 7 Days)" />
          {stats.weekTrend.length > 0 ? (
            <TrendChart data={stats.weekTrend} />
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
              No trend data available
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-3 justify-end">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              Allocations
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
