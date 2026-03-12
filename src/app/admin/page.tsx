import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { getCurrentUser } from '@/app/actions';

export const revalidate = 0;

export default async function AdminPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    if (!user.isAdmin) {
        redirect('/dashboard');
    }

    return <AdminDashboard />;
}
