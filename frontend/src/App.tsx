import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ControlBar } from './components/ControlBar';
import { MetricCards } from './components/MetricCards';
import { ForecastChart } from './components/ForecastChart';
import { DataTable } from './components/DataTable';
import { HistoryModal } from './components/HistoryModal';
import { MethodologyModal } from './components/MethodologyModal';
import { StatusBanner } from './components/StatusBanner';
import type { DashboardResponse, HealthResponse, CutoffConfig } from './types';
import { fetchDashboard, fetchHealth } from './services/api';

export const App: React.FC = () => {
  // State
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-01-07');
  const [cutoffConfig, setCutoffConfig] = useState<CutoffConfig>({
    cutoff_type: 'day_ahead',
    cutoff_time: '11:00',
  });
  const [granularity, setGranularity] = useState<string>('all');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // Load Health
  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => console.warn('Health check failed:', err));
  }, []);

  // Load Dashboard Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboard(dateFrom, dateTo, cutoffConfig, granularity);
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, cutoffConfig, granularity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleCutoffChange = (config: CutoffConfig) => {
    setCutoffConfig(config);
  };

  const handleGranularityChange = (g: string) => {
    setGranularity(g);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        health={health}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status / Alert Banner */}
        <StatusBanner
          dashboard={dashboard}
          error={error}
          isLoading={isLoading}
        />

        {/* Filter & Control Bar */}
        <ControlBar
          dateFrom={dateFrom}
          dateTo={dateTo}
          cutoffConfig={cutoffConfig}
          granularity={granularity}
          isLoading={isLoading}
          onDateChange={handleDateChange}
          onCutoffChange={handleCutoffChange}
          onGranularityChange={handleGranularityChange}
          onRefresh={loadData}
        />

        {/* Top KPI Metrics Cards */}
        <MetricCards
          metrics={dashboard?.metrics || null}
          isLoading={isLoading}
        />

        {/* Main Time-Series Forecast vs Actual Chart */}
        <ForecastChart
          observations={dashboard?.observations || []}
          isLoading={isLoading}
          onSelectInterval={(time) => setSelectedInterval(time)}
        />

        {/* Detailed Data Table */}
        <DataTable
          observations={dashboard?.observations || []}
          onSelectInterval={(time) => setSelectedInterval(time)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-slate-400 font-medium">
              Wind Forecast Intelligence &bull; UK Electricity Day-Ahead Market Decision Support
            </p>
            <p className="text-[11px] text-slate-500">
              Data strictly retrieved from Elexon BMRS (FUELHH Actuals & WINDFOR Forecasts). All timestamps in UTC/GMT.
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500 space-y-0.5">
            <div>EPEX SPOT / Nord Pool GB Benchmark Cutoff (D-1 11:00 GMT)</div>
            <div className="text-slate-600">Decision-support analytics pilot &bull; January 2026 Evaluation</div>
          </div>
        </div>
      </footer>

      {/* Forecast Publication History Audit Modal */}
      <HistoryModal
        deliveryTime={selectedInterval}
        cutoffConfig={cutoffConfig}
        onClose={() => setSelectedInterval(null)}
      />

      {/* Methodology Explainer Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </div>
  );
};

export default App;
