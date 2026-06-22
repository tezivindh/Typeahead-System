'use client';

import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Flame } from 'lucide-react';
import { toast } from 'sonner';

export function TrendingSection() {
  const { trending, fetchTrending, setQuery, submitSearch } = useStore();

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleTrendClick = (queryText: string) => {
    setQuery(queryText);
    submitSearch(queryText);
    toast.info(`Search submitted for trending: "${queryText}"`);
  };

  return (
    <div className="panel-premium p-5 w-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e293b]">
        <Flame className="w-4 h-4 text-amber-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">Trending Queries</h2>
      </div>

      {trending.length === 0 ? (
        <div className="text-center py-6 text-xs text-[#64748b]">
          No trending queries found. Ingest the dataset or type search queries to populate.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {trending.slice(0, 8).map((item, index) => {
            const isHot = item.recentCount > 0;
            return (
              <button
                key={item.query}
                onClick={() => handleTrendClick(item.query)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors border text-left cursor-pointer ${
                  isHot
                    ? 'bg-amber-500/5 text-amber-300 border-amber-500/20 hover:border-amber-500/40'
                    : 'bg-[#090d16] text-[#cbd5e1] border-[#1e293b] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#475569] font-mono text-[9px]">#0{index + 1}</span>
                  <span className="truncate font-medium">{item.query}</span>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {isHot && (
                    <span className="text-[8px] font-mono uppercase bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                      Hot
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-[#64748b] bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#1e293b]">
                    Score: {Math.round(item.score).toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
