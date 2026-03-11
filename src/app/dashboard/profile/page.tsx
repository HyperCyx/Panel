import { getCurrentUser, getDashboardStats } from '@/app/actions';
import { ProfileView } from '@/components/profile-view';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const [user, statsResult] = await Promise.all([
    getCurrentUser(),
    getDashboardStats(),
  ]);
  if (!user) return null;

  const walletBalance = statsResult.data?.walletBalance ?? user.walletBalance ?? 0;
  const otpRate = statsResult.data?.otpRate ?? user.otpRate ?? 0.5;

  return <ProfileView user={user} walletBalance={walletBalance} otpRate={otpRate} />;
}
