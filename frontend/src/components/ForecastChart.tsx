import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
} from 'recharts';
import { Eye, AlertTriangle, Info } from 'lucide-react';
import type { ForecastObservation } from '../types';

interface ForecastChartProps {
  observations: ForecastObservation[];
  isLoading: boolean;
  onSelectInterval: (deliveryTime: string) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  observations,
  isLoading,
  onSelectInterval,
}) => {
  const [showErrorBars, setShowErrorBars] = useState<boolean>(true);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-96 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading delivery interval observations...</p>
      </div>
    );
  }

  if (!observations || observations.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-medium">No generation observations available for this date range.</p>
        <p className="text-xs text-slate-500">Please choose a valid date range within January 2026.</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = observations.map((obs) => {
    const dt = new Date(obs.delivery_time);
    const timeLabel = dt.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });

    return {
      rawTime: obs.delivery_time,
      timeLabel,
      actual: obs.actual_generation,
      forecast: obs.selected_forecast,
      error: obs.error,
      absError: obs.abs_error,
      status: obs.status,
      publishTime: obs.forecast_publish_time,
      period: obs.settlement_period,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const hasActual = data.actual !== null && data.actual !== undefined;
      const hasForecast = data.forecast !== null && data.forecast !== undefined;

      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-white">{data.timeLabel} UTC</span>
            {data.period && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                Period {data.period}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Actual Generation:</span>
              </span>
              <strong className="text-emerald-400 font-mono">
                {hasActual ? `${data.actual.toLocaleString()} MW` : 'Missing Data'}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Selected Forecast:</span>
              </span>
              <strong className="text-sky-400 font-mono">
                {hasForecast ? `${data.forecast.toLocaleString()} MW` : 'No Eligible Forecast'}
              </strong>
            </div>

            {data.error !== null && data.error !== undefined && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Forecast Error (F - A):</span>
                <strong className={`font-mono ${data.error > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {data.error > 0 ? `+${data.error.toLocaleString()}` : data.error.toLocaleString()} MW
                </strong>
              </div>
            )}

            {data.publishTime && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Published at:</span>
                <span className="font-mono text-slate-300">
                  {new Date(data.publishTime).toLocaleTimeString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC',
                  })} UTC
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 text-[10px] text-emerald-400/90 flex items-center space-x-1 border-t border-slate-800/60 font-medium">
            <Eye className="w-3 h-3" />
            <span>Click point to audit forecast publication history</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>National Wind Generation: Actual vs Day-Ahead Eligible Forecast</span>
          </h2>
          <p className="text-xs text-slate-400">
            Click any interval on the chart to inspect all historical WINDFOR publication snapshots and audit gate closure eligibility.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showErrorBars}
              onChange={(e) => setShowErrorBars(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Show Signed Forecast Error Bars</span>
          </label>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[420px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length) {
                const item = state.activePayload[0].payload;
                if (item.rawTime) {
                  onSelectInterval(item.rawTime);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', color: '#94A3B8' }}
            />

            {/* Error Bars if enabled */}
            {showErrorBars && (
              <Bar
                dataKey="error"
                name="Signed Error (F - A)"
                fill="#F59E0B"
                opacity={0.35}
                radius={[2, 2, 0, 0]}
              />
            )}

            {/* Actual Wind Generation Line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Outturn (FUELHH)"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#10B981' }}
              activeDot={{ r: 6, fill: '#34D399', stroke: '#064E3B', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Eligible Forecast Generation Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              name="Day-Ahead Forecast (WINDFOR)"
              stroke="#38BDF8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 2, fill: '#38BDF8' }}
              activeDot={{ r: 6, fill: '#7DD3FC', stroke: '#0C4A6E', strokeWidth: 2 }}
              connectNulls={false}
            />

            <Brush
              dataKey="timeLabel"
              height={28}
              stroke="#334155"
              fill="#0F172A"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>Missing data points (e.g. half-hours where WINDFOR was not published) appear as breaks, not zeros.</span>
        </div>
        <span className="text-slate-500 font-mono text-[11px]">Units: Megawatts (MW)</span>
      </div>
    </div>
  );
};
