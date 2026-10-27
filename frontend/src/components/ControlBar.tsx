import React from 'react';
import { Calendar, Clock, RefreshCw, Filter } from 'lucide-react';
import type { CutoffConfig } from '../types';

interface ControlBarProps {
  dateFrom: string;
  dateTo: string;
  cutoffConfig: CutoffConfig;
  granularity: string;
  isLoading: boolean;
  onDateChange: (from: string, to: string) => void;
  onCutoffChange: (config: CutoffConfig) => void;
  onGranularityChange: (granularity: string) => void;
  onRefresh: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  dateFrom,
  dateTo,
  cutoffConfig,
  granularity,
  isLoading,
  onDateChange,
  onCutoffChange,
  onGranularityChange,
  onRefresh,
}) => {
  const datePresets = [
    { label: 'Jan 1–7 (W1)', from: '2026-01-01', to: '2026-01-07' },
    { label: 'Jan 8–14 (W2)', from: '2026-01-08', to: '2026-01-14' },
    { label: 'Jan 15–21 (W3)', from: '2026-01-15', to: '2026-01-21' },
    { label: 'Jan 22–31 (W4)', from: '2026-01-22', to: '2026-01-31' },
    { label: 'Full Jan 2026', from: '2026-01-01', to: '2026-01-31' },
  ];

  // Map cutoff presets
  const handleCutoffPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'da_1100') {
      onCutoffChange({ cutoff_type: 'day_ahead', cutoff_time: '11:00' });
    } else if (val === 'da_1200') {
      onCutoffChange({ cutoff_type: 'day_ahead', cutoff_time: '12:00' });
    } else if (val === 'da_1700') {
      onCutoffChange({ cutoff_type: 'day_ahead', cutoff_time: '17:00' });
    } else if (val === 'rolling_4') {
      onCutoffChange({ cutoff_type: 'rolling_hours', rolling_hours: 4.0 });
    } else if (val === 'rolling_2') {
      onCutoffChange({ cutoff_type: 'rolling_hours', rolling_hours: 2.0 });
    }
  };

  const getCutoffSelectValue = () => {
    if (cutoffConfig.cutoff_type === 'day_ahead') {
      if (cutoffConfig.cutoff_time === '11:00') return 'da_1100';
      if (cutoffConfig.cutoff_time === '12:00') return 'da_1200';
      if (cutoffConfig.cutoff_time === '17:00') return 'da_1700';
      return 'custom_da';
    } else if (cutoffConfig.cutoff_type === 'rolling_hours') {
      if (cutoffConfig.rolling_hours === 4) return 'rolling_4';
      if (cutoffConfig.rolling_hours === 2) return 'rolling_2';
      return 'custom_rolling';
    }
    return 'da_1100';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm space-y-4">
      {/* Top Row: Presets & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Date Presets */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-emerald-400 hidden sm:block" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
            Target Windows:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {datePresets.map((p) => {
              const active = dateFrom === p.from && dateTo === p.to;
              return (
                <button
                  key={p.label}
                  onClick={() => onDateChange(p.from, p.to)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Granularity Toggle */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs text-slate-400">Resolution:</span>
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700/60">
            <button
              onClick={() => onGranularityChange('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                granularity === 'all'
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="All 48 Half-Hourly Settlement Periods (50% raw coverage as WINDFOR is published hourly)"
            >
              All 48 HH/Day
            </button>
            <button
              onClick={() => onGranularityChange('hourly')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                granularity === 'hourly'
                  ? 'bg-sky-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="24 Hourly Settlement Periods matching WINDFOR forecast intervals (100% matched coverage)"
            >
              Hourly (WINDFOR)
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Detailed Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
        {/* Date From */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-slate-400">Delivery Start Date</label>
          <input
            type="date"
            value={dateFrom}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => onDateChange(e.target.value, dateTo)}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-slate-400">Delivery End Date</label>
          <input
            type="date"
            value={dateTo}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => onDateChange(dateFrom, e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Decision Cutoff Selector */}
        <div className="flex flex-col space-y-1">
          <label className="text-xs font-medium text-slate-400 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Decision Gate Closure Cutoff</span>
          </label>
          <select
            value={getCutoffSelectValue()}
            onChange={handleCutoffPresetChange}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="da_1100">D-1 11:00 GMT (GB Day-Ahead Auction)</option>
            <option value="da_1200">D-1 12:00 GMT (Harmonized Auction)</option>
            <option value="da_1700">D-1 17:00 GMT (Evening Rebalancing)</option>
            <option value="rolling_4">Rolling 4 Hours Ahead (Intraday)</option>
            <option value="rolling_2">Rolling 2 Hours Ahead (Near-Delivery)</option>
          </select>
        </div>

        {/* Refresh Action */}
        <div className="flex items-end">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2 px-4 rounded-lg transition-colors shadow-lg shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Retrieving Elexon...' : 'Update Analysis'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
