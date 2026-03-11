import { redirect } from 'next/navigation';
import { getCurrentUser, getPublicSettings } from '@/app/actions';
import { DashboardShell } from '@/components/user-dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.status === 'blocked') redirect('/login');
  if (user.approvalStatus === 'pending' || user.approvalStatus === 'rejected') redirect('/login');
  if (user.isAgent) redirect('/agent');

  const { siteName } = await getPublicSettings();

  return (
    <DashboardShell user={user} siteName={siteName}>
      {children}
    </DashboardShell>
  );
}
