import React from 'react';
import { Target, TrendingUp, TrendingDown, Layers, Percent, Zap, AlertCircle } from 'lucide-react';
import type { AccuracyMetrics } from '../types';

interface MetricCardsProps {
  metrics: AccuracyMetrics | null;
  isLoading: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const formatNumber = (num?: number | null, decimals = 1) => {
    if (num === null || num === undefined) return '—';
    return num.toLocaleString('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const isOverforecasting = (metrics.bias || 0) > 0;
  const isUnderforecasting = (metrics.bias || 0) < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. MAE */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">MAE</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(metrics.mae)} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
          Mean Absolute Error per delivery interval
        </div>
      </div>

      {/* 2. RMSE */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition-all" />
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RMSE</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(metrics.rmse)} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
          Penalizes large error deviations
        </div>
      </div>

      {/* 3. Forecast Bias */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Forecast Bias</span>
            {isOverforecasting ? (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            ) : isUnderforecasting ? (
              <TrendingDown className="w-4 h-4 text-cyan-400" />
            ) : (
              <Target className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl font-bold tracking-tight ${
              isOverforecasting ? 'text-amber-400' : isUnderforecasting ? 'text-cyan-400' : 'text-white'
            }`}>
              {(metrics.bias || 0) > 0 ? `+${formatNumber(metrics.bias)}` : formatNumber(metrics.bias)}
            </span>
            <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            isOverforecasting ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
          }`}>
            {isOverforecasting ? 'Overforecasting' : isUnderforecasting ? 'Underforecasting' : 'Neutral'}
          </span>
          <span className="text-[11px] text-slate-400">Bias = F - A</span>
        </div>
      </div>

      {/* 4. Safe MAPE */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all" />
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Safe MAPE</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.mape !== null ? `${formatNumber(metrics.mape)}%` : '—'}
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span>Actuals ≥ 100 MW</span>
          <span className="text-indigo-300 text-[11px] font-mono">N={metrics.mape_sample_count}</span>
        </div>
      </div>

      {/* 5. Matched Coverage */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Matched Coverage</span>
            <div className={`w-2 h-2 rounded-full ${metrics.coverage_percentage >= 99 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(metrics.coverage_percentage, 1)}%
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span>{metrics.matched_intervals} / {metrics.total_delivery_intervals}</span>
          {metrics.missing_forecast_intervals > 0 && (
            <span className="text-amber-400 text-[10px] flex items-center space-x-0.5" title="WINDFOR published hourly">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>{metrics.missing_forecast_intervals} missing</span>
            </span>
          )}
        </div>
      </div>

      {/* 6. Delivered Wind Energy */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
        <div>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Actual Delivered</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatNumber(metrics.total_actual_mwh / 1000, 1)} <span className="text-xs font-normal text-slate-400">GWh</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
          <span>Forecast:</span>
          <span className="text-sky-300 font-mono text-[11px]">{formatNumber(metrics.total_forecast_mwh / 1000, 1)} GWh</span>
        </div>
      </div>
    </div>
  );
};
