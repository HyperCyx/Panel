import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-44" />

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
