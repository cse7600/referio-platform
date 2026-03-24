import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminNav from './admin-nav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side authentication — runs before any page renders
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const masterEmail = process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL;
  const isMaster = masterEmail && user.email === masterEmail;
  const isAdmin = user.app_metadata?.role === 'admin';
  if (!isMaster && !isAdmin) {
    redirect('/dashboard');
  }

  // Auth verified — render the admin shell
  return <AdminNav>{children}</AdminNav>;
}
