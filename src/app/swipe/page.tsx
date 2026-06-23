import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import SwipeFeed from '@/components/SwipeFeed';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default async function SwipePage() {
  const user = await getSessionUser();

  if (user && !(user.preferredLanguages !== '[]')) {
    redirect('/onboarding');
  }

  return (
    <DashboardLayout>
      <div className="flex-grow flex flex-col justify-start items-center pt-12 pb-6 px-4 md:px-8 relative">
        {user ? (
          <SwipeFeed />
        ) : (
          <div className="flex flex-col items-center justify-center mt-20 text-center space-y-6 max-w-md mx-auto">
            <div className="p-4 bg-brand-purple/10 rounded-full mb-2">
              <svg className="h-10 w-10 text-brand-purple" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">Discover Open Source</h1>
            <p className="text-text-secondary">Sign in with GitHub to start matching with open source repositories tailored exactly to your tech stack.</p>
            <Link href="/api/auth/github" className="mt-4 px-6 py-3 rounded-xl bg-text-primary text-dark-bg font-bold shadow-lg hover:opacity-90 flex items-center space-x-2 transition-all hover:scale-105 active:scale-95">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              <span>Sign in with GitHub</span>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

