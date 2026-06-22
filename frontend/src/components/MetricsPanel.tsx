'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { BarChart3, RefreshCw, Play, Layers, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export function MetricsPanel() {
  const {
    metrics,
    cacheStats,
    isSimulating,
    isIngesting,
    cacheDebug,
    fetchMetrics,
    fetchCacheStats,
    loadDataset,
    simulateWorkload,
    toggleCacheNode
  } = useStore();

  const [activeTab, setActiveTab] = useState<'Cache-A' | 'Cache-B' | 'Cache-C'>('Cache-A');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleToggleNode = async (node: string, nextOnline: boolean) => {
    const promise = toggleCacheNode(node, nextOnline);
    toast.promise(promise, {
      loading: `${nextOnline ? 'Restoring' : 'Terminating'} ${node} cache partition...`,
      success: `${node} is now ${nextOnline ? 'Online' : 'Offline'}!`,
      error: (err) => err?.response?.data?.error || err?.message || `Failed to toggle ${node}`
    });
    try {
      await promise;
    } catch (e) {}
  };

  useEffect(() => {
    fetchMetrics();
    fetchCacheStats();
    const interval = setInterval(() => {
      fetchMetrics();
      fetchCacheStats();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchCacheStats]);

  const handleIngest = async () => {
    if (confirm('Re-ingest the 150,000 rows ORCAS dataset into MongoDB?')) {
      const promise = loadDataset();
      toast.promise(promise, {
        loading: 'Ingesting ORCAS dataset and clearing caches...',
        success: (count) => `Loaded ${count.toLocaleString()} unique real-world queries successfully!`,
        error: 'Failed to load ORCAS dataset.'
      });
      await promise;
    }
  };

  const handleSimulate = async (requests: number) => {
    const promise = simulateWorkload(requests);
    toast.promise(promise, {
      loading: `Running high-throughput simulation of ${requests} requests...`,
      success: (data) => `Simulated ${requests} search requests in ${data.durationMs}ms!`,
      error: 'Simulation failed.'
    });
    await promise;
  };

  const nodeStats = cacheStats?.[activeTab];
  const cachedSuggestions = selectedKey && nodeStats?.data?.[selectedKey]?.value;

  // Hashing Ring Node Coordinate Calculations (Center 100,100, Radius 70)
  // Cache-A: 210 degrees
  const xa = parseFloat((100 + 70 * Math.cos((210 * Math.PI) / 180)).toFixed(3));
  const ya = parseFloat((100 + 70 * Math.sin((210 * Math.PI) / 180)).toFixed(3));

  // Cache-B: 330 degrees
  const xb = parseFloat((100 + 70 * Math.cos((330 * Math.PI) / 180)).toFixed(3));
  const yb = parseFloat((100 + 70 * Math.sin((330 * Math.PI) / 180)).toFixed(3));

  // Cache-C: 90 degrees
  const xc = parseFloat((100 + 70 * Math.cos((90 * Math.PI) / 180)).toFixed(3));
  const yc = parseFloat((100 + 70 * Math.sin((90 * Math.PI) / 180)).toFixed(3));

  // Determine which node is highlighted by current search debug routing
  const activeNodeBySearch = cacheDebug?.node;

  const isOnlineA = cacheStats?.['Cache-A']?.online !== false;
  const isOnlineB = cacheStats?.['Cache-B']?.online !== false;
  const isOnlineC = cacheStats?.['Cache-C']?.online !== false;

  return (
    <div className="panel-premium p-5 w-full flex flex-col gap-5">
      {/* Panel Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#38bdf8]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">Live Telemetry</h2>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleIngest}
            disabled={isIngesting || isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090d16] border border-[#1e293b] hover:border-[#475569] text-xs font-semibold text-[#cbd5e1] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
            {isIngesting ? 'Loading...' : 'Ingest 150K'}
          </button>
          
          <button
            onClick={() => handleSimulate(500)}
            disabled={isIngesting || isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/20 hover:border-[#38bdf8] text-xs font-semibold text-[#38bdf8] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            {isSimulating ? 'Simulating...' : 'Simulate 500'}
          </button>
        </div>
      </div>

      {/* Grid Analytics Metrics with Custom Tooltips */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-lg bg-[#090d16] border border-[#1e293b] relative group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748b]">Cache Hit Rate</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#475569] hover:text-[#94a3b8] cursor-help" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[10px] text-[#cbd5e1] leading-relaxed shadow-lg hidden group-hover:block z-50 pointer-events-none">
              Percentage of autocomplete queries served directly from Redis/Node Cache partitions instead of querying MongoDB.
            </div>
          </div>
          <div className="text-xl font-bold text-white">{metrics?.cacheHitRate || '0.0%'}</div>
          <div className="text-[9px] text-[#64748b] font-mono mt-1">
            Hits: {metrics?.cacheHits || 0} | Misses: {metrics?.cacheMisses || 0}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-lg bg-[#090d16] border border-[#1e293b] relative group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748b]">Avg / P95 Latency</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#475569] hover:text-[#94a3b8] cursor-help" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[10px] text-[#cbd5e1] leading-relaxed shadow-lg hidden group-hover:block z-50 pointer-events-none">
              Autocomplete lookups return in sub-milliseconds, while database lookups and writes take longer, affecting the P95 latency limit.
            </div>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics?.avgLatencyMs || '0ms'} <span className="text-xs font-normal text-[#64748b]">/ {metrics?.p95LatencyMs || '0ms'}</span>
          </div>
          <div className="text-[9px] text-[#64748b] font-mono mt-1">
            Total queries: {metrics?.totalRequests || 0}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-lg bg-[#090d16] border border-[#1e293b] relative group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748b]">DB operations (R/W)</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#475569] hover:text-[#94a3b8] cursor-help" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[10px] text-[#cbd5e1] leading-relaxed shadow-lg hidden group-hover:block z-50 pointer-events-none">
              Total reads (triggered by cache misses) and updates/inserts executed on MongoDB (consolidated via our background batch buffer).
            </div>
          </div>
          <div className="text-xl font-bold text-white">
            {metrics?.dbReads || 0} <span className="text-xs font-normal text-[#64748b]">/ {metrics?.dbWrites || 0}</span>
          </div>
          <div className="text-[9px] text-[#64748b] font-mono mt-1">
            Bulk Batch Flushes: {metrics?.batchFlushCount || 0}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-lg bg-[#090d16] border border-[#1e293b] relative group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748b]">Writes Reduction</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#475569] hover:text-[#94a3b8] cursor-help" />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 rounded bg-[#0f172a] border border-[#1e293b] text-[10px] text-[#cbd5e1] leading-relaxed shadow-lg hidden group-hover:block z-50 pointer-events-none">
              The percentage of database write operations saved by aggregating individual user searches in-memory before bulk updating.
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-400">{metrics?.writeReductionPercent || '0.0%'}</div>
          <div className="text-[9px] text-[#64748b] font-mono mt-1">
            Aggregated writes saved: {(metrics?.writesSaved || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Cache Partition Inspector & Hashing Ring Row */}
      <div className="border border-[#1e293b] rounded-lg overflow-hidden bg-[#090d16]">
        <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between text-xs bg-[#0f172a]">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="font-semibold text-[#cbd5e1]">Consistent Hash Ring Segments</span>
          </div>
          <span className="text-[10px] text-[#64748b] font-mono select-none">Nodes: 3 | virtual: 150</span>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-stretch">
          {/* Hashing Ring SVG Visualizer */}
          <div className="p-5 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#1e293b] bg-[#0c101b] select-none w-full lg:w-auto shrink-0">
            <svg width="200" height="200" className="relative">
              {/* Outer Hash Ring circle */}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Draw 24 virtual node micro-dots along the ring */}
              {Array.from({ length: 24 }).map((_, idx) => {
                const angle = (idx * 360) / 24;
                const dotX = parseFloat((100 + 70 * Math.cos((angle * Math.PI) / 180)).toFixed(3));
                const dotY = parseFloat((100 + 70 * Math.sin((angle * Math.PI) / 180)).toFixed(3));
                return (
                  <circle
                    key={idx}
                    cx={dotX}
                    cy={dotY}
                    r="1.5"
                    fill={
                      idx % 3 === 0 ? '#ef4444' : idx % 3 === 1 ? '#3b82f6' : '#10b981'
                    }
                    opacity="0.3"
                  />
                );
              })}

              {/* Route Indicator: line pointing to the active node handling current autocomplete query */}
              {activeNodeBySearch && (
                <line
                  x1="100"
                  y1="100"
                  x2={
                    activeNodeBySearch === 'Cache-A'
                      ? xa
                      : activeNodeBySearch === 'Cache-B'
                      ? xb
                      : xc
                  }
                  y2={
                    activeNodeBySearch === 'Cache-A'
                      ? ya
                      : activeNodeBySearch === 'Cache-B'
                      ? yb
                      : yc
                  }
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  className="animate-pulse"
                />
              )}

              {/* Center Ring badge */}
              <circle cx="100" cy="100" r="24" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
              <text
                x="100"
                y="103"
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="#64748b"
                className="font-mono uppercase"
              >
                {activeNodeBySearch ? activeNodeBySearch.slice(-1) : 'RING'}
              </text>

              {/* Physical Cache-A Node */}
              <g className="cursor-pointer" onClick={() => setActiveTab('Cache-A')}>
                {/* Active glow */}
                {isOnlineA && (activeTab === 'Cache-A' || activeNodeBySearch === 'Cache-A') && (
                  <circle
                    cx={xa}
                    cy={ya}
                    r="18"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1"
                    className="animate-ping opacity-35"
                  />
                )}
                <circle
                  cx={xa}
                  cy={ya}
                  r="13"
                  fill={isOnlineA ? '#ef4444' : '#1e293b'}
                  fillOpacity={isOnlineA ? (activeTab === 'Cache-A' ? '1' : '0.15') : '0.1'}
                  stroke={isOnlineA ? '#ef4444' : '#475569'}
                  strokeWidth="1.5"
                  strokeDasharray={isOnlineA ? undefined : '3,3'}
                />
                <text
                  x={xa}
                  y={ya + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill={isOnlineA ? (activeTab === 'Cache-A' ? '#ffffff' : '#ef4444') : '#64748b'}
                  className="font-mono"
                >
                  A
                </text>
              </g>

              {/* Physical Cache-B Node */}
              <g className="cursor-pointer" onClick={() => setActiveTab('Cache-B')}>
                {/* Active glow */}
                {isOnlineB && (activeTab === 'Cache-B' || activeNodeBySearch === 'Cache-B') && (
                  <circle
                    cx={xb}
                    cy={yb}
                    r="18"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    className="animate-ping opacity-35"
                  />
                )}
                <circle
                  cx={xb}
                  cy={yb}
                  r="13"
                  fill={isOnlineB ? '#3b82f6' : '#1e293b'}
                  fillOpacity={isOnlineB ? (activeTab === 'Cache-B' ? '1' : '0.15') : '0.1'}
                  stroke={isOnlineB ? '#3b82f6' : '#475569'}
                  strokeWidth="1.5"
                  strokeDasharray={isOnlineB ? undefined : '3,3'}
                />
                <text
                  x={xb}
                  y={yb + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill={isOnlineB ? (activeTab === 'Cache-B' ? '#ffffff' : '#3b82f6') : '#64748b'}
                  className="font-mono"
                >
                  B
                </text>
              </g>

              {/* Physical Cache-C Node */}
              <g className="cursor-pointer" onClick={() => setActiveTab('Cache-C')}>
                {/* Active glow */}
                {isOnlineC && (activeTab === 'Cache-C' || activeNodeBySearch === 'Cache-C') && (
                  <circle
                    cx={xc}
                    cy={yc}
                    r="18"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    className="animate-ping opacity-35"
                  />
                )}
                <circle
                  cx={xc}
                  cy={yc}
                  r="13"
                  fill={isOnlineC ? '#10b981' : '#1e293b'}
                  fillOpacity={isOnlineC ? (activeTab === 'Cache-C' ? '1' : '0.15') : '0.1'}
                  stroke={isOnlineC ? '#10b981' : '#475569'}
                  strokeWidth="1.5"
                  strokeDasharray={isOnlineC ? undefined : '3,3'}
                />
                <text
                  x={xc}
                  y={yc + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill={isOnlineC ? (activeTab === 'Cache-C' ? '#ffffff' : '#10b981') : '#64748b'}
                  className="font-mono"
                >
                  C
                </text>
              </g>
            </svg>
          </div>

          {/* Tabs and Data Explorer */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="flex border-b border-[#1e293b] bg-[#0f172a]/40">
              {(['Cache-A', 'Cache-B', 'Cache-C'] as const).map((node) => {
                const size = cacheStats?.[node]?.size || 0;
                const isOnline = cacheStats?.[node]?.online !== false;
                const nodeColor =
                  node === 'Cache-A'
                    ? 'border-[#ef4444] text-[#ef4444]'
                    : node === 'Cache-B'
                    ? 'border-[#3b82f6] text-[#3b82f6]'
                    : 'border-[#10b981] text-[#10b981]';
                return (
                  <button
                    key={node}
                    onClick={() => {
                      setActiveTab(node);
                      setSelectedKey(null);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
                      activeTab === node
                        ? `${nodeColor} bg-[#090d16]/30`
                        : 'border-transparent text-[#64748b] hover:text-[#cbd5e1]'
                    } ${!isOnline ? 'opacity-40' : ''}`}
                  >
                    {node} <span className="font-mono text-[9px] text-gray-500 font-normal">{isOnline ? `(${size})` : '(OFFLINE)'}</span>
                  </button>
                );
              })}
            </div>

            {/* Key-Value Explorer Panel */}
            <div className="grid grid-cols-2 h-[160px] text-xs">
              {/* Key list */}
              <div className="border-r border-[#1e293b] overflow-y-auto p-2 bg-[#090d16] scroll-premium">
                {!nodeStats || nodeStats.keys.length === 0 ? (
                  <div className="text-[10px] text-[#64748b] italic p-3 text-center">
                    No active cache keys.
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {nodeStats.keys.map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={`px-2 py-1.5 rounded text-left font-mono text-[10px] transition-colors cursor-pointer ${
                          selectedKey === key
                            ? 'bg-[#1e293b] text-[#38bdf8]'
                            : 'hover:bg-[#1e293b]/40 text-[#94a3b8]'
                        }`}
                      >
                        prefix: &ldquo;{key}&rdquo;
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details / Values for selected key */}
              <div className="overflow-y-auto p-3 bg-[#0f172a]/20 scroll-premium">
                {!selectedKey ? (
                  <div className="flex items-center justify-center h-full text-[10px] text-[#64748b] text-center px-4">
                    Select a cached prefix on the left to inspect its typeahead suggestions payload.
                  </div>
                ) : !cachedSuggestions || cachedSuggestions.length === 0 ? (
                  <div className="text-[10px] text-[#64748b] italic">Empty payload.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-mono text-[#38bdf8] border-b border-[#1e293b] pb-1.5">
                      Prefix q: &ldquo;{selectedKey}&rdquo;
                    </div>
                    <div className="flex flex-col gap-1">
                      {cachedSuggestions.slice(0, 5).map((sug, i) => (
                        <div 
                          key={sug.query} 
                          className="flex justify-between items-center px-2 py-1 rounded bg-[#090d16] border border-[#1e293b] text-[10px] font-mono text-[#cbd5e1]"
                        >
                          <span className="truncate max-w-[100px]">{i + 1}. {sug.query}</span>
                          <span className="text-[#38bdf8] font-semibold">{Math.round(sug.score)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Chaos Control Deck */}
        <div className="border-t border-[#1e293b] p-3 bg-[#0c101b]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-[#64748b]">
          <div className="flex items-center gap-1 select-none">
            <span className="uppercase font-bold tracking-wider text-[#94a3b8]">Chaos Control Deck:</span>
            <span className="text-[9px] text-[#475569]">(Simulate node failover and recovery)</span>
          </div>
          <div className="flex gap-4">
            {(['Cache-A', 'Cache-B', 'Cache-C'] as const).map((node) => {
              const isOnline = cacheStats?.[node]?.online !== false;
              const color =
                node === 'Cache-A'
                  ? 'text-[#ef4444]'
                  : node === 'Cache-B'
                  ? 'text-[#3b82f6]'
                  : 'text-[#10b981]';
              return (
                <div key={node} className="flex items-center gap-1.5">
                  <span className={`font-semibold ${color}`}>{node}</span>
                  <button
                    onClick={() => handleToggleNode(node, !isOnline)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide cursor-pointer transition-colors ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    }`}
                  >
                    {isOnline ? 'KILL' : 'RESTORE'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
