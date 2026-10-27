import math
from typing import List
from ..models.schemas import ForecastObservation, AccuracyMetrics, ObservationStatus

class MetricsService:
    @staticmethod
    def calculate_metrics(observations: List[ForecastObservation]) -> AccuracyMetrics:
        """
        Calculates forecast accuracy metrics strictly on valid, matched observations.
        
        Definitions:
        - MAE  = (1/N) * sum(|forecast - actual|)
        - RMSE = sqrt((1/N) * sum((forecast - actual)^2))
        - Bias = (1/N) * sum(forecast - actual)
          (Positive = Overforecasting, Negative = Underforecasting)
        - Safe MAPE = (1/M) * sum(|forecast - actual| / actual) * 100%
          for actual >= 100 MW threshold (avoids zero division and distortion during wind lulls)
        - Energy Totals = sum(MW * 0.5 hours) in MWh
        """
        total_intervals = len(observations)
        matched_obs = [obs for obs in observations if obs.status == ObservationStatus.MATCHED and obs.error is not None]
        missing_forecast_count = sum(1 for obs in observations if obs.status == ObservationStatus.MISSING_FORECAST)
        missing_actual_count = sum(1 for obs in observations if obs.status == ObservationStatus.MISSING_ACTUAL)
        
        n = len(matched_obs)
        if n == 0:
            return AccuracyMetrics(
                mae=None,
                rmse=None,
                bias=None,
                mape=None,
                mape_sample_count=0,
                total_delivery_intervals=total_intervals,
                matched_intervals=0,
                missing_forecast_intervals=missing_forecast_count,
                missing_actual_intervals=missing_actual_count,
                coverage_percentage=0.0,
                total_actual_mwh=0.0,
                total_forecast_mwh=0.0
            )

        errors = [obs.error for obs in matched_obs]
        abs_errors = [obs.abs_error for obs in matched_obs]
        
        mae = sum(abs_errors) / n
        rmse = math.sqrt(sum(e ** 2 for e in errors) / n)
        bias = sum(errors) / n
        
        # Safe MAPE calculation: only include intervals where actual >= 100 MW
        mape_candidates = [
            (obs.abs_error / obs.actual_generation * 100.0)
            for obs in matched_obs
            if obs.actual_generation is not None and obs.actual_generation >= 100.0 and obs.abs_error is not None
        ]
        mape = (sum(mape_candidates) / len(mape_candidates)) if mape_candidates else None
        mape_sample_count = len(mape_candidates)
        
        # Energy totals: Half-hourly intervals represent 0.5 hours each
        total_actual_mwh = sum((obs.actual_generation or 0.0) * 0.5 for obs in matched_obs)
        total_forecast_mwh = sum((obs.selected_forecast or 0.0) * 0.5 for obs in matched_obs)
        
        coverage = (n / total_intervals * 100.0) if total_intervals > 0 else 0.0

        return AccuracyMetrics(
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            bias=round(bias, 2),
            mape=round(mape, 2) if mape is not None else None,
            mape_sample_count=mape_sample_count,
            total_delivery_intervals=total_intervals,
            matched_intervals=n,
            missing_forecast_intervals=missing_forecast_count,
            missing_actual_intervals=missing_actual_count,
            coverage_percentage=round(coverage, 2),
            total_actual_mwh=round(total_actual_mwh, 2),
            total_forecast_mwh=round(total_forecast_mwh, 2)
        )

metrics_service = MetricsService()
