import pytest
import math
from app.models.schemas import ForecastObservation, ObservationStatus
from app.services.metrics_service import metrics_service

def test_metrics_calculation_standard():
    """
    Test standard error metrics:
    Observations:
    1: Actual 1000, Forecast 1200 -> Error = +200, AbsError = 200
    2: Actual 2000, Forecast 1700 -> Error = -300, AbsError = 300
    3: Actual 3000, Forecast 3000 -> Error = 0,    AbsError = 0
    4: Actual 4000, Forecast 4500 -> Error = +500, AbsError = 500

    MAE = (200 + 300 + 0 + 500) / 4 = 1000 / 4 = 250.0 MW
    RMSE = sqrt((200^2 + (-300)^2 + 0^2 + 500^2) / 4)
         = sqrt((40000 + 90000 + 0 + 250000) / 4)
         = sqrt(380000 / 4) = sqrt(95000) ~= 308.22 MW
    Bias = (200 - 300 + 0 + 500) / 4 = 400 / 4 = 100.0 MW
    """
    obs = [
        ForecastObservation(
            delivery_time="2026-01-01T00:00:00Z",
            actual_generation=1000.0,
            selected_forecast=1200.0,
            error=200.0,
            abs_error=200.0,
            percentage_error=20.0,
            status=ObservationStatus.MATCHED
        ),
        ForecastObservation(
            delivery_time="2026-01-01T00:30:00Z",
            actual_generation=2000.0,
            selected_forecast=1700.0,
            error=-300.0,
            abs_error=300.0,
            percentage_error=-15.0,
            status=ObservationStatus.MATCHED
        ),
        ForecastObservation(
            delivery_time="2026-01-01T01:00:00Z",
            actual_generation=3000.0,
            selected_forecast=3000.0,
            error=0.0,
            abs_error=0.0,
            percentage_error=0.0,
            status=ObservationStatus.MATCHED
        ),
        ForecastObservation(
            delivery_time="2026-01-01T01:30:00Z",
            actual_generation=4000.0,
            selected_forecast=4500.0,
            error=500.0,
            abs_error=500.0,
            percentage_error=12.5,
            status=ObservationStatus.MATCHED
        ),
    ]

    metrics = metrics_service.calculate_metrics(obs)
    assert metrics.mae == 250.0
    assert metrics.rmse == round(math.sqrt(95000), 2)
    assert metrics.bias == 100.0
    assert metrics.matched_intervals == 4
    assert metrics.coverage_percentage == 100.0
    # Energy MWh: (1000 + 2000 + 3000 + 4000) * 0.5 = 5000.0 MWh actual
    assert metrics.total_actual_mwh == 5000.0
    # Energy MWh forecast: (1200 + 1700 + 3000 + 4500) * 0.5 = 5200.0 MWh
    assert metrics.total_forecast_mwh == 5200.0

def test_safe_mape_filters_near_zero_actuals():
    """
    Ensure MAPE ignores observations where actual generation < 100 MW
    to prevent division by zero or wind lull distortions.
    """
    obs = [
        # Near zero actual (wind calm): should be skipped from MAPE
        ForecastObservation(
            delivery_time="2026-01-01T00:00:00Z",
            actual_generation=10.0,
            selected_forecast=100.0,
            error=90.0,
            abs_error=90.0,
            status=ObservationStatus.MATCHED
        ),
        # Normal actual: 1000 MW, error 100 MW -> 10%
        ForecastObservation(
            delivery_time="2026-01-01T00:30:00Z",
            actual_generation=1000.0,
            selected_forecast=1100.0,
            error=100.0,
            abs_error=100.0,
            status=ObservationStatus.MATCHED
        ),
    ]

    metrics = metrics_service.calculate_metrics(obs)
    assert metrics.mape_sample_count == 1
    assert metrics.mape == 10.0

def test_empty_observations():
    """Metrics on empty observations return None for errors and 0 for counts."""
    metrics = metrics_service.calculate_metrics([])
    assert metrics.mae is None
    assert metrics.rmse is None
    assert metrics.bias is None
    assert metrics.matched_intervals == 0
    assert metrics.coverage_percentage == 0.0
