import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-wide">Loading...</p>
      </div>
    </div>
  );
}
