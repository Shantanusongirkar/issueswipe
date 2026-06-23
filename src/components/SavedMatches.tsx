'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, ExternalLink, Trash2, GitPullRequest, GitMerge, CheckCircle, ShieldAlert, Sparkles, Award } from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  stars: number;
  language: string | null;
}

interface Match {
  savedId: string;
  savedAt: string;
  issue: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    number: number;
    difficulty: string;
    estimatedTime: string;
    labels: string[];
    repository: Repository;
    contributionStatus: 'NONE' | 'OPENED' | 'SUBMITTED' | 'MERGED';
    prUrl: string | null;
  };
}

export default function SavedMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Floating XP toasts
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [toastId, setToastId] = useState(0);

  useEffect(() => {
    fetchMatches();
  }, [search, selectedLanguage]);

  async function fetchMatches() {
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (selectedLanguage) q.append('language', selectedLanguage);
      
      const res = await fetch(`/api/matches?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((d: any) => ({
          ...d,
          issue: {
            ...d.issue,
            contributionStatus: d.status === 'pr_opened' ? 'SUBMITTED' : d.status === 'pr_merged' ? 'MERGED' : 'OPENED'
            // wait, if status is 'bookmarked', it should be 'OPENED' so that the user can click "Submit PR"
            // Wait, in the UI:
            // if OPENED -> button "Submit PR" -> sets 'SUBMITTED'
            // if SUBMITTED -> button "Merge PR" -> sets 'MERGED'
          }
        }));
        // Actually, let's look at the mapping carefully:
        // status='bookmarked' -> contributionStatus='OPENED'
        // status='pr_opened' -> contributionStatus='SUBMITTED'
        // status='pr_merged' -> contributionStatus='MERGED'
        const finalData = data.map((d: any) => {
          let cStatus = 'NONE';
          if (d.status === 'bookmarked') cStatus = 'OPENED';
          else if (d.status === 'pr_opened') cStatus = 'SUBMITTED';
          else if (d.status === 'pr_merged') cStatus = 'MERGED';
          return { ...d, issue: { ...d.issue, contributionStatus: cStatus } };
        });
        setMatches(finalData);
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  }

  const triggerXpToast = (xpGained: number) => {
    const id = toastId;
    setToastId((prev) => prev + 1);
    setToasts((prev) => [...prev, { id, text: `+${xpGained} XP!` }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1500);
  };

  const handleRemoveMatch = async (issueId: string) => {
    try {
      const res = await fetch('/api/matches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId }),
      });

      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.issue.id !== issueId));
        window.dispatchEvent(new Event('pathnameChange'));
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  const handleUpdateContribution = async (issueId: string, status: 'SUBMITTED' | 'MERGED') => {
    try {
      const mockPrUrl = `https://github.com/simulated-pr-${Math.floor(Math.random() * 10000)}`;
      const apiStatus = status === 'SUBMITTED' ? 'pr_opened' : 'pr_merged';
      const res = await fetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, status: apiStatus, prUrl: mockPrUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setMatches((prev) =>
          prev.map((m) =>
            m.issue.id === issueId
              ? { ...m, issue: { ...m.issue, contributionStatus: status, prUrl: mockPrUrl } }
              : m
          )
        );

        if (status === 'SUBMITTED') {
          triggerXpToast(100);
        } else if (status === 'MERGED') {
          triggerXpToast(250);
        }
        
        window.dispatchEvent(new Event('pathnameChange'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const languagesList = Array.from(
    new Set(
      matches
        .map((m) => m.issue.repository.language)
        .filter((lang): lang is string => !!lang)
    )
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 relative select-none">
      {/* Floating XP Toasts */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1.2 }}
              exit={{ opacity: 0, y: -40 }}
              className="flex items-center space-x-1 px-4 py-2 rounded-full bg-brand-green text-white text-sm font-black shadow-lg"
            >
              <Award className="h-4 w-4" />
              <span>{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Saved Matches</h2>
          <p className="text-xs font-semibold text-text-secondary mt-1">Review saved issues and track contribution workflow.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search saved issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-pill text-xs text-text-primary border border-dark-border focus:border-brand-purple outline-none transition-colors"
          />
        </div>
      </div>

      {/* Language Filter Pills */}
      {languagesList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] font-bold text-text-secondary mr-1">Language:</span>
          <button
            onClick={() => setSelectedLanguage('')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              selectedLanguage === ''
                ? 'bg-bg-highlight border-brand-purple/20 text-brand-purple'
                : 'bg-dark-card border-dark-border text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
          {languagesList.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                selectedLanguage === lang
                  ? 'bg-bg-highlight border-brand-purple/20 text-brand-purple'
                  : 'bg-dark-card border-dark-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      )}

      {/* Matches Grid/List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-premium rounded-2xl h-32 animate-pulse bg-bg-pill/40" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-12 text-center space-y-4">
          <div className="p-4 rounded-full bg-bg-pill w-fit mx-auto border border-dark-border">
            <ShieldAlert className="h-6 w-6 text-text-tertiary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-text-primary">No saved matches found</p>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              Go back to the swipe feed to find and save issues, or adjust your active filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {matches.map((match) => (
              <motion.div
                key={match.savedId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-dark-card rounded-2xl p-5 border border-dark-border hover:border-brand-purple/20 transition-all flex flex-col md:flex-row justify-between gap-6"
              >
                {/* Details Section */}
                <div className="space-y-2.5 flex-grow max-w-2xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider">
                      {match.issue.repository.owner} / {match.issue.repository.name}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-text-tertiary opacity-45" />
                    <span className="text-[10px] text-text-tertiary font-medium">
                      Saved {new Date(match.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-text-primary hover:text-brand-purple transition-colors leading-snug">
                    <a href={match.issue.url} target="_blank" rel="noreferrer" className="flex items-center space-x-1">
                      <span>#{match.issue.number} {match.issue.title}</span>
                      <ExternalLink className="h-3 w-3 inline text-text-tertiary shrink-0" />
                    </a>
                  </h3>

                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {match.issue.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-2">
                    {match.issue.repository.language && (
                      <span className="px-2 py-0.5 rounded bg-bg-pill text-text-secondary text-[10px] font-bold border border-dark-border/40">
                        {match.issue.repository.language}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue text-[10px] font-bold border border-brand-blue/20">
                      {match.issue.difficulty}
                    </span>
                    <div className="flex items-center space-x-1 text-[10px] text-text-tertiary pl-2 font-medium">
                      <Star className="h-3.5 w-3.5 fill-yellow-500/10 text-yellow-500" />
                      <span>{(match.issue.repository.stars / 1000).toFixed(1)}k stars</span>
                    </div>
                  </div>
                </div>

                {/* Workflow Controller Section */}
                <div className="flex flex-col justify-between items-end gap-4 shrink-0 md:border-l md:border-dark-border md:pl-6">
                  {/* Status Indicator */}
                  <div className="text-right">
                    <span className="text-[9px] text-text-tertiary uppercase tracking-wider block font-bold">Contribution Status</span>
                    {match.issue.contributionStatus === 'OPENED' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold mt-1.5">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>Opened</span>
                      </span>
                    )}
                    {match.issue.contributionStatus === 'SUBMITTED' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-bold mt-1.5">
                        <GitPullRequest className="h-3 w-3" />
                        <span>PR Submitted</span>
                      </span>
                    )}
                    {match.issue.contributionStatus === 'MERGED' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold mt-1.5">
                        <GitMerge className="h-3 w-3" />
                        <span>PR Merged</span>
                      </span>
                    )}
                    {match.issue.contributionStatus === 'NONE' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-bg-pill text-text-secondary text-[10px] font-bold mt-1.5 border border-dark-border/40">
                        <span>Bookmarked</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    {/* Remove Bookmark Button */}
                    <button
                      onClick={() => handleRemoveMatch(match.issue.id)}
                      className="p-2 rounded-lg border border-dark-border text-text-secondary hover:text-brand-red hover:bg-brand-red/10 hover:border-brand-red/20 transition-all cursor-pointer shadow-sm"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Submit PR Button */}
                    {match.issue.contributionStatus === 'OPENED' && (
                      <button
                        onClick={() => handleUpdateContribution(match.issue.id, 'SUBMITTED')}
                        className="flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <GitPullRequest className="h-3.5 w-3.5" />
                        <span>Submit PR (+100 XP)</span>
                      </button>
                    )}

                    {/* Mark Merged Button */}
                    {match.issue.contributionStatus === 'SUBMITTED' && (
                      <button
                        onClick={() => handleUpdateContribution(match.issue.id, 'MERGED')}
                        className="flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-brand-green text-white hover:bg-brand-green/90 text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Merge PR (+250 XP)</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
