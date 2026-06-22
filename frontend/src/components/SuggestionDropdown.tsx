'use client';

import React from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SuggestionDropdownProps {
  activeIndex: number;
  onSelect: (query: string) => void;
}

export function SuggestionDropdown({ activeIndex, onSelect }: SuggestionDropdownProps) {
  const { suggestions, query } = useStore();

  if (suggestions.length === 0) {
    return (
      <div className="absolute top-13 left-0 right-0 rounded-lg bg-[#0f172a] border border-[#1e293b] p-4 text-center text-[#64748b] text-xs z-50">
        No results found for &ldquo;<span className="text-[#f1f5f9] font-medium">{query}</span>&rdquo;
      </div>
    );
  }

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight) return <span className="text-[#e2e8f0]">{text}</span>;
    
    const highlightLength = highlight.length;
    if (text.toLowerCase().startsWith(highlight.toLowerCase())) {
      const matchPart = text.substring(0, highlightLength);
      const remainingPart = text.substring(highlightLength);
      return (
        <span>
          <span className="text-[#38bdf8] font-semibold">{matchPart}</span>
          <span className="text-[#e2e8f0]">{remainingPart}</span>
        </span>
      );
    }
    
    return <span className="text-[#e2e8f0]">{text}</span>;
  };

  return (
    <ul className="absolute top-13 left-0 right-0 rounded-lg bg-[#0f172a] border border-[#1e293b] shadow-xl overflow-hidden py-1.5 z-50 max-h-[300px] overflow-y-auto scroll-premium">
      {suggestions.map((item, index) => (
        <li
          key={item.query}
          onClick={() => onSelect(item.query)}
          className={`flex items-center justify-between px-4 py-2 cursor-pointer text-xs transition-colors ${
            index === activeIndex
              ? 'bg-[#1e293b] text-white border-l-2 border-[#38bdf8] pl-3.5'
              : 'hover:bg-[#1e293b]/50 text-[#cbd5e1]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {item.recentCount > 0 ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 text-[#475569] shrink-0" />
            )}
            <span className="truncate font-medium">
              {highlightMatch(item.query, query)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[9px] font-mono text-[#64748b] select-none shrink-0 ml-4">
            <span>Vol: {item.count.toLocaleString()}</span>
            {item.recentCount > 0 && (
              <span className="text-amber-500 bg-amber-500/10 px-1 rounded">Trending</span>
            )}
            <span className="text-[#94a3b8] font-bold">Score: {Math.round(item.score).toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
