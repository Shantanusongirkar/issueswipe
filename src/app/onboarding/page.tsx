import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import OnboardingForm from '@/components/OnboardingForm';
import Navbar from '@/components/Navbar';

export default async function OnboardingPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/');
  }

  if ((user.preferredLanguages !== '[]')) {
    redirect('/swipe');
  }

  return (
    <>
      <Navbar />
      <div className="flex-grow flex items-center justify-center py-12 px-4 relative z-10">
        {/* Background glow decorator */}
        <div className="absolute top-[-5%] left-[20%] w-[35%] h-[35%] rounded-full bg-brand-green/5 blur-[100px] pointer-events-none" />
        <OnboardingForm />
      </div>
    </>
  );
}
