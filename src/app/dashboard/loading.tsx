import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Wallet & OTP Report skeleton */}
      <section>
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <Skeleton className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Virtual Numbers skeleton */}
      <section>
        <Skeleton className="h-5 w-56 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
              <Skeleton className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart skeleton */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <Skeleton className="h-5 w-52 mb-4" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    </div>
  );
}
