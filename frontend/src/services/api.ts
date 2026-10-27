import type { DashboardResponse, ForecastHistoryResponse, HealthResponse, CutoffConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchHealth(): Promise<HealthResponse> {
  const resp = await fetch(`${API_BASE}/api/health`);
  if (!resp.ok) {
    throw new Error(`Health check failed: ${resp.statusText}`);
  }
  return resp.json();
}

export async function fetchDashboard(
  dateFrom: string,
  dateTo: string,
  cutoffConfig: CutoffConfig,
  granularity: string = 'all'
): Promise<DashboardResponse> {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    granularity,
    cutoff_type: cutoffConfig.cutoff_type,
  });

  if (cutoffConfig.cutoff_time) {
    params.append('cutoff_time', cutoffConfig.cutoff_time);
  }
  if (cutoffConfig.rolling_hours !== undefined && cutoffConfig.rolling_hours !== null) {
    params.append('rolling_hours', cutoffConfig.rolling_hours.toString());
  }
  if (cutoffConfig.custom_datetime) {
    params.append('custom_datetime', cutoffConfig.custom_datetime);
  }

  const resp = await fetch(`${API_BASE}/api/dashboard?${params.toString()}`);
  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(errorBody.detail || `Error ${resp.status}`);
  }
  return resp.json();
}

export async function fetchForecastHistory(
  deliveryTime: string,
  cutoffConfig: CutoffConfig
): Promise<ForecastHistoryResponse> {
  const params = new URLSearchParams({
    delivery_time: deliveryTime,
    cutoff_type: cutoffConfig.cutoff_type,
  });

  if (cutoffConfig.cutoff_time) {
    params.append('cutoff_time', cutoffConfig.cutoff_time);
  }
  if (cutoffConfig.rolling_hours !== undefined && cutoffConfig.rolling_hours !== null) {
    params.append('rolling_hours', cutoffConfig.rolling_hours.toString());
  }
  if (cutoffConfig.custom_datetime) {
    params.append('custom_datetime', cutoffConfig.custom_datetime);
  }

  const resp = await fetch(`${API_BASE}/api/forecast-history?${params.toString()}`);
  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(errorBody.detail || `Error ${resp.status}`);
  }
  return resp.json();
}
