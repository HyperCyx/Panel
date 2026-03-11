import { getCurrentUser, getPublicSettings } from '@/app/actions';
import { AccessList } from '@/components/access-list';
import { Wifi } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccessListPage() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getPublicSettings(),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary uppercase tracking-widest">
        <Wifi className="h-4 w-4" />
        Access List
      </h2>
      <AccessList defaultOrigins={settings.defaultOrigins ?? []} />
    </div>
  );
}
