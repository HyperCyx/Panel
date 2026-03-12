import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Fields */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}

        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
