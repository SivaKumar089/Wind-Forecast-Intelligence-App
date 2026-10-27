import React from 'react';
import { Wind, Activity, Info, ShieldCheck } from 'lucide-react';
import type { HealthResponse } from '../types';

interface HeaderProps {
  health: HealthResponse | null;
  onOpenMethodology: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, onOpenMethodology }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-lg backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and Branding */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Wind Forecast Intelligence
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                UK Day-Ahead Pilot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Elexon BMRS Decision-Support for Wholesale Electricity Market Procurement (January 2026)
            </p>
          </div>
        </div>

        {/* Status Indicators and Controls */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Elexon Live Status Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60">
            <div className={`w-2 h-2 rounded-full ${health?.elexon_api_connected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-300">
              Elexon BMRS: <strong className={health?.elexon_api_connected ? 'text-emerald-400' : 'text-amber-400'}>
                {health?.elexon_api_connected ? 'Connected' : 'Connecting...'}
              </strong>
            </span>
          </div>

          {/* Timezone Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Timezone: <strong className="text-white">UTC / GMT</strong></span>
          </div>

          {/* Audit Integrity Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audit-Verified Gate Closures</span>
          </div>

          {/* Methodology Button */}
          <button
            onClick={onOpenMethodology}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
            title="View Decision Cutoff Methodology and Mathematical Formulations"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="font-medium">Methodology</span>
          </button>
        </div>
      </div>
    </header>
  );
};
