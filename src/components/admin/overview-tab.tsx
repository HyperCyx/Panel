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
    <div className="glass-panel border border-border/50 rounded-3xl p-4 sm:p-6 flex items-center gap-3 sm:gap-5 hover:border-primary/50 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.4)] transition-all duration-500 relative overflow-hidden group">
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg} shadow-inner relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 relative z-10">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground/80 leading-tight mb-1">{label}</p>
        <p className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/70 truncate tracking-tight">{value}</p>
        {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate font-medium">{subtitle}</p>}
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
        <div className="glass-panel border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />
          <SectionHeader icon={<Activity className="h-5 w-5" />} title="Number Allocations (Last 7 Days)" />
          {stats.weekTrend.length > 0 ? (
            <div className="relative z-10">
              <TrendChart data={stats.weekTrend} />
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground relative z-10 font-medium">
              No trend data available
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-4 justify-end relative z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="w-4 h-4 rounded shadow-sm bg-primary" />
              Allocations
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
