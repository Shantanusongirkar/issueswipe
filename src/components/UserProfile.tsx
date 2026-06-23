'use client';

import { useState, useEffect } from 'react';
import { Flame, Star, Award, GitPullRequest, GitMerge, CheckCircle, Clock, Shield, Sparkles } from 'lucide-react';

interface XPTransaction {
  id: string;
  amount: number;
  action: string;
  createdAt: string;
}

interface Repository {
  name: string;
  owner: string;
}

interface Issue {
  title: string;
  number: number;
  url: string;
  repository: Repository;
}

interface Contribution {
  id: string;
  status: string;
  prUrl: string | null;
  updatedAt: string;
  issue: Issue;
}

interface UserProfileData {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  publicReposCount: number;
  xp: number;
  streak: number;
  rank: string;
  preferredLanguages: string; // JSON string array
  preferredTopics: string; // JSON string array
  experienceLevel: string;
  savedMatches: any[];
}

const RANKS = [
  { name: 'New Contributor', minXp: 0, maxXp: 100 },
  { name: 'Issue Hunter', minXp: 101, maxXp: 500 },
  { name: 'PR Warrior', minXp: 501, maxXp: 1500 },
  { name: 'Merge Machine', minXp: 1501, maxXp: 5000 },
  { name: 'Open Source Legend', minXp: 5001, maxXp: 999999 },
];

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [editTopics, setEditTopics] = useState<string[]>([]);
  const [newLang, setNewLang] = useState('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setEditLanguages(JSON.parse(data.preferredLanguages || '[]'));
          setEditTopics(JSON.parse(data.preferredTopics || '[]'));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languages: editLanguages,
          interests: editTopics,
          experienceLevel: profile?.experienceLevel || 'intermediate',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsEditing(false);
        // Force reload layout or dispatch event
        window.dispatchEvent(new Event('pathnameChange'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12 px-4 space-y-6 animate-pulse select-none">
        <div className="glass-premium h-48 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-premium h-32 rounded-2xl" />
          <div className="glass-premium h-32 rounded-2xl" />
          <div className="glass-premium h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-text-secondary select-none">
        <p>Could not load profile. Please try logging in again.</p>
      </div>
    );
  }

  // Parse arrays
  const languages: string[] = JSON.parse(profile.preferredLanguages || '[]');
  const interests: string[] = JSON.parse(profile.preferredTopics || '[]');

  // Calculate XP progress
  const currentRankIndex = RANKS.findIndex(r => profile.xp >= r.minXp && profile.xp <= r.maxXp);
  const currentRankInfo = RANKS[currentRankIndex] || RANKS[0];
  const nextRankInfo = RANKS[currentRankIndex + 1] || null;

  const xpRequiredForCurrent = currentRankInfo.minXp;
  const xpRequiredForNext = nextRankInfo ? nextRankInfo.minXp : currentRankInfo.maxXp;
  const range = xpRequiredForNext - xpRequiredForCurrent;
  const relativeXp = profile.xp - xpRequiredForCurrent;
  const percent = nextRankInfo ? Math.min(100, Math.round((relativeXp / range) * 100)) : 100;

  // Contributions counts
  const totalContributions = profile.savedMatches?.length || 0;
  const mergedCount = profile.savedMatches?.filter(c => c.status === 'pr_merged').length || 0;
  const submittedCount = profile.savedMatches?.filter(c => c.status === 'pr_opened').length || 0;

  const actionLabels: Record<string, string> = {
    SAVE_ISSUE: 'Bookmarked an issue',
    OPEN_ISSUE: 'Unlocked swipe card flow',
    SUBMIT_PR: 'Submitted a pull request',
    MERGE_PR: 'Merged a pull request',
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 space-y-6 relative z-10 select-none">
      
      {/* Profile Card Header */}
      <div className="bg-dark-card rounded-3xl p-6 md:p-8 border border-dark-border flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 shadow-sm">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.username}
            className="h-20 w-20 rounded-full border-2 border-brand-purple/40 shadow-sm"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center text-2xl font-bold border border-dark-border">
            {profile.username[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex-grow space-y-3">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-text-primary">{profile.name || profile.username}</h2>
              <p className="text-brand-purple font-semibold text-xs mt-0.5">@{profile.username}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-bold uppercase leading-none">
                {profile.experienceLevel}
              </span>
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold">
                <Flame className="h-3.5 w-3.5 fill-current animate-pulse" />
                <span>{profile.dailyStreak}d Streak</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
            {profile.bio || 'This developer is busy writing code and hasn\'t filled out their bio yet.'}
          </p>

          <div className="flex justify-center md:justify-start gap-5 text-[11px] text-text-tertiary font-semibold pt-1">
            <span><strong className="text-text-primary">{profile.followersCount}</strong> Followers</span>
            <span><strong className="text-text-primary">{profile.publicReposCount}</strong> Public Repos</span>
          </div>
        </div>
      </div>

      {/* Gamification Status (XP & Progress Bar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* XP Status Card */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5 md:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider block font-bold">Developer Level</span>
              <h3 className="text-base font-bold text-text-primary flex items-center space-x-1.5">
                <Award className="h-4.5 w-4.5 text-brand-purple" />
                <span>{profile.rank}</span>
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-text-primary">{profile.xp}</span>
              <span className="text-[10px] text-text-tertiary block font-bold">Total XP</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-1">
            <div className="w-full h-2 bg-bg-pill rounded-full overflow-hidden border border-dark-border/40">
              <div
                className="h-full bg-brand-purple rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-text-tertiary font-bold uppercase">
              <span>{currentRankInfo.minXp} XP</span>
              <span>{percent}% to next level</span>
              <span>{nextRankInfo ? `${nextRankInfo.minXp} XP` : 'MAX'}</span>
            </div>
          </div>
        </div>

        {/* Contribution Counter stats */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold">Contribution Metrics</span>
          
          <div className="grid grid-cols-3 text-center gap-1 py-2">
            <div className="space-y-0.5">
              <span className="text-base font-black text-brand-blue">{totalContributions - submittedCount - mergedCount}</span>
              <span className="text-[9px] text-text-tertiary font-bold uppercase block">Opened</span>
            </div>
            <div className="space-y-0.5 border-x border-dark-border">
              <span className="text-base font-black text-yellow-500">{submittedCount}</span>
              <span className="text-[9px] text-text-tertiary font-bold uppercase block">PRs</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-base font-black text-brand-green">{mergedCount}</span>
              <span className="text-[9px] text-text-tertiary font-bold uppercase block">Merged</span>
            </div>
          </div>

          <div className="text-[9px] text-text-tertiary font-semibold flex items-center justify-center space-x-1 pt-1 border-t border-dark-border/60">
            <Shield className="h-3 w-3" />
            <span>Leaderboard verified state</span>
          </div>
        </div>
      </div>

      {/* Preferences & Badges Header */}
      <div className="flex justify-between items-end">
        <h3 className="text-lg font-bold text-text-primary">Your Skills</h3>
        <div>
          {isEditing ? (
            <div className="flex space-x-2">
              <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-pill">Cancel</button>
              <button onClick={handleSaveProfile} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-purple text-white hover:bg-brand-purple/90">Save Changes</button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand-purple hover:bg-brand-purple/10 border border-brand-purple/20">
              Edit Skills
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">

        {/* Programming Languages */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Programming Languages</h3>
          <div className="flex flex-wrap gap-1.5">
            {(isEditing ? editLanguages : languages).length > 0 ? (isEditing ? editLanguages : languages).map((lang) => (
              <span
                key={lang}
                className="px-2.5 py-1 rounded-lg bg-bg-pill border border-dark-border/40 text-text-secondary text-[11px] font-semibold flex items-center space-x-1"
              >
                <span>{lang}</span>
                {isEditing && (
                  <button onClick={() => setEditLanguages(editLanguages.filter(l => l !== lang))} className="ml-1 text-text-tertiary hover:text-brand-red font-bold">&times;</button>
                )}
              </span>
            )) : <span className="text-xs text-text-tertiary italic">No languages configured.</span>}
          </div>
          {isEditing && (
            <div className="flex mt-2 space-x-2">
              <input type="text" value={newLang} onChange={(e) => setNewLang(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newLang.trim()) { setEditLanguages([...editLanguages, newLang.trim()]); setNewLang(''); } }} placeholder="Add language..." className="flex-1 bg-bg-pill border border-dark-border rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-brand-purple" />
              <button onClick={() => { if (newLang.trim()) { setEditLanguages([...editLanguages, newLang.trim()]); setNewLang(''); } }} className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-bold">Add</button>
            </div>
          )}
        </div>

        {/* Development Interests */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Interests</h3>
          <div className="flex flex-wrap gap-1.5">
            {(isEditing ? editTopics : interests).length > 0 ? (isEditing ? editTopics : interests).map((interest) => (
              <span
                key={interest}
                className="px-2.5 py-1 rounded-lg bg-bg-pill border border-dark-border/40 text-text-secondary text-[11px] font-semibold flex items-center space-x-1"
              >
                <span>{interest}</span>
                {isEditing && (
                  <button onClick={() => setEditTopics(editTopics.filter(t => t !== interest))} className="ml-1 text-text-tertiary hover:text-brand-red font-bold">&times;</button>
                )}
              </span>
            )) : <span className="text-xs text-text-tertiary italic">No interests configured.</span>}
          </div>
          {isEditing && (
            <div className="flex mt-2 space-x-2">
              <input type="text" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTopic.trim()) { setEditTopics([...editTopics, newTopic.trim()]); setNewTopic(''); } }} placeholder="Add topic/interest..." className="flex-1 bg-bg-pill border border-dark-border rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none focus:border-brand-purple" />
              <button onClick={() => { if (newTopic.trim()) { setEditTopics([...editTopics, newTopic.trim()]); setNewTopic(''); } }} className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-bold">Add</button>
            </div>
          )}
        </div>
      </div>

      {/* History Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Contributions list */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5 lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Active Contributions</h3>

          {!profile.savedMatches || profile.savedMatches.length === 0 ? (
            <p className="text-xs text-text-tertiary py-4 italic">No contributions started yet. Swipe right on some issues!</p>
          ) : (
            <div className="space-y-2">
              {profile.savedMatches.slice(0, 4).map((contrib) => (
                <div
                  key={contrib.id}
                  className="p-3 rounded-xl bg-bg-pill border border-dark-border/45 flex items-center justify-between gap-4"
                >
                  <div className="truncate space-y-0.5">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {contrib.issue.title}
                    </p>
                    <p className="text-[10px] text-text-tertiary font-semibold">
                      {contrib.issue.repository.owner} / {contrib.issue.repository.name}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {contrib.status === 'bookmarked' && (
                      <span className="px-2 py-0.5 rounded bg-brand-blue/15 text-brand-blue text-[9px] font-bold">Bookmarked</span>
                    )}
                    {contrib.status === 'pr_opened' && (
                      <span className="px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-500 text-[9px] font-bold">PR Opened</span>
                    )}
                    {contrib.status === 'pr_merged' && (
                      <span className="px-2 py-0.5 rounded bg-brand-green/15 text-brand-green text-[9px] font-bold">Merged</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent XP Transactions Feed */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recent Activity Log</h3>

          {(!profile.xpTransactions || profile.xpTransactions.length === 0) ? (
            <p className="text-xs text-text-tertiary py-4 italic">No XP earned yet.</p>
          ) : (
            <div className="space-y-3">
              {profile.xpTransactions.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center text-xs border-b border-dark-border/40 pb-2 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-text-secondary block leading-snug">{actionLabels[tx.action] || tx.action}</span>
                    <span className="text-[9px] text-text-tertiary font-bold">{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className="font-black text-brand-green shrink-0 text-xs">+{tx.amount} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
