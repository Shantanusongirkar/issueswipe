import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import SavedMatches from '@/components/SavedMatches';
import DashboardLayout from '@/components/DashboardLayout';

export default async function MatchesPage() {
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
        <SavedMatches />
      </div>
    </DashboardLayout>
  );
}

