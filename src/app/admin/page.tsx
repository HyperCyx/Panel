import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin-dashboard';
import { getCurrentUser } from '@/app/actions';

export default async function AdminPage() {
    const hasAdminSession = cookies().has('admin_session');
    
    if (!hasAdminSession) {
        redirect('/admin/login');
    }

    // Also verify the user is an admin
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
        redirect('/dashboard');
    }

    return <AdminDashboard />;
}
