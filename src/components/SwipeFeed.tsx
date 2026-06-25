'use client';

import Link from 'next/link';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Flame, Star, GitPullRequest, Bookmark, Sparkles, RefreshCw, X, Check, Award, Clock, HelpCircle, Heart, ChevronDown, ListFilter, MessageSquare, MoreHorizontal } from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  readmeText?: string | null;
}

interface Issue {
  id: string;
  githubId: string;
  title: string;
  description: string | null;
  url: string;
  number: number;
  difficulty: string;
  estimatedTime: string;
  labels: string[];
  matchScore: number;
  repository: Repository;
}

interface RepoCardData {
  repository: Repository;
  issues: Issue[];
  matchScore: number;
  techTags: string[];
}

export default function SwipeFeed() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [repoCards, setRepoCards] = useState<RepoCardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // XP floating toasts
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [toastId, setToastId] = useState(0);

  // Filters State
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [minMatchScore, setMinMatchScore] = useState('All');
  const [goodFirstIssueOnly, setGoodFirstIssueOnly] = useState(true);

  // Dropdown UI state
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [diffDropdownOpen, setDiffDropdownOpen] = useState(false);
  const [scoreDropdownOpen, setScoreDropdownOpen] = useState(false);

  // Framer Motion controls
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const cardControls = useAnimation();

  // Dynamic transforms for rotation and opacity overlays based on drag offset
  const rotate = useTransform(motionX, [-200, 200], [-10, 10]);
  const opacityNope = useTransform(motionX, [-150, 0], [1, 0]);
  const opacityContribute = useTransform(motionX, [0, 150], [0, 1]);

  useEffect(() => {
    fetchFeed();
  }, [selectedLanguage, selectedDifficulty, minMatchScore]);

  // Re-filter locally when goodFirstIssueOnly changes (no API call needed)
  useEffect(() => {
    if (!loading) {
      fetchFeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goodFirstIssueOnly]);

  async function fetchFeed() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedLanguage !== 'All') q.append('language', selectedLanguage);
      if (selectedDifficulty !== 'All') q.append('difficulty', selectedDifficulty);

      const res = await fetch(`/api/issues/feed?${q.toString()}`);
      if (res.ok) {
        let data: Issue[] = await res.json();
        
        // Filter by Match Score if applicable
        if (minMatchScore !== 'All') {
          const score = parseInt(minMatchScore);
          data = data.filter((i) => i.matchScore >= score);
        }

        setIssues(data);
        
        // Group issues by Repository
        const repoMap: Record<string, RepoCardData> = {};
        for (const issue of data) {
          const repoId = issue.repository.id;
          if (!repoMap[repoId]) {
            // Collect all unique labels from all issues in this repo
            const allLabels = JSON.parse(JSON.stringify(issue.labels || []));
            repoMap[repoId] = {
              repository: issue.repository,
              issues: [],
              matchScore: 0,
              techTags: Array.from(new Set([issue.repository.language, ...allLabels])).filter(Boolean) as string[],
            };
          }
          repoMap[repoId].issues.push(issue);
          if (issue.matchScore > repoMap[repoId].matchScore) {
            repoMap[repoId].matchScore = issue.matchScore;
          }
        }

        // Convert grouped object to sorted array
        const sortedRepos = Object.values(repoMap).sort((a, b) => b.matchScore - a.matchScore);
        
        // Apply Good First Issue toggle filter on cards
        const filteredRepos = goodFirstIssueOnly 
          ? sortedRepos.filter(card => card.issues.some(iss => iss.labels.some(lbl => lbl.toLowerCase().includes('good first issue'))))
          : sortedRepos;

        setRepoCards(filteredRepos);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }

  // Award notification toast helper
  const triggerXpToast = (xpGained: number) => {
    const id = toastId;
    setToastId((prev) => prev + 1);
    setToasts((prev) => [...prev, { id, text: `+${xpGained} XP!` }]);
    
    // Auto-remove toast after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1500);
  };

  const handleSwipeAction = async (direction: 'SKIP' | 'CONTRIBUTE' | 'SAVE') => {
    if (currentIndex >= repoCards.length) return;

    const currentCard = repoCards[currentIndex];
    const issuesToSwipe = currentCard.issues;

    setCurrentIndex((prev) => prev + 1);

    try {
      // Swiping action runs on all issues listed inside the repository card
      const swipePromises = issuesToSwipe.map(async (issue) => {
        return fetch('/api/swipe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            issueId: issue.id,
            direction,
          }),
        });
      });

      await Promise.all(swipePromises);

      if (direction === 'CONTRIBUTE') {
        triggerXpToast(25 * issuesToSwipe.length);
      } else if (direction === 'SAVE') {
        triggerXpToast(10 * issuesToSwipe.length);
      }
      
      // Notify layout to refresh sidebar stats
      window.dispatchEvent(new Event('xpUpdated'));
      
    } catch (err) {
      console.error('Swipe action sync failed:', err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex >= repoCards.length || loading || isAnimating) return;
      if (e.key === 'ArrowLeft') {
        swipeLeft();
      } else if (e.key === 'ArrowRight') {
        swipeRight();
      } else if (e.key === 's' || e.key === 'S') {
        saveBookmark();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, repoCards, loading, isAnimating]);

  const swipeLeft = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    cardControls.start({ x: -600, opacity: 0, rotate: -20, transition: { duration: 0.2, ease: 'easeOut' } })
      .then(() => { handleSwipeAction('SKIP'); motionX.set(0); setIsAnimating(false); });
  };

  const swipeRight = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    cardControls.start({ x: 600, opacity: 0, rotate: 20, transition: { duration: 0.2, ease: 'easeOut' } })
      .then(() => { handleSwipeAction('CONTRIBUTE'); motionX.set(0); setIsAnimating(false); });
  };

  const saveBookmark = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    cardControls.start({ y: -400, opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } })
      .then(() => { handleSwipeAction('SAVE'); motionY.set(0); setIsAnimating(false); });
  };

  const handleDragEnd = async (event: any, info: any) => {
    if (isAnimating) return;
    const threshold = 100;
    if (info.offset.x > threshold || info.velocity.x > 500) {
      swipeRight();
    } else if (info.offset.x < -threshold || info.velocity.x < -500) {
      swipeLeft();
    } else if (info.offset.y < -threshold) {
      saveBookmark();
    } else {
      // Snap back
      motionX.set(0);
      motionY.set(0);
    }
  };

  const handleSyncIssues = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const result = await res.json();
      if (res.ok && result.success) {
        // Show success toast
        const id = toastId;
        setToastId((prev) => prev + 1);
        setToasts((prev) => [...prev, { id, text: `✨ ${result.issuesSynced} new issues synced!` }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
        // Reload the feed to show new cards
        await fetchFeed();
      } else {
        const id = toastId;
        setToastId((prev) => prev + 1);
        setToasts((prev) => [...prev, { id, text: `❌ Sync failed` }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  // Get color code by language
  const getLanguageColor = (lang: string | null) => {
    if (!lang) return 'bg-gray-400';
    const colors: Record<string, string> = {
      TypeScript: 'bg-blue-500',
      JavaScript: 'bg-yellow-500',
      Python: 'bg-green-600',
      Go: 'bg-cyan-500',
      Rust: 'bg-orange-600',
      HTML: 'bg-orange-500',
      CSS: 'bg-indigo-500',
    };
    return colors[lang] || 'bg-brand-purple';
  };

  // Render Loader
  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 px-4 space-y-6">
        <div className="glass-premium rounded-3xl p-6 border border-dark-border space-y-6 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-bg-pill rounded" />
              <div className="h-8 w-64 bg-bg-pill rounded" />
            </div>
            <div className="h-6 w-16 bg-bg-pill rounded-full" />
          </div>
          <div className="h-24 bg-bg-pill rounded" />
          <div className="flex space-x-2">
            <div className="h-6 w-16 bg-bg-pill rounded-full" />
            <div className="h-6 w-20 bg-bg-pill rounded-full" />
          </div>
          <div className="pt-6 border-t border-dark-border flex justify-between">
            <div className="h-12 w-12 rounded-full bg-bg-pill" />
            <div className="h-10 w-24 bg-bg-pill rounded-full" />
            <div className="h-12 w-12 rounded-full bg-bg-pill" />
          </div>
        </div>
      </div>
    );
  }

  const activeCard = repoCards[currentIndex];

  return (
    <div className="w-full max-w-2xl mx-auto py-6 px-4 flex flex-col items-center select-none">
      
      {/* Floating XP Toasts */}
      <div className="absolute top-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.8 }}
              animate={{ opacity: 1, y: -40, scale: 1.2 }}
              exit={{ opacity: 0, y: -60 }}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-brand-green text-white text-xs font-black shadow-lg"
            >
              <Award className="h-3.5 w-3.5" />
              <span>{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header and Subheading Row */}
      <div className="w-full flex flex-col items-start mb-6">
        <h2 className="text-xl font-bold text-text-primary">Find open source projects that need you.</h2>
        <p className="text-xs font-semibold text-text-secondary mt-1">Swipe right to contribute ❤️</p>
      </div>

      {/* Filters Row */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6 relative z-30">
        <div className="flex flex-wrap gap-2">
          {/* Match Score Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setScoreDropdownOpen(!scoreDropdownOpen); setLangDropdownOpen(false); setDiffDropdownOpen(false); }}
              className="px-3.5 py-1.5 rounded-xl bg-dark-card border border-dark-border text-xs font-bold text-text-secondary hover:text-text-primary flex items-center space-x-1 cursor-pointer"
            >
              <span>Match Score: {minMatchScore === 'All' ? 'All' : `>${minMatchScore}%`}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {scoreDropdownOpen && (
              <div className="absolute top-9 left-0 w-36 bg-dark-card border border-dark-border rounded-xl shadow-lg p-1.5 space-y-0.5">
                {['All', '90', '80', '70'].map((score) => (
                  <button
                    key={score}
                    onClick={() => { setMinMatchScore(score); setScoreDropdownOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-bg-pill text-xs font-semibold text-text-secondary hover:text-text-primary"
                  >
                    {score === 'All' ? 'All Scores' : `>${score}% Match`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setLangDropdownOpen(!langDropdownOpen); setScoreDropdownOpen(false); setDiffDropdownOpen(false); }}
              className="px-3.5 py-1.5 rounded-xl bg-dark-card border border-dark-border text-xs font-bold text-text-secondary hover:text-text-primary flex items-center space-x-1 cursor-pointer"
            >
              <span>Language: {selectedLanguage}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {langDropdownOpen && (
              <div className="absolute top-9 left-0 w-36 bg-dark-card border border-dark-border rounded-xl shadow-lg p-1.5 space-y-0.5">
                {['All', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setSelectedLanguage(lang); setLangDropdownOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-bg-pill text-xs font-semibold text-text-secondary hover:text-text-primary"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setDiffDropdownOpen(!diffDropdownOpen); setLangDropdownOpen(false); setScoreDropdownOpen(false); }}
              className="px-3.5 py-1.5 rounded-xl bg-dark-card border border-dark-border text-xs font-bold text-text-secondary hover:text-text-primary flex items-center space-x-1 cursor-pointer"
            >
              <span>Difficulty: {selectedDifficulty}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {diffDropdownOpen && (
              <div className="absolute top-9 left-0 w-36 bg-dark-card border border-dark-border rounded-xl shadow-lg p-1.5 space-y-0.5">
                {['All', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => { setSelectedDifficulty(diff); setDiffDropdownOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-bg-pill text-xs font-semibold text-text-secondary hover:text-text-primary"
                  >
                    {diff}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Good First Issue Switch Toggle */}
          <button
            onClick={() => setGoodFirstIssueOnly(!goodFirstIssueOnly)}
            className="px-3.5 py-1.5 rounded-xl bg-dark-card border border-dark-border text-xs font-bold text-text-secondary hover:text-text-primary flex items-center space-x-2 cursor-pointer transition-all"
          >
            <span>Good First Issue</span>
            <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${goodFirstIssueOnly ? 'bg-brand-purple' : 'bg-bg-pill'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${goodFirstIssueOnly ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!activeCard ? (
        <div className="w-full max-w-lg text-center space-y-6 py-16 px-4 bg-dark-card border border-dark-border rounded-3xl glow-purple z-10">
          <div className="p-5 rounded-full bg-brand-purple/10 border border-brand-purple/20 w-fit mx-auto glow-purple">
            <GitPullRequest className="h-10 w-10 text-brand-purple" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-text-primary">You've cleared the queue!</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              No matching repositories in feed. Sync new Good First Issues from GitHub or adjust active score, language, or difficulty filters.
            </p>
          </div>
          <button
            onClick={handleSyncIssues}
            disabled={syncing}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all mx-auto shadow-md disabled:opacity-55 cursor-pointer"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing GitHub...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Sync New Issues</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <>


          {/* Redesigned Repository Stack Card */}
          <div className="w-full flex-grow relative h-[calc(100vh-380px)] min-h-[420px] max-w-xl select-none z-10">
            {/* Background peek card (next card) */}
            {repoCards[currentIndex + 1] && (
              <div className="absolute inset-0 bg-dark-card rounded-3xl border border-dark-border shadow-sm" style={{ transform: 'scale(0.96) translateY(8px)', zIndex: 0, opacity: 0.6 }} />
            )}
          <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            style={{ x: motionX, y: motionY, rotate, zIndex: 1 }}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            className="absolute inset-0 bg-dark-card rounded-3xl p-6 border border-dark-border flex flex-col justify-between cursor-grab active:cursor-grabbing shadow-lg overflow-hidden"
          >
            {/* Swiping overlay stamps */}
            <motion.div
              style={{ opacity: opacityContribute }}
              className="absolute top-6 left-6 border-4 border-brand-green text-brand-green font-black uppercase text-xl px-4 py-1.5 rounded-xl rotate-[-12deg] z-40 pointer-events-none"
            >
              Contribute
            </motion.div>

            <motion.div
              style={{ opacity: opacityNope }}
              className="absolute top-6 right-6 border-4 border-brand-red text-brand-red font-black uppercase text-xl px-4 py-1.5 rounded-xl rotate-[12deg] z-40 pointer-events-none"
            >
              Nope
            </motion.div>

            <div className="space-y-4 flex-grow flex flex-col">
              {/* Header: Title and Match Score */}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  {/* Repo Owner Logo simulation */}
                  <div className="h-10 w-10 rounded-full bg-black border border-dark-border flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm">
                    {activeCard.repository.owner[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary leading-tight hover:underline cursor-pointer">
                      <a href={activeCard.repository.url} target="_blank" rel="noreferrer">
                        {activeCard.repository.owner} / <span className="text-brand-purple">{activeCard.repository.name}</span>
                      </a>
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5 truncate max-w-[280px]">
                      {activeCard.repository.description || 'The open source alternative.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-extrabold flex items-center space-x-1 shrink-0">
                    <Sparkles className="h-3 w-3 fill-current" />
                    <span>{activeCard.matchScore}% Match</span>
                  </span>
                  <button className="p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-all">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Technologies Pills */}
              <div className="flex flex-wrap gap-1.5">
                {activeCard.techTags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-bg-pill text-text-secondary text-[10px] font-semibold border border-dark-border/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description Paragraph */}
              <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                {activeCard.repository.description || 'This repository is looking for new developer contributions to assist with features, bug fixes, and documentation pipelines.'}
              </p>



              {/* Repository Meta Metrics */}
              <div className="flex items-center space-x-4 text-[10px] text-text-tertiary border-b border-dark-border/60 pb-3 font-semibold">
                <div className="flex items-center space-x-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500/20" />
                  <span>{(activeCard.repository.stars / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                  </svg>
                  <span>{(activeCard.repository.stars / 7000).toFixed(1)}k</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className={`h-2 w-2 rounded-full ${getLanguageColor(activeCard.repository.language)}`} />
                  <span>{activeCard.repository.language || 'TypeScript'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="h-3.5 w-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>MIT License</span>
                </div>
              </div>

              {/* README Snippet */}
              {activeCard.repository.readmeText && (
                <div className="relative rounded-xl bg-dark-bg/50 border border-dark-border p-3 max-h-[140px] overflow-hidden text-[11px] text-text-secondary leading-relaxed font-mono">
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-dark-bg/50 to-transparent z-10 pointer-events-none" />
                  {activeCard.repository.readmeText.slice(0, 500)}...
                </div>
              )}

              {/* Good First Issues Subsection */}
              <div className="flex-grow flex flex-col justify-between pt-1">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">Good First Issues</h4>
                      <span className="px-1.5 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple text-[10px] font-bold">
                        {activeCard.issues.length}
                      </span>
                    </div>
                    <Link
                      href="/matches"
                      className="text-[10px] font-bold text-brand-purple hover:underline flex items-center space-x-0.5"
                    >
                      <span>View all issues</span>
                      <span>→</span>
                    </Link>
                  </div>

                  {/* Issues Sub-List */}
                  <div className="space-y-2 overflow-y-auto pr-0.5 flex-grow">
                    {activeCard.issues.slice(0, 5).map((iss, index) => (
                      <a
                        key={iss.id}
                        href={iss.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl bg-bg-pill hover:bg-bg-pill/90 border border-dark-border/40 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center space-x-2.5 truncate mr-4">
                          {/* Index circle */}
                          <div className="h-5 w-5 rounded bg-dark-border/80 text-[10px] font-bold text-text-secondary flex items-center justify-center shrink-0">
                            {index + 1}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-text-primary truncate group-hover:text-brand-purple transition-colors leading-tight">
                              {iss.title}
                            </p>
                            <div className="flex items-center space-x-1.5 mt-1">
                              {iss.labels.slice(0, 2).map(lbl => (
                                <span
                                  key={lbl}
                                  className="px-1.5 py-0.5 rounded bg-dark-card border border-dark-border text-[9px] text-text-tertiary"
                                >
                                  {lbl}
                                </span>
                              ))}
                              <span className="px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green text-[9px] font-bold border border-brand-green/20">
                                Open
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Comments count */}
                        <div className="flex items-center space-x-1 text-text-tertiary shrink-0">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">
                            {Math.floor(Math.random() * 4) + 1}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <p className="text-[9px] text-text-tertiary pt-2">
                  Updated 2 hours ago
                </p>
              </div>
            </div>
          </motion.div>
          </AnimatePresence>
        </div>
        </>
      )}

      {/* Interactive Deck Swipe Control Buttons */}
      {activeCard && (
        <div className="flex items-center justify-center space-x-6 mt-4 relative z-20 w-full">
          {/* Skip Button (Red X) */}
          <button
            onClick={swipeLeft}
            className="w-14 h-14 rounded-full bg-dark-card border border-brand-red/20 flex items-center justify-center text-brand-red hover:bg-brand-red/10 active:scale-95 transition-all shadow-lg glow-red cursor-pointer"
            title="Skip (Left Arrow)"
          >
            <X className="h-6 w-6 stroke-[3px]" />
          </button>

          {/* Info Button (Purple i) */}
          <button
            onClick={() => window.open(activeCard.repository.url, '_blank')}
            className="w-11 h-11 rounded-full bg-dark-card border border-brand-purple/20 flex items-center justify-center text-brand-purple hover:bg-brand-purple/10 active:scale-95 transition-all shadow-md glow-purple cursor-pointer"
            title="Info"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          {/* Contribute Button (Green Heart) */}
          <button
            onClick={swipeRight}
            className="w-14 h-14 rounded-full bg-dark-card border border-brand-green/20 flex items-center justify-center text-brand-green hover:bg-brand-green/10 active:scale-95 transition-all shadow-lg glow-green cursor-pointer"
            title="Contribute (Right Arrow)"
          >
            <Heart className="h-6 w-6 fill-brand-green stroke-[2.5px]" />
          </button>
        </div>
      )}

      {/* Available Projects Counter */}
      {activeCard && (
        <div className="mt-3 text-[11px] font-bold text-brand-purple flex items-center space-x-1.5">
          <span>🎉</span>
          <span>{repoCards.length - currentIndex} new projects available</span>
        </div>
      )}

      {/* Keybind helper */}
      {activeCard && (
        <p className="text-[9px] text-text-tertiary text-center mt-3">
          Tip: Use Arrow keys (← Skip, → Like) and 'S' to Save.
        </p>
      )}
    </div>
  );
}
