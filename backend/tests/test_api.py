import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_RAW_ACTUALS = [
    {
        "dataset": "FUELHH",
        "publishTime": "2026-01-01T00:30:00Z",
        "startTime": "2026-01-01T00:00:00Z",
        "settlementDate": "2026-01-01",
        "settlementPeriod": 1,
        "fuelType": "WIND",
        "generation": 12000
    },
    {
        "dataset": "FUELHH",
        "publishTime": "2026-01-01T01:00:00Z",
        "startTime": "2026-01-01T00:30:00Z",
        "settlementDate": "2026-01-01",
        "settlementPeriod": 2,
        "fuelType": "WIND",
        "generation": 12500
    }
]

SAMPLE_RAW_FORECASTS = [
    {
        "dataset": "WINDFOR",
        "publishTime": "2025-12-31T09:30:00Z",
        "startTime": "2026-01-01T00:00:00Z",
        "generation": 11800
    },
    {
        "dataset": "WINDFOR",
        "publishTime": "2025-12-31T10:30:00Z",
        "startTime": "2026-01-01T00:30:00Z",
        "generation": 12200
    },
    # Ineligible forecast published after 11:00 cutoff
    {
        "dataset": "WINDFOR",
        "publishTime": "2025-12-31T14:30:00Z",
        "startTime": "2026-01-01T00:00:00Z",
        "generation": 13000
    }
]

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Wind Forecast Intelligence" in data["app"]

@patch("app.services.elexon_client.ElexonClient.check_health", new_callable=AsyncMock)
def test_health_endpoint(mock_health):
    mock_health.return_value = True
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["elexon_api_connected"] is True

@patch("app.services.elexon_client.ElexonClient.get_actual_wind_generation", new_callable=AsyncMock)
@patch("app.services.elexon_client.ElexonClient.get_wind_forecasts", new_callable=AsyncMock)
def test_dashboard_endpoint(mock_forecasts, mock_actuals):
    mock_actuals.return_value = SAMPLE_RAW_ACTUALS
    mock_forecasts.return_value = SAMPLE_RAW_FORECASTS
    
    response = client.get("/api/dashboard?date_from=2026-01-01&date_to=2026-01-01&cutoff_type=day_ahead&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["date_from"] == "2026-01-01"
    assert data["metrics"]["matched_intervals"] == 2
    assert len(data["observations"]) == 2
    
    # Verify that the forecast published after cutoff (13000 at 14:30) was NOT picked
    first_obs = data["observations"][0]
    assert first_obs["selected_forecast"] == 11800
    assert first_obs["forecast_publish_time"] == "2025-12-31T09:30:00Z"
    assert first_obs["error"] == -200.0

@patch("app.services.elexon_client.ElexonClient.get_actual_wind_generation", new_callable=AsyncMock)
@patch("app.services.elexon_client.ElexonClient.get_wind_forecasts", new_callable=AsyncMock)
def test_forecast_history_audit_endpoint(mock_forecasts, mock_actuals):
    mock_actuals.return_value = SAMPLE_RAW_ACTUALS
    mock_forecasts.return_value = SAMPLE_RAW_FORECASTS
    
    response = client.get("/api/forecast-history?delivery_time=2026-01-01T00:00:00Z&cutoff_type=day_ahead&cutoff_time=11:00")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_time"] == "2026-01-01T00:00:00Z"
    assert data["selected_publish_time"] == "2025-12-31T09:30:00Z"
    assert len(data["forecasts"]) >= 2
    
    # Check that ineligibility is flagged
    ineligible_item = next(f for f in data["forecasts"] if f["publish_time"] == "2025-12-31T14:30:00Z")
    assert ineligible_item["is_eligible"] is False
    assert ineligible_item["is_selected"] is False

def test_invalid_date_range():
    response = client.get("/api/dashboard?date_from=2026-01-10&date_to=2026-01-01")
    assert response.status_code == 400
    assert "date_from cannot be after date_to" in response.json()["detail"]
