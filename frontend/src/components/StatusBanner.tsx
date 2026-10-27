import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import type { DashboardResponse } from '../types';

interface StatusBannerProps {
  dashboard: DashboardResponse | null;
  error: string | null;
  isLoading: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ dashboard, error, isLoading }) => {
  if (error) {
    return (
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-start space-x-3 text-xs text-rose-200 shadow-lg">
        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-rose-300">Data Retrieval Notice: Failed to retrieve data from Elexon BMRS API</div>
          <p className="text-rose-400/90">{error}</p>
          <p className="text-slate-400 text-[11px]">No simulated zeros or fabricated placeholders are displayed.</p>
        </div>
      </div>
    );
  }

  if (isLoading || !dashboard) return null;

  const { data_status, metrics } = dashboard;
  const isPartial = metrics.missing_forecast_intervals > 0;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2">
        <Database className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-slate-300">
          Source: <strong className="text-white">{data_status.source}</strong>
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">
          Evaluated Cutoff: <strong className="text-amber-400">{dashboard.cutoff_description}</strong>
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {isPartial ? (
          <div className="flex items-center space-x-1.5 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Partial resolution: {metrics.matched_intervals} matched / {metrics.missing_forecast_intervals} missing (WINDFOR hourly frequency)
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete dataset coverage (100% matched observations)</span>
          </div>
        )}
      </div>
    </div>
  );
};
