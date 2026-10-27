import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { ForecastHistoryResponse, CutoffConfig } from '../types';
import { fetchForecastHistory } from '../services/api';

interface HistoryModalProps {
  deliveryTime: string | null;
  cutoffConfig: CutoffConfig;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  deliveryTime,
  cutoffConfig,
  onClose,
}) => {
  const [history, setHistory] = useState<ForecastHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryTime) return;

    setLoading(true);
    setError(null);
    fetchForecastHistory(deliveryTime, cutoffConfig)
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load publication history');
        setLoading(false);
      });
  }, [deliveryTime, cutoffConfig]);

  if (!deliveryTime) return null;

  const formatDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Forecast Publication History Audit</h3>
              <p className="text-xs text-slate-400">
                Auditing all published snapshots for delivery interval: <strong className="text-slate-200">{formatDateTime(deliveryTime)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Fetching forecast publication snapshots from Elexon...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : history ? (
            <>
              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 font-medium">Actual Generation</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                    {history.actual_generation !== null && history.actual_generation !== undefined
                      ? `${history.actual_generation.toLocaleString()} MW`
                      : 'Missing Outturn'}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 font-medium">Applied Decision Cutoff</span>
                  <div className="text-sm font-semibold text-amber-400 font-mono mt-1">
                    {formatDateTime(history.cutoff_time)}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 font-medium">Selected Forecast</span>
                  <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                    {history.selected_generation !== null && history.selected_generation !== undefined
                      ? `${history.selected_generation.toLocaleString()} MW`
                      : 'None Eligible'}
                  </div>
                </div>
              </div>

              {/* Explanatory callout */}
              <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-3 text-xs text-indigo-200 flex items-start space-x-2.5">
                <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Audit Rule Enforcement:</strong> Any forecast published after the decision cutoff ({formatDateTime(history.cutoff_time)}) is strictly marked <strong>Ineligible</strong> and excluded from market evaluation, preventing lookahead bias.
                </div>
              </div>

              {/* Publication Snapshots Table */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  All Published Snapshots for this Interval ({history.forecasts.length})
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Publication Time (UTC)</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Forecast (MW)</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Eligibility at Cutoff</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Audit Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {history.forecasts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                            No forecast records found in WINDFOR for this delivery interval.
                          </td>
                        </tr>
                      ) : (
                        history.forecasts.map((f, idx) => (
                          <tr
                            key={idx}
                            className={`${
                              f.is_selected
                                ? 'bg-sky-500/10 border-l-4 border-l-sky-500 font-semibold'
                                : f.is_eligible
                                ? 'hover:bg-slate-800/40'
                                : 'opacity-60 bg-slate-950/40'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-sans text-slate-200">
                              {formatDateTime(f.publish_time)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-sky-300 font-bold">
                              {f.generation.toLocaleString()} MW
                            </td>
                            <td className="py-2.5 px-4 text-center font-sans">
                              {f.is_eligible ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Eligible (≤ Cutoff)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-rose-400 text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Ineligible (&gt; Cutoff)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center font-sans">
                              {f.is_selected ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-slate-950 shadow-sm">
                                  Selected (Latest Eligible)
                                </span>
                              ) : f.is_eligible ? (
                                <span className="text-slate-400 text-[11px]">
                                  Superseded by newer eligible
                                </span>
                              ) : (
                                <span className="text-rose-400/80 text-[11px]">
                                  Published after cutoff
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Source: Elexon BMRS WINDFOR Stream</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
