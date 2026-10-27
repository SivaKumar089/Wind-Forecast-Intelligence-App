import React from 'react';
import { X, BookOpen, Clock, ShieldCheck, Database, HelpCircle } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Market Methodology & Mathematical Formulations</h3>
              <p className="text-xs text-slate-400">
                UK Day-Ahead electricity procurement rules, forecast selection logic, and accuracy metrics
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
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Business Context & Day-Ahead Gate Closure */}
          <section className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h4>1. UK Wholesale Electricity Day-Ahead Schedule & Decision Cutoff</h4>
            </div>
            <p>
              In Great Britain (GB), wholesale electricity suppliers and utilities submit bids and offers to day-ahead power exchanges (primarily <strong>EPEX SPOT GB</strong> and <strong>Nord Pool GB</strong>) to balance expected customer demand against generation.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="font-semibold text-slate-200">Chosen Decision Cutoff Rule:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>
                  <strong className="text-emerald-400">Standard GB Day-Ahead Auction Gate Closure:</strong> Order books close at <strong>11:00 GMT on D-1</strong> (the day preceding the delivery day D).
                </li>
                <li>
                  <strong>Example:</strong> For any delivery period occurring on <strong>2026-01-03</strong>, the trading team had to place their day-ahead orders by <strong>2026-01-02 11:00:00Z</strong>.
                </li>
                <li>
                  <strong>Alternative Cutoffs Supported:</strong> 12:00 GMT (EU-harmonized auction benchmark), 17:00 GMT (evening day-ahead rebalancing), and rolling intraday horizons (e.g. 4 hours ahead).
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Critical Forecast Selection Logic */}
          <section className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <h4>2. Critical Business Logic: Historical Forecast Selection</h4>
            </div>
            <p>
              To evaluate historical trading decisions honestly and eliminate <em>lookahead bias</em>, the platform enforces strict chronological audit rules:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
              <li>
                Each delivery interval is identified by its half-hourly start timestamp <code className="text-sky-300 bg-slate-950 px-1 py-0.5 rounded">startTime</code> (UTC).
              </li>
              <li>
                The decision cutoff timestamp <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">cutoffTime</code> is computed for that delivery date.
              </li>
              <li>
                All forecast snapshots from Elexon dataset <code className="text-sky-300 bg-slate-950 px-1 py-0.5 rounded">WINDFOR</code> for that interval are examined.
              </li>
              <li>
                Only snapshots where <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">publishTime &le; cutoffTime</code> are eligible.
              </li>
              <li>
                The eligible record with the <strong>latest <code className="text-emerald-400">publishTime</code></strong> is selected as the forecast genuinely available to the trader.
              </li>
              <li>
                Any forecast published after the cutoff is strictly marked <strong>Ineligible</strong>. It is never used in market evaluation.
              </li>
            </ol>
          </section>

          {/* Section 3: Metric Formulations */}
          <section className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <Database className="w-4 h-4 text-indigo-400" />
              <h4>3. Forecast Accuracy Metric Formulations</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="font-semibold text-emerald-400">Mean Absolute Error (MAE)</div>
                <div className="font-mono text-slate-300 text-[11px] bg-slate-900 px-2 py-1 rounded">
                  MAE = (1 / N) * &Sigma; |Forecast - Actual|
                </div>
                <p className="text-[11px] text-slate-400">
                  Measures the average magnitude of forecast errors in Megawatts (MW), giving equal weight to all deviations.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="font-semibold text-sky-400">Root Mean Squared Error (RMSE)</div>
                <div className="font-mono text-slate-300 text-[11px] bg-slate-900 px-2 py-1 rounded">
                  RMSE = &radic;((1 / N) * &Sigma; (Forecast - Actual)&sup2;)
                </div>
                <p className="text-[11px] text-slate-400">
                  Heavily penalizes large forecast misses, which cause the most severe imbalance pricing exposure for utilities.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="font-semibold text-amber-400">Forecast Bias (Signed Mean Error)</div>
                <div className="font-mono text-slate-300 text-[11px] bg-slate-900 px-2 py-1 rounded">
                  Bias = (1 / N) * &Sigma; (Forecast - Actual)
                </div>
                <p className="text-[11px] text-slate-400">
                  Convention: <strong>Error = Forecast - Actual</strong>. Positive bias indicates systematic overforecasting; negative bias indicates underforecasting.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="font-semibold text-indigo-400">Safe MAPE (Thresholded)</div>
                <div className="font-mono text-slate-300 text-[11px] bg-slate-900 px-2 py-1 rounded">
                  MAPE = (1 / M) * &Sigma; (|F - A| / A) * 100% (A &ge; 100 MW)
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard MAPE explodes mathematically when actual wind drops near 0 MW during calm conditions. We filter for actuals &ge; 100 MW and state the sample count explicitly.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Elexon BMRS Datasets & Granularity */}
          <section className="space-y-2">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <h4>4. Data Sources & Granularity Handling (FUELHH vs WINDFOR)</h4>
            </div>
            <p>
              The application queries official live Elexon BMRS APIs:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>
                <strong>FUELHH:</strong> Actual outturn by fuel type, filtered strictly for <code className="text-emerald-400">fuelType = 'WIND'</code>. Published at <strong>Half-Hourly (30 min)</strong> intervals (48 settlement periods per day).
              </li>
              <li>
                <strong>WINDFOR:</strong> National Grid ESO wind generation forecasts. Published at <strong>Hourly (60 min)</strong> intervals.
              </li>
              <li>
                <strong>Integrity & Completeness:</strong> To prevent data fabrication, the application never silently synthesizes data or replaces missing forecasts with zero. By default, 48 settlement periods are shown with missing half-hour forecasts marked, or users can toggle to "Hourly (WINDFOR)" resolution for 100% matched observations.
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
