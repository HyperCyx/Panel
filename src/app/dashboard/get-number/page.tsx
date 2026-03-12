import { getCurrentUser, getPublicSettings } from '@/app/actions';
import { GetNumber } from '@/components/get-number';
import { Smartphone } from 'lucide-react';

export const revalidate = 0;

export default async function GetNumberPage() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getPublicSettings(),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary uppercase tracking-widest">
        <Smartphone className="h-4 w-4" />
        Get Number
      </h2>
      <GetNumber userId={user.id} currency={settings.currency || '৳'} otpRate={user.otpRate ?? 0.50} otpCheckInterval={settings.otpCheckInterval ?? 5} />
    </div>
  );
}
