'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, GitPullRequest, Award, Shield, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/client';
import { GithubAuthProvider, signInWithPopup } from 'firebase/auth';

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const idToken = await result.user.getIdToken();
      
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isNew) {
          router.push('/onboarding');
        } else {
          router.push('/swipe');
        }
      } else {
        console.error('Failed to create session');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Firebase Auth Error:', error);
      setIsLoading(false);
    }
  };

  const features = [
    {
      title: 'Smart Matching Engine',
      description: 'Our advanced scoring algorithm matches open issues directly to your preferred languages, interests, and expertise level.',
      icon: Sparkles,
      color: 'text-brand-blue bg-brand-blue/10 border-brand-blue/20',
    },
    {
      title: 'Tinder-Style Swipe Feed',
      description: 'Swipe right to contribute or left to skip. Speedrun through community backlogs and discover your next project in seconds.',
      icon: Flame,
      color: 'text-brand-red bg-brand-red/10 border-brand-red/20',
    },
    {
      title: 'Contributor Gamification',
      description: 'Earn XP, unlock developer ranks (from New Contributor to Open Source Legend), and maintain daily commit streaks.',
      icon: Award,
      color: 'text-brand-green bg-brand-green/10 border-brand-green/20',
    },
    {
      title: 'GitHub GraphQL Sync',
      description: 'Live cron synchronization pulls good-first-issues and help-wanted tags straight from trending repositories.',
      icon: GitPullRequest,
      color: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20',
    },
  ];

  const testimonials = [
    {
      quote: "IssueSwipe solved my choice paralysis. I found a typescript bug in vercel/next.js that I fixed in an hour. The XP gamification is super addictive!",
      author: "Sarah Chen",
      role: "Frontend Staff Engineer",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    },
    {
      quote: "As a maintainer, finding reliable contributors is hard. Since our repo got popular on IssueSwipe, we've had 15 good first issues resolved by new devs.",
      author: "Alex Rivers",
      role: "Prisma Core Maintainer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
  ];

  return (
    <div className="relative min-h-screen bg-dark-bg flex flex-col justify-between overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-green/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-grow flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full glass border border-white/10 text-xs text-brand-green font-semibold"
          >
            <Star className="h-3 w-3 fill-current text-brand-green" />
            <span>Connecting 10,000+ developers to open source</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight"
          >
            Tinder for Open Source{' '}
            <span className="bg-gradient-to-r from-brand-red via-brand-purple to-brand-green bg-clip-text text-transparent block sm:inline">
              Contributions
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Find your next pull request in seconds. Discover open-source issues, gain XP, and climb the ranks with a swipe.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4"
          >
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex items-center space-x-3 px-8 py-4 rounded-xl bg-white text-black hover:bg-gray-200 text-base font-bold transition-all shadow-lg hover:scale-105 duration-200 disabled:opacity-50"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              <span>{isLoading ? 'Signing in...' : 'Sign in with GitHub'}</span>
            </button>
            
            <Link
              href="#features"
              className="px-6 py-4 rounded-xl glass border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white text-base font-semibold transition-all duration-200"
            >
              How it works
            </Link>
          </motion.div>
        </div>

        {/* Swipe Mock Interface Demo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 max-w-md mx-auto w-full relative"
        >
          {/* Card Mock */}
          <div className="glass-premium rounded-3xl p-6 glow-purple border border-brand-purple/20 relative rotate-[-2deg] hover:rotate-0 transition-transform duration-300">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">vercel / next.js</span>
                <h3 className="text-2xl font-bold text-white mt-1">docs: Update layout routing</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs font-extrabold">
                98% Match
              </span>
            </div>

            <p className="text-sm text-gray-400 mb-6 line-clamp-3">
              The documentation currently lacks nested routing layouts caching details. We need to add clarification and write code snippets detailing layout renders.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-2.5 py-1 rounded-lg bg-dark-border text-gray-300 text-xs font-medium border border-white/5">TypeScript</span>
              <span className="px-2.5 py-1 rounded-lg bg-dark-border text-gray-300 text-xs font-medium border border-white/5">good first issue</span>
              <span className="px-2.5 py-1 rounded-lg bg-brand-green/10 text-brand-green text-xs font-medium border border-brand-green/20">Beginner</span>
            </div>

            {/* Simulated Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-dark-border">
              <div className="w-12 h-12 rounded-full border border-brand-red/30 bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-sm">
                NOPE
              </div>
              <div className="px-5 py-2.5 rounded-full border border-brand-blue/30 bg-brand-blue/10 text-brand-blue font-bold text-xs">
                SAVE
              </div>
              <div className="w-12 h-12 rounded-full border border-brand-green/30 bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-sm">
                LIKE
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Section */}
        <section id="features" className="mt-32 pt-16 border-t border-dark-border">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Smart matching. Clean feedback.</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
              Swipe interface matches you to the best repositories, gamifying open source contributions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5 }}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className={`p-3 rounded-xl w-fit border ${feature.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mt-32 pt-16 border-t border-dark-border">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">Loved by Developers</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((t, idx) => (
              <div key={idx} className="glass-premium rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                <p className="text-gray-300 italic text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center space-x-3">
                  <img src={t.avatar} alt={t.author} className="h-10 w-10 rounded-full object-cover border border-dark-border" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{t.author}</h4>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-8 text-center text-xs text-gray-500 bg-dark-bg relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Flame className="h-4 w-4 text-brand-red" />
            <span className="font-extrabold bg-gradient-to-r from-brand-red to-brand-green bg-clip-text text-transparent">IssueSwipe © 2026</span>
          </div>
          <p className="text-gray-600">Built as a staff engineering project for rapid Open Source discovery.</p>
        </div>
      </footer>
    </div>
  );
}
