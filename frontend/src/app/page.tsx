'use client';

import React from 'react';
import { SearchBox } from '../components/SearchBox';
import { TrendingSection } from '../components/TrendingSection';
import { MetricsPanel } from '../components/MetricsPanel';
import { useStore } from '../store/useStore';
import { AlertCircle, Terminal, Database, Server } from 'lucide-react';

export default function Home() {
  const { error, apiOnline, dbConnected } = useStore();

  return (
    <main className="min-h-screen bg-[#090d16] text-[#f1f5f9] px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-[#1e293b] pb-6">
          <div className="flex items-center gap-3 select-none">
            <div className="p-2 bg-[#1e293b] rounded-lg border border-[#334155]">
              <Terminal className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Autocomplete System</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs select-none">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0f172a] border transition-colors ${
              apiOnline ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'
            }`}>
              <Server className={`w-3.5 h-3.5 ${apiOnline ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className="font-mono">API: {apiOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0f172a] border transition-colors ${
              dbConnected ? 'border-cyan-500/20 text-cyan-400' : 'border-red-500/20 text-red-400'
            }`}>
              <Database className={`w-3.5 h-3.5 ${dbConnected ? 'text-cyan-500' : 'text-red-500'}`} />
              <span className="font-mono">DB: {dbConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-950/20 border border-red-900/30 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Main Autocomplete Search Bar */}
        <section className="py-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-xl text-center mb-6">
            <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Search Input</h2>
            <p className="text-xs text-[#64748b]">Type to query 109,600 preloaded terms using prefix routing</p>
          </div>
          <SearchBox />
        </section>

        {/* Structured Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Trending Section */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <TrendingSection />
          </div>

          {/* Right Column: Telemetry & Observability */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <MetricsPanel />
          </div>

        </div>

      </div>
    </main>
  );
}
