import { fetchSmsData, getPublicSettings } from '@/app/actions';
import { SmsInspector } from '@/components/sms-inspector';
import { subHours } from 'date-fns';
import { Code } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ConsolePage() {
  const [smsResult, settings] = await Promise.all([
    fetchSmsData({
      startDate: subHours(new Date(), 24),
      endDate: new Date(),
      senderId: '',
      phone: '',
    }),
    getPublicSettings(),
  ]);

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary uppercase tracking-widest">
        <Code className="h-4 w-4" />
        Console
      </h2>
      <SmsInspector
        initialRecords={smsResult.data ?? []}
        initialError={smsResult.error}
        refreshInterval={settings.consoleRefreshInterval ?? 60}
      />
    </div>
  );
}
