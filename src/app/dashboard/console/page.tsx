import { fetchSmsData } from '@/app/actions';
import { SmsInspector } from '@/components/sms-inspector';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Code } from 'lucide-react';

export default async function ConsolePage() {
  const smsResult = await fetchSmsData({
    startDate: startOfDay(subDays(new Date(), 1)),
    endDate: endOfDay(new Date()),
    senderId: '',
    phone: '',
  });

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary uppercase tracking-widest">
        <Code className="h-4 w-4" />
        Console
      </h2>
      <SmsInspector initialRecords={smsResult.data ?? []} initialError={smsResult.error} />
    </div>
  );
}
