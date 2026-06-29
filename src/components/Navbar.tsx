'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GitHubAuthButton from './GitHubAuthButton';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { Flame, GitBranch, LogOut, User as UserIcon, ShieldAlert, Sparkles, Menu, X } from 'lucide-react';

interface UserSession {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
  xp: number;
  dailyStreak: number;
  rank: string;
  isAdmin?: boolean;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setSession(data.user);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [pathname]); // Refresh session metrics on page changes

  const handleLogout = async () => {
    try {
      await auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navLinks = [
    { name: 'Swipe Feed', href: '/swipe', icon: Sparkles },
    { name: 'Saved Matches', href: '/matches', icon: GitBranch },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    ...(session?.isAdmin ? [{ name: 'Admin', href: '/admin', icon: ShieldAlert }] : []),
  ];

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/LogoIssueSwipeLight.png" alt="Logo" className="h-14 w-14 object-contain animate-pulse" />
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-red to-brand-green bg-clip-text text-transparent">
              IssueSwipe
            </span>
          </div>
          <div className="h-6 w-32 bg-dark-border rounded animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dark-border bg-dark-bg/85 backdrop-blur-md transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={session ? '/swipe' : '/'} className="flex items-center space-x-2 group">
              <img src="/LogoIssueSwipeLight.png" alt="Logo" className="h-14 w-14 object-contain group-hover:scale-105 transition-transform duration-200" />
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-red via-brand-purple to-brand-green bg-clip-text text-transparent">
                IssueSwipe
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          {session && (
            <nav className="hidden md:flex space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                        : 'text-text-secondary hover:bg-bg-pill hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Metrics & Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <>
                {/* Streak */}
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold animate-pulse-slow">
                  <Flame className="h-3.5 w-3.5 fill-current" />
                  <span>{session.dailyStreak}d Streak</span>
                </div>

                {/* Profile Widget */}
                <div className="flex items-center space-x-3 pl-3 border-l border-dark-border">
                  <Link href="/profile" className="flex items-center space-x-2.5 group">
                    {session.avatar ? (
                      <img
                        src={session.avatar}
                        alt={session.username}
                        className="h-8 w-8 rounded-full border border-dark-border group-hover:border-brand-blue/40 transition-colors"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-bg-pill flex items-center justify-center text-xs font-bold text-text-primary border border-dark-border">
                        {session.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-semibold text-text-primary group-hover:text-brand-blue transition-colors">
                        @{session.username}
                      </p>
                      <p className="text-[10px] text-text-tertiary">{session.rank}</p>
                    </div>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-brand-red hover:bg-brand-red/10 transition-all cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <GitHubAuthButton
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-200 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                <span>Sign in with GitHub</span>
              </GitHubAuthButton>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {session && (
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-semibold">
                <Flame className="h-3 w-3 fill-orange-400" />
                <span>{session.dailyStreak}d</span>
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-text-secondary hover:bg-bg-pill hover:text-text-primary"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-b border-dark-border px-4 pt-2 pb-4 space-y-2 animate-in fade-in slide-in-from-top duration-200">
          {session ? (
            <>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                        : 'text-text-secondary hover:bg-bg-pill hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-dark-border flex items-center justify-between">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2.5"
                >
                  {session.avatar ? (
                    <img src={session.avatar} alt={session.username} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-bg-pill border border-dark-border flex items-center justify-center text-xs font-bold text-text-primary">
                      {session.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-semibold text-text-primary">@{session.username}</p>
                    <p className="text-[10px] text-text-tertiary">{session.rank}</p>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm text-brand-red hover:bg-brand-red/10 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2">
              <GitHubAuthButton
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-lg bg-white text-black hover:bg-gray-200 text-sm font-semibold transition-all shadow-md"
              >
                <span>Sign in with GitHub</span>
              </GitHubAuthButton>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
