import { Skeleton } from '@/components/ui/skeleton';

export default function GetNumberLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-56" />

      {/* Country / Service selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Number list skeleton */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-border rounded-xl">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
