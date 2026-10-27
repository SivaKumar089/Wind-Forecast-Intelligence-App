import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCards } from '../components/MetricCards';
import { StatusBanner } from '../components/StatusBanner';
import { ControlBar } from '../components/ControlBar';
import { DataTable } from '../components/DataTable';
import type { AccuracyMetrics, ForecastObservation } from '../types';

describe('Dashboard Component Tests', () => {
  it('renders summary accuracy metrics correctly in MetricCards', () => {
    const mockMetrics: AccuracyMetrics = {
      mae: 3176.36,
      rmse: 3418.87,
      bias: 1250.5,
      mape: 20.95,
      mape_sample_count: 72,
      total_delivery_intervals: 72,
      matched_intervals: 72,
      missing_forecast_intervals: 0,
      missing_actual_intervals: 0,
      coverage_percentage: 100.0,
      total_actual_mwh: 549837.5,
      total_forecast_mwh: 664186.5,
    };

    render(<MetricCards metrics={mockMetrics} isLoading={false} />);

    expect(screen.getByText(/3,176.4/i)).toBeInTheDocument();
    expect(screen.getByText(/3,418.9/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1,250.5/i)).toBeInTheDocument();
    expect(screen.getByText(/21.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/100.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/Overforecasting/i)).toBeInTheDocument();
  });

  it('renders loading skeleton in MetricCards when isLoading is true', () => {
    const { container } = render(<MetricCards metrics={null} isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(6);
  });

  it('renders error notice in StatusBanner when error is present', () => {
    render(
      <StatusBanner
        dashboard={null}
        error="Elexon BMRS API network timeout"
        isLoading={false}
      />
    );

    expect(screen.getByText(/Failed to retrieve data from Elexon BMRS API/i)).toBeInTheDocument();
    expect(screen.getByText(/Elexon BMRS API network timeout/i)).toBeInTheDocument();
  });

  it('handles date filter clicks in ControlBar', () => {
    const onDateChange = vi.fn();
    const onCutoffChange = vi.fn();
    const onGranularityChange = vi.fn();
    const onRefresh = vi.fn();

    render(
      <ControlBar
        dateFrom="2026-01-01"
        dateTo="2026-01-07"
        cutoffConfig={{ cutoff_type: 'day_ahead', cutoff_time: '11:00' }}
        granularity="all"
        isLoading={false}
        onDateChange={onDateChange}
        onCutoffChange={onCutoffChange}
        onGranularityChange={onGranularityChange}
        onRefresh={onRefresh}
      />
    );

    // Click on Jan 8–14 (W2) preset
    const w2Btn = screen.getByText(/Jan 8–14 \(W2\)/i);
    fireEvent.click(w2Btn);
    expect(onDateChange).toHaveBeenCalledWith('2026-01-08', '2026-01-14');
  });

  it('renders observations and triggers interval audit in DataTable', () => {
    const mockObs: ForecastObservation[] = [
      {
        delivery_time: '2026-01-01T00:00:00Z',
        settlement_date: '2026-01-01',
        settlement_period: 1,
        actual_generation: 13756.0,
        selected_forecast: 19466.0,
        forecast_publish_time: '2025-12-31T09:30:00Z',
        cutoff_time: '2025-12-31T11:00:00Z',
        error: 5710.0,
        abs_error: 5710.0,
        percentage_error: 41.51,
        status: 'matched',
      },
    ];

    const onSelectInterval = vi.fn();
    render(<DataTable observations={mockObs} onSelectInterval={onSelectInterval} />);

    expect(screen.getByText(/13,756/i)).toBeInTheDocument();
    expect(screen.getByText(/19,466/i)).toBeInTheDocument();
    expect(screen.getByText(/\+5,710/i)).toBeInTheDocument();

    // Click audit icon
    const auditBtn = screen.getByTitle(/Audit forecast publication snapshots/i);
    fireEvent.click(auditBtn);
    expect(onSelectInterval).toHaveBeenCalledWith('2026-01-01T00:00:00Z');
  });
});
