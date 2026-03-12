import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-40" />

      {/* Balance card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Payment methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Transaction history */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <Skeleton className="h-5 w-44 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
