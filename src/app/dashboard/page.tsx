import { getCurrentUser, getDashboardStats, getPublicSettings } from '@/app/actions';
import {
  Wallet, Zap, MessageSquare, Phone, CheckCircle2,
  Hash, Smartphone, Activity,
} from 'lucide-react';
import type { DashboardStats } from '@/lib/types';

export const revalidate = 0;

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, iconBg,
}: { label: string; value: string | number; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 hover:border-primary/30 hover:shadow-md transition-all overflow-hidden">
      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider sm:tracking-widest text-muted-foreground leading-tight">{label}</p>
        <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 leading-none truncate">{value}</p>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: DashboardStats['weekTrend'] }) {
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
              title={`${count} OTPs on ${date}`}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [user, statsResult, publicSettings] = await Promise.all([
    getCurrentUser(),
    getDashboardStats(),
    getPublicSettings(),
  ]);

  const currency = publicSettings.currency || '৳';

  const stats: DashboardStats = statsResult.data ?? {
    walletBalance: user?.walletBalance ?? 0,
    otpRate: user?.otpRate ?? 0.50,
    todayOtpCount: 0,
    yesterdayOtpCount: 0,
    todayNumbers: 0,
    yesterdayNumbers: 0,
    todaySuccess: 0,
    yesterdaySuccess: 0,
    weekTrend: [],
    totalAllocatedNumbers: 0,
    todayAllocatedNumbers: 0,
  };

  return (
    <div className="space-y-8">
      {/* Wallet & OTP Report */}
      <section>
        <SectionHeader icon={<Wallet className="h-4 w-4" />} title="Wallet & OTP Report" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Wallet Balance"       value={`${currency} ${(stats.walletBalance ?? 0).toFixed(2)}`}  iconBg="bg-emerald-500/20" icon={<Wallet        className="h-6 w-6 text-emerald-400" />} />
          <StatCard label="Your OTP Rate"        value={`${currency} ${(stats.otpRate ?? 0).toFixed(2)}`}        iconBg="bg-amber-500/20"   icon={<Zap           className="h-6 w-6 text-amber-400"   />} />
          <StatCard label="Today's Total OTP"    value={stats.todayOtpCount}                           iconBg="bg-blue-500/20"    icon={<MessageSquare className="h-6 w-6 text-blue-400"    />} />
          <StatCard label="Yesterday's Total OTP" value={stats.yesterdayOtpCount}                      iconBg="bg-purple-500/20"  icon={<MessageSquare className="h-6 w-6 text-purple-400"  />} />
        </div>
      </section>

      {/* Virtual Numbers Analytics */}
      <section>
        <SectionHeader icon={<Smartphone className="h-4 w-4" />} title="Virtual Numbers Analytics" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Today's Total Numbers"    value={stats.todayNumbers}           iconBg="bg-sky-500/20"     icon={<Phone       className="h-6 w-6 text-sky-400"     />} />
          <StatCard label="Today's Success"          value={stats.todaySuccess}           iconBg="bg-emerald-500/20" icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />} />
          <StatCard label="Yesterday's Total Numbers" value={stats.yesterdayNumbers}      iconBg="bg-orange-500/20"  icon={<Phone       className="h-6 w-6 text-orange-400"  />} />
          <StatCard label="Yesterday's Success"      value={stats.yesterdaySuccess}       iconBg="bg-violet-500/20"  icon={<CheckCircle2 className="h-6 w-6 text-violet-400" />} />
          <StatCard label="My Total Numbers"         value={stats.totalAllocatedNumbers}  iconBg="bg-cyan-500/20"    icon={<Hash        className="h-6 w-6 text-cyan-400"     />} />
          <StatCard label="Today's Allocated"        value={stats.todayAllocatedNumbers}  iconBg="bg-pink-500/20"    icon={<Smartphone  className="h-6 w-6 text-pink-400"     />} />
        </div>
      </section>

      {/* OTP Trend */}
      <section>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <SectionHeader icon={<Activity className="h-4 w-4" />} title="OTP Trend (Last 7 Days)" />
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
              OTP Count
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


