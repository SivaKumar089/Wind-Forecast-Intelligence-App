export type CutoffType = 'day_ahead' | 'rolling_hours' | 'custom_datetime';

export interface CutoffConfig {
  cutoff_type: CutoffType;
  cutoff_time?: string;
  rolling_hours?: number;
  custom_datetime?: string;
}

export type ObservationStatus = 'matched' | 'missing_forecast' | 'missing_actual' | 'ineligible';

export interface ForecastObservation {
  delivery_time: string;
  settlement_date?: string;
  settlement_period?: number;
  actual_generation?: number | null;
  selected_forecast?: number | null;
  forecast_publish_time?: string | null;
  cutoff_time?: string | null;
  error?: number | null;
  abs_error?: number | null;
  percentage_error?: number | null;
  status: ObservationStatus;
}

export interface AccuracyMetrics {
  mae?: number | null;
  rmse?: number | null;
  bias?: number | null;
  mape?: number | null;
  mape_sample_count: number;
  total_delivery_intervals: number;
  matched_intervals: number;
  missing_forecast_intervals: number;
  missing_actual_intervals: number;
  coverage_percentage: number;
  total_actual_mwh: number;
  total_forecast_mwh: number;
}

export interface PublicationHistoryItem {
  delivery_time: string;
  publish_time: string;
  generation: number;
  cutoff_time: string;
  is_eligible: boolean;
  is_selected: boolean;
}

export interface ForecastHistoryResponse {
  delivery_time: string;
  actual_generation?: number | null;
  cutoff_time: string;
  selected_publish_time?: string | null;
  selected_generation?: number | null;
  forecasts: PublicationHistoryItem[];
}

export interface DashboardResponse {
  date_from: string;
  date_to: string;
  cutoff_description: string;
  cutoff_config: CutoffConfig;
  metrics: AccuracyMetrics;
  observations: ForecastObservation[];
  data_status: {
    source: string;
    elexon_online: boolean;
    granularity: string;
    observations_count: number;
    matched_count: number;
    missing_forecasts: number;
    timezone: string;
  };
}

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  elexon_api_connected: boolean;
  cache_enabled: boolean;
}
