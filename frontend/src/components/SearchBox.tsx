'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useDebounce } from '../hooks/useDebounce';
import { SuggestionDropdown } from './SuggestionDropdown';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SearchBox() {
  const {
    query,
    suggestions,
    isLoadingSuggestions,
    cacheDebug,
    setQuery,
    fetchSuggestions,
    submitSearch,
    clearCacheDebug,
  } = useStore();

  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      fetchSuggestions(debouncedQuery);
    } else {
      clearCacheDebug();
    }
  }, [debouncedQuery, fetchSuggestions, clearCacheDebug]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      setShowDropdown(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > -1 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          const selectedQuery = suggestions[activeIndex].query;
          setQuery(selectedQuery);
          submitSearch(selectedQuery);
          toast.info(`Search submitted: "${selectedQuery}" (queued in batch buffer)`);
        } else {
          submitSearch(query);
          toast.info(`Search submitted: "${query}" (queued in batch buffer)`);
        }
        setShowDropdown(false);
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowDropdown(true);
  };

  const handleSelectSuggestion = (suggestionText: string) => {
    setQuery(suggestionText);
    submitSearch(suggestionText);
    toast.info(`Search submitted: "${suggestionText}" (queued in batch buffer)`);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-50">
      <div className="relative flex items-center w-full h-12 rounded-lg bg-[#0f172a] border border-[#1e293b] px-4 transition-all focus-within:border-[#38bdf8] focus-within:ring-1 focus-within:ring-[#38bdf8]/30">
        <Search className="w-4 h-4 text-[#64748b] mr-3 shrink-0" />
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder="Type to search..."
          className="w-full h-full bg-transparent text-[#f8fafc] placeholder-[#64748b] border-none outline-none text-sm"
        />

        {isLoadingSuggestions && (
          <Loader2 className="w-4 h-4 text-[#64748b] animate-spin mr-3 shrink-0" />
        )}

        {cacheDebug && query.trim() && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#090d16] border border-[#1e293b] text-[10px] font-mono text-[#94a3b8] select-none">
            <span>{cacheDebug.node}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${cacheDebug.cacheHit ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
        )}
      </div>

      {showDropdown && query.trim() && (
        <SuggestionDropdown
          activeIndex={activeIndex}
          onSelect={handleSelectSuggestion}
        />
      )}
    </div>
  );
}
