from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class CutoffType(str, Enum):
    DAY_AHEAD = "day_ahead"
    ROLLING_HOURS = "rolling_hours"
    CUSTOM_DATETIME = "custom_datetime"

class CutoffConfig(BaseModel):
    cutoff_type: CutoffType = Field(
        default=CutoffType.DAY_AHEAD,
        description="Type of cutoff rule: 'day_ahead' (fixed time on D-1), 'rolling_hours' (X hours before delivery), or 'custom_datetime'"
    )
    cutoff_time: Optional[str] = Field(
        default="11:00",
        description="Time of day in UTC/GMT for Day-Ahead cutoff (HH:MM), e.g. 11:00 (standard UK EPEX SPOT auction gate closure)"
    )
    rolling_hours: Optional[float] = Field(
        default=None,
        description="Number of hours ahead of delivery interval start time (for rolling cutoff)"
    )
    custom_datetime: Optional[str] = Field(
        default=None,
        description="Explicit ISO UTC timestamp used as the universal cutoff for all intervals"
    )

class ObservationStatus(str, Enum):
    MATCHED = "matched"
    MISSING_FORECAST = "missing_forecast"
    MISSING_ACTUAL = "missing_actual"
    INELIGIBLE = "ineligible"

class ForecastObservation(BaseModel):
    delivery_time: str = Field(description="Delivery interval start time (UTC ISO)")
    settlement_date: Optional[str] = Field(default=None, description="Settlement date (YYYY-MM-DD)")
    settlement_period: Optional[int] = Field(default=None, description="Settlement period (1-48, or 50 on clock change)")
    actual_generation: Optional[float] = Field(default=None, description="Actual wind generation outturn in MW")
    selected_forecast: Optional[float] = Field(default=None, description="Selected eligible forecast wind generation in MW")
    forecast_publish_time: Optional[str] = Field(default=None, description="Publication timestamp of the selected forecast (UTC ISO)")
    cutoff_time: Optional[str] = Field(default=None, description="Decision cutoff threshold applied for this delivery interval (UTC ISO)")
    error: Optional[float] = Field(default=None, description="Signed error = Forecast - Actual (MW). Positive = overforecasting, Negative = underforecasting")
    abs_error: Optional[float] = Field(default=None, description="Absolute error = |Forecast - Actual| (MW)")
    percentage_error: Optional[float] = Field(default=None, description="Signed percentage error = (Forecast - Actual) / Actual * 100 (%)")
    status: ObservationStatus = Field(description="Observation matching and eligibility status")

class AccuracyMetrics(BaseModel):
    mae: Optional[float] = Field(default=None, description="Mean Absolute Error (MW)")
    rmse: Optional[float] = Field(default=None, description="Root Mean Squared Error (MW)")
    bias: Optional[float] = Field(default=None, description="Mean signed forecast error (MW). Bias = Forecast - Actual")
    mape: Optional[float] = Field(default=None, description="Mean Absolute Percentage Error (%) - filtered for actual >= 100 MW to avoid division by zero")
    mape_sample_count: int = Field(default=0, description="Count of observations where actual >= 100 MW used to compute MAPE")
    total_delivery_intervals: int = Field(default=0, description="Total expected delivery intervals in date range")
    matched_intervals: int = Field(default=0, description="Number of intervals with both valid actual and eligible forecast")
    missing_forecast_intervals: int = Field(default=0, description="Number of intervals with actual generation but no eligible forecast")
    missing_actual_intervals: int = Field(default=0, description="Number of intervals where actual generation was absent")
    coverage_percentage: float = Field(default=0.0, description="Percentage of delivery intervals successfully matched (%)")
    total_actual_mwh: float = Field(default=0.0, description="Total actual energy generated in MWh (half-hour MW * 0.5h)")
    total_forecast_mwh: float = Field(default=0.0, description="Total forecasted energy in MWh (half-hour MW * 0.5h)")

class PublicationHistoryItem(BaseModel):
    delivery_time: str = Field(description="Delivery interval start time (UTC ISO)")
    publish_time: str = Field(description="Publication timestamp of forecast (UTC ISO)")
    generation: float = Field(description="Forecasted wind generation in MW")
    cutoff_time: str = Field(description="Decision cutoff threshold (UTC ISO)")
    is_eligible: bool = Field(description="True if publish_time <= cutoff_time")
    is_selected: bool = Field(description="True if this forecast was the latest eligible forecast chosen")

class ForecastHistoryResponse(BaseModel):
    delivery_time: str
    actual_generation: Optional[float] = None
    cutoff_time: str
    selected_publish_time: Optional[str] = None
    selected_generation: Optional[float] = None
    forecasts: List[PublicationHistoryItem] = []

class DashboardResponse(BaseModel):
    date_from: str
    date_to: str
    cutoff_description: str
    cutoff_config: CutoffConfig
    metrics: AccuracyMetrics
    observations: List[ForecastObservation]
    data_status: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    elexon_api_connected: bool
    cache_enabled: bool
