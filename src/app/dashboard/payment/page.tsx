import { getCurrentUser, getPublicSettings } from '@/app/actions';
import { PaymentPage } from '@/components/payment-page';
import { CreditCard } from 'lucide-react';

export const revalidate = 0;

export default async function PaymentPageRoute() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getPublicSettings(),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-primary uppercase tracking-widest">
        <CreditCard className="h-4 w-4" />
        Payment
      </h2>
      <PaymentPage
        userId={user.id}
        walletBalance={user.walletBalance ?? 0}
        currency={settings.currency || '৳'}
        paymentNetwork={settings.paymentNetwork || 'TRC20'}
        minimumWithdrawal={settings.minimumWithdrawal ?? 10}
        paymentMethods={settings.paymentMethods ?? []}
      />
    </div>
  );
}
