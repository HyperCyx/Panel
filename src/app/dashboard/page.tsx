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
    <div className="futuristic-card rounded-3xl p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${iconBg}`} />
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-background/50 border border-white/10 shadow-lg backdrop-blur-md z-10`}>
        {icon}
      </div>
      <div className="min-w-0 z-10">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/60 truncate">{value}</p>
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
              className="w-full rounded-t-md bg-gradient-to-t from-primary/50 to-primary hover:from-primary/70 hover:to-primary transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
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
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary neon-glow">
        {icon}
      </div>
      <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground uppercase tracking-widest">
        {title}
      </h2>
    </div>
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
        <SectionHeader icon={<Wallet className="h-5 w-5" />} title="Wallet & OTP Report" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard label="Wallet Balance"       value={`${currency} ${(stats.walletBalance ?? 0).toFixed(2)}`}  iconBg="bg-emerald-500" icon={<Wallet        className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />} />
          <StatCard label="Your OTP Rate"        value={`${currency} ${(stats.otpRate ?? 0).toFixed(2)}`}        iconBg="bg-amber-500"   icon={<Zap           className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400"   />} />
          <StatCard label="Today's Total OTP"    value={stats.todayOtpCount}                           iconBg="bg-blue-500"    icon={<MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400"    />} />
          <StatCard label="Yesterday's Total OTP" value={stats.yesterdayOtpCount}                      iconBg="bg-purple-500"  icon={<MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400"  />} />
        </div>
      </section>

      {/* Virtual Numbers Analytics */}
      <section>
        <SectionHeader icon={<Smartphone className="h-5 w-5" />} title="Virtual Numbers Analytics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard label="Today's Total Numbers"    value={stats.todayNumbers}           iconBg="bg-sky-500"     icon={<Phone       className="h-5 w-5 sm:h-6 sm:w-6 text-sky-400"     />} />
          <StatCard label="Today's Success"          value={stats.todaySuccess}           iconBg="bg-emerald-500" icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />} />
          <StatCard label="Yesterday's Total Numbers" value={stats.yesterdayNumbers}      iconBg="bg-orange-500"  icon={<Phone       className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400"  />} />
          <StatCard label="Yesterday's Success"      value={stats.yesterdaySuccess}       iconBg="bg-violet-500"  icon={<CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-violet-400" />} />
          <StatCard label="My Total Numbers"         value={stats.totalAllocatedNumbers}  iconBg="bg-cyan-500"    icon={<Hash        className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400"     />} />
          <StatCard label="Today's Allocated"        value={stats.todayAllocatedNumbers}  iconBg="bg-pink-500"    icon={<Smartphone  className="h-5 w-5 sm:h-6 sm:w-6 text-pink-400"     />} />
        </div>
      </section>

      {/* OTP Trend */}
      <section>
        <div className="relative glass-panel rounded-[2rem] p-6 sm:p-8 shadow-2xl">
          <SectionHeader icon={<Activity className="h-5 w-5" />} title="OTP Trend (Last 7 Days)" />
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


