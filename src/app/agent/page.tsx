import { redirect } from 'next/navigation';
import { getCurrentUser, getPublicSettings } from '@/app/actions';
import { AgentDashboard } from '@/components/agent-dashboard';

export default async function AgentPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (!user.isAgent) redirect('/dashboard');

  return <AgentDashboard user={user} />;
}
