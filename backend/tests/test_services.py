import pytest
from datetime import datetime, timezone
from app.services.forecast_service import forecast_service, parse_iso_datetime, format_iso_datetime
from app.models.schemas import CutoffConfig, CutoffType, ObservationStatus

def test_filter_and_normalize_actuals_filters_wind_only():
    """Verify that only fuelType == 'WIND' records are retained."""
    raw = [
        {"fuelType": "BIOMASS", "startTime": "2026-01-01T00:00:00Z", "generation": 1000},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "generation": 12500, "settlementDate": "2026-01-01", "settlementPeriod": 1},
        {"fuelType": "NUCLEAR", "startTime": "2026-01-01T00:00:00Z", "generation": 5000},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:30:00Z", "generation": 13000, "settlementDate": "2026-01-01", "settlementPeriod": 2},
    ]
    actuals = forecast_service.filter_and_normalize_actuals(raw)
    assert len(actuals) == 2
    assert all(a["generation"] in (12500, 13000) for a in actuals)
    assert actuals[0]["startTime"] == "2026-01-01T00:00:00Z"
    assert actuals[1]["startTime"] == "2026-01-01T00:30:00Z"

def test_filter_and_normalize_actuals_handles_duplicates():
    """Verify that duplicate startTimes retain the latest published record."""
    raw = [
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "generation": 10000, "publishTime": "2026-01-01T01:00:00Z"},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "generation": 10500, "publishTime": "2026-01-01T02:00:00Z"},
    ]
    actuals = forecast_service.filter_and_normalize_actuals(raw)
    assert len(actuals) == 1
    assert actuals[0]["generation"] == 10500

def test_day_ahead_cutoff_calculation():
    """
    For a delivery interval on 2026-01-02 14:00:00Z,
    Day-Ahead 11:00 GMT cutoff must be 2026-01-01 11:00:00Z.
    """
    delivery_dt = datetime(2026, 1, 2, 14, 0, tzinfo=timezone.utc)
    config = CutoffConfig(cutoff_type=CutoffType.DAY_AHEAD, cutoff_time="11:00")
    cutoff = forecast_service.calculate_cutoff_threshold(delivery_dt, config)
    assert cutoff == datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc)

def test_rolling_hours_cutoff_calculation():
    """
    For a delivery interval on 2026-01-02 14:00:00Z and 4 rolling hours ahead,
    cutoff must be 2026-01-02 10:00:00Z.
    """
    delivery_dt = datetime(2026, 1, 2, 14, 0, tzinfo=timezone.utc)
    config = CutoffConfig(cutoff_type=CutoffType.ROLLING_HOURS, rolling_hours=4.0)
    cutoff = forecast_service.calculate_cutoff_threshold(delivery_dt, config)
    assert cutoff == datetime(2026, 1, 2, 10, 0, tzinfo=timezone.utc)

def test_forecast_selection_excludes_forecasts_after_cutoff():
    """
    Ensures that any forecast published after the decision cutoff is excluded,
    and the latest eligible forecast published before or at the cutoff is selected.
    """
    delivery_time = "2026-01-02T12:00:00Z"
    # Cutoff for 2026-01-02 delivery with Day-Ahead 11:00 is 2026-01-01T11:00:00Z
    config = CutoffConfig(cutoff_type=CutoffType.DAY_AHEAD, cutoff_time="11:00")
    
    actuals = [{
        "startTime": delivery_time,
        "settlementDate": "2026-01-02",
        "settlementPeriod": 25,
        "generation": 15000.0
    }]
    
    # Raw forecasts with different publication times
    raw_forecasts = [
        # Eligible: published early
        {"startTime": delivery_time, "publishTime": "2025-12-31T20:00:00Z", "generation": 12000.0},
        # Eligible: latest eligible before cutoff
        {"startTime": delivery_time, "publishTime": "2026-01-01T09:30:00Z", "generation": 14000.0},
        # Ineligible: published at 11:30 (after 11:00 cutoff)
        {"startTime": delivery_time, "publishTime": "2026-01-01T11:30:00Z", "generation": 14800.0},
        # Ineligible: published right before delivery
        {"startTime": delivery_time, "publishTime": "2026-01-02T11:00:00Z", "generation": 15100.0},
    ]
    
    forecasts_by_start = forecast_service.group_forecasts_by_start_time(raw_forecasts)
    observations = forecast_service.match_forecasts_and_actuals(actuals, forecasts_by_start, config)
    
    assert len(observations) == 1
    obs = observations[0]
    assert obs.status == ObservationStatus.MATCHED
    # Must select 14000.0 (published 2026-01-01T09:30:00Z), NOT 14800.0 or 15100.0
    assert obs.selected_forecast == 14000.0
    assert obs.forecast_publish_time == "2026-01-01T09:30:00Z"
    # error = forecast - actual = 14000 - 15000 = -1000
    assert obs.error == -1000.0
    assert obs.abs_error == 1000.0

def test_forecast_missing_when_all_published_after_cutoff():
    """
    If forecasts exist for the delivery interval but ALL were published after the cutoff,
    the observation status must be MISSING_FORECAST and no forecast data is fabricated.
    """
    delivery_time = "2026-01-02T12:00:00Z"
    config = CutoffConfig(cutoff_type=CutoffType.DAY_AHEAD, cutoff_time="11:00")
    
    actuals = [{
        "startTime": delivery_time,
        "settlementDate": "2026-01-02",
        "settlementPeriod": 25,
        "generation": 15000.0
    }]
    
    # All published after 2026-01-01T11:00:00Z
    raw_forecasts = [
        {"startTime": delivery_time, "publishTime": "2026-01-01T12:00:00Z", "generation": 14500.0},
        {"startTime": delivery_time, "publishTime": "2026-01-02T06:00:00Z", "generation": 14900.0},
    ]
    
    forecasts_by_start = forecast_service.group_forecasts_by_start_time(raw_forecasts)
    observations = forecast_service.match_forecasts_and_actuals(actuals, forecasts_by_start, config)
    
    assert len(observations) == 1
    obs = observations[0]
    assert obs.status == ObservationStatus.MISSING_FORECAST
    assert obs.selected_forecast is None
    assert obs.error is None

def test_interval_history_audit():
    """Verify that get_interval_history audits eligibility and selection properly."""
    delivery_time = "2026-01-02T12:00:00Z"
    config = CutoffConfig(cutoff_type=CutoffType.DAY_AHEAD, cutoff_time="11:00")
    
    actuals = [{"startTime": delivery_time, "generation": 12000.0}]
    raw_forecasts = [
        {"startTime": delivery_time, "publishTime": "2026-01-01T08:00:00Z", "generation": 11000.0},
        {"startTime": delivery_time, "publishTime": "2026-01-01T10:30:00Z", "generation": 11500.0},
        {"startTime": delivery_time, "publishTime": "2026-01-01T12:00:00Z", "generation": 11800.0},
    ]
    
    forecasts_by_start = forecast_service.group_forecasts_by_start_time(raw_forecasts)
    history = forecast_service.get_interval_history(delivery_time, actuals, forecasts_by_start, config)
    
    assert history.delivery_time == delivery_time
    assert history.actual_generation == 12000.0
    assert history.selected_generation == 11500.0
    assert history.selected_publish_time == "2026-01-01T10:30:00Z"
    assert len(history.forecasts) == 3
    
    f1, f2, f3 = history.forecasts
    assert f1.is_eligible is True and f1.is_selected is False
    assert f2.is_eligible is True and f2.is_selected is True
    assert f3.is_eligible is False and f3.is_selected is False
