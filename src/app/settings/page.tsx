import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/');
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto py-12 px-4 space-y-8">
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Settings</h1>

        <div className="space-y-6">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Account Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">GitHub Username</label>
                <input 
                  type="text" 
                  value={user.username} 
                  disabled 
                  className="w-full bg-bg-pill border border-dark-border rounded-xl px-4 py-2.5 text-sm text-text-tertiary cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">Developer Level</label>
                <select className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-brand-purple">
                  <option value="beginner" selected={user.experienceLevel === 'beginner'}>Beginner</option>
                  <option value="intermediate" selected={user.experienceLevel === 'intermediate'}>Intermediate</option>
                  <option value="advanced" selected={user.experienceLevel === 'advanced'}>Advanced</option>
                </select>
              </div>
            </div>
            <div className="pt-4">
              <button className="px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-bold hover:bg-brand-purple/90 transition-colors">
                Save Preferences
              </button>
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Danger Zone</h2>
            <p className="text-sm text-text-secondary">Permanently delete your account and all associated data.</p>
            <button className="px-5 py-2.5 rounded-xl border border-brand-red text-brand-red text-sm font-bold hover:bg-brand-red/10 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
