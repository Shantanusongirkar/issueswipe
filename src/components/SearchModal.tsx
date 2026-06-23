'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Folder, FileText, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({ repositories: [], issues: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ repositories: [], issues: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-dark-border">
          <Search className="h-5 w-5 text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, issues, keywords..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary px-4 placeholder:text-text-tertiary"
          />
          {loading && <div className="h-4 w-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />}
          <button 
            onClick={() => setIsOpen(false)}
            className="ml-2 p-1 rounded-md text-text-tertiary hover:bg-bg-pill hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length > 0 && !loading && results.repositories.length === 0 && results.issues.length === 0 ? (
            <p className="text-center text-sm text-text-tertiary py-8">No results found for "{query}"</p>
          ) : null}

          {results.repositories.length > 0 && (
            <div className="mb-4">
              <h3 className="px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 mt-2">Repositories</h3>
              {results.repositories.map((repo: any) => (
                <div 
                  key={repo.id}
                  onClick={() => {
                    setIsOpen(false);
                    // For now, redirect to swipe or matches, normally would redirect to repo detail
                    router.push('/matches'); 
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-bg-pill cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">{repo.fullName}</p>
                      <p className="text-[10px] text-text-tertiary truncate max-w-sm">{repo.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {results.issues.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 mt-2">Issues</h3>
              {results.issues.map((issue: any) => (
                <div 
                  key={issue.id}
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/matches');
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-bg-pill cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary truncate max-w-[280px] sm:max-w-sm">{issue.title}</p>
                      <p className="text-[10px] text-text-tertiary">{issue.repository.fullName} • #{issue.githubNumber}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {query.trim().length === 0 && (
            <div className="py-8 text-center text-text-tertiary">
              <p className="text-xs">Start typing to search for open source projects</p>
              <div className="mt-4 flex justify-center space-x-2">
                <span className="px-2 py-1 rounded bg-bg-pill border border-dark-border/60 text-[10px] font-bold">react</span>
                <span className="px-2 py-1 rounded bg-bg-pill border border-dark-border/60 text-[10px] font-bold">python</span>
                <span className="px-2 py-1 rounded bg-bg-pill border border-dark-border/60 text-[10px] font-bold">good first issue</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
