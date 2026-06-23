import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import UserProfile from '@/components/UserProfile';
import DashboardLayout from '@/components/DashboardLayout';

export default async function ProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/');
  }

  if (!(user.preferredLanguages !== '[]')) {
    redirect('/onboarding');
  }

  return (
    <DashboardLayout>
      <div className="flex-grow py-6 px-4 md:px-8 relative">
        <UserProfile />
      </div>
    </DashboardLayout>
  );
}

