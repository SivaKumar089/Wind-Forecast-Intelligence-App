import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from ..models.schemas import (
    HealthResponse,
    DashboardResponse,
    ForecastObservation,
    AccuracyMetrics,
    ForecastHistoryResponse,
    CutoffConfig,
    CutoffType
)
from ..services.elexon_client import elexon_client
from ..services.forecast_service import forecast_service, parse_iso_datetime
from ..services.metrics_service import metrics_service
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

def get_cutoff_config(
    cutoff_type: CutoffType = Query(CutoffType.DAY_AHEAD, description="Cutoff type: day_ahead, rolling_hours, or custom_datetime"),
    cutoff_time: Optional[str] = Query("11:00", description="Time of day on D-1 for Day-Ahead cutoff (HH:MM GMT)"),
    rolling_hours: Optional[float] = Query(None, description="Hours prior to delivery interval start for rolling cutoff"),
    custom_datetime: Optional[str] = Query(None, description="Explicit universal cutoff timestamp (ISO UTC)")
) -> CutoffConfig:
    return CutoffConfig(
        cutoff_type=cutoff_type,
        cutoff_time=cutoff_time,
        rolling_hours=rolling_hours,
        custom_datetime=custom_datetime
    )

def describe_cutoff(config: CutoffConfig) -> str:
    if config.cutoff_type == CutoffType.DAY_AHEAD:
        return f"Day-Ahead Auction Cutoff: D-1 at {config.cutoff_time or '11:00'} GMT (EPEX SPOT / Nord Pool GB Benchmark)"
    elif config.cutoff_type == CutoffType.ROLLING_HOURS:
        return f"Rolling Cutoff: {config.rolling_hours or 4.0} hours prior to interval delivery start"
    elif config.cutoff_type == CutoffType.CUSTOM_DATETIME:
        return f"Custom Historical Cutoff: {config.custom_datetime or 'Universal'}"
    return "Standard UK Day-Ahead Cutoff"

async def fetch_processed_data(date_from: str, date_to: str, cutoff_config: CutoffConfig, granularity: str = "all"):
    # 1. Validate dates
    try:
        df_dt = datetime.strptime(date_from, "%Y-%m-%d")
        dt_dt = datetime.strptime(date_to, "%Y-%m-%d")
        if df_dt > dt_dt:
            raise HTTPException(status_code=400, detail="date_from cannot be after date_to")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid date format (must be YYYY-MM-DD): {ve}")

    # 2. To get WINDFOR forecasts published in time for date_from, we need forecasts published up to 3 days prior
    pub_from_dt = df_dt - timedelta(days=3)
    pub_to_dt = dt_dt + timedelta(days=2)
    pub_from_str = pub_from_dt.strftime("%Y-%m-%dT00:00:00Z")
    pub_to_str = pub_to_dt.strftime("%Y-%m-%dT23:59:59Z")

    try:
        raw_actuals = await elexon_client.get_actual_wind_generation(date_from, date_to)
        raw_forecasts = await elexon_client.get_wind_forecasts(pub_from_str, pub_to_str)
    except Exception as e:
        logger.error(f"Error fetching data from Elexon: {e}")
        raise HTTPException(status_code=502, detail=f"Elexon BMRS API error: {str(e)}")

    # 3. Filter and normalize actuals
    normalized_actuals = forecast_service.filter_and_normalize_actuals(raw_actuals)
    
    # If granularity is 'hourly', filter for hourly delivery intervals (WINDFOR native resolution)
    if granularity == "hourly":
        normalized_actuals = [a for a in normalized_actuals if a["startTime"].endswith(":00:00Z")]
    
    # 4. Group forecasts by start time
    forecasts_by_start = forecast_service.group_forecasts_by_start_time(raw_forecasts)

    # 5. Match forecasts and actuals based on cutoff
    observations = forecast_service.match_forecasts_and_actuals(
        normalized_actuals,
        forecasts_by_start,
        cutoff_config
    )

    # 6. Calculate accuracy metrics
    metrics = metrics_service.calculate_metrics(observations)

    return normalized_actuals, forecasts_by_start, observations, metrics

@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Application health endpoint with Elexon connectivity check."""
    elexon_ok = await elexon_client.check_health()
    return HealthResponse(
        status="healthy" if elexon_ok else "degraded",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        elexon_api_connected=elexon_ok,
        cache_enabled=settings.ENABLE_CACHE
    )

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    date_from: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    date_to: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    granularity: str = Query("all", description="Interval granularity: 'all' (all 48 settlement periods) or 'hourly' (24 hourly settlement periods matching WINDFOR)"),
    cutoff_config: CutoffConfig = Depends(get_cutoff_config)
):
    """
    Returns complete dashboard overview:
    - Summary accuracy metrics (MAE, RMSE, Bias, Safe MAPE, Coverage)
    - Matched observations for charts and tables
    - Cutoff metadata and data health indicators
    """
    _, _, observations, metrics = await fetch_processed_data(date_from, date_to, cutoff_config, granularity)
    cutoff_desc = describe_cutoff(cutoff_config)

    return DashboardResponse(
        date_from=date_from,
        date_to=date_to,
        cutoff_description=cutoff_desc,
        cutoff_config=cutoff_config,
        metrics=metrics,
        observations=observations,
        data_status={
            "source": "Elexon BMRS (FUELHH & WINDFOR)",
            "elexon_online": True,
            "granularity": granularity,
            "observations_count": len(observations),
            "matched_count": metrics.matched_intervals,
            "missing_forecasts": metrics.missing_forecast_intervals,
            "timezone": "UTC / GMT (GB Settlement Standard)"
        }
    )

@router.get("/forecasts", response_model=List[ForecastObservation])
async def get_forecasts(
    date_from: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    date_to: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    granularity: str = Query("all", description="Interval granularity: 'all' or 'hourly'"),
    cutoff_config: CutoffConfig = Depends(get_cutoff_config)
):
    """Returns list of selected forecasts matched with actuals for the time window."""
    _, _, observations, _ = await fetch_processed_data(date_from, date_to, cutoff_config, granularity)
    return observations

@router.get("/accuracy", response_model=AccuracyMetrics)
async def get_accuracy(
    date_from: str = Query("2026-01-01", description="Start date (YYYY-MM-DD)"),
    date_to: str = Query("2026-01-07", description="End date (YYYY-MM-DD)"),
    granularity: str = Query("all", description="Interval granularity: 'all' or 'hourly'"),
    cutoff_config: CutoffConfig = Depends(get_cutoff_config)
):
    """Returns summary accuracy metrics (MAE, RMSE, Bias, Safe MAPE, Coverage)."""
    _, _, _, metrics = await fetch_processed_data(date_from, date_to, cutoff_config, granularity)
    return metrics

@router.get("/forecast-history", response_model=ForecastHistoryResponse)
async def get_forecast_history(
    delivery_time: str = Query(..., description="Delivery interval start time (ISO UTC string, e.g. 2026-01-01T12:00:00Z)"),
    cutoff_config: CutoffConfig = Depends(get_cutoff_config)
):
    """
    Returns audit trail of all published forecasts for a specific delivery interval.
    Shows publication times, cutoff line, and eligibility/selection status.
    """
    try:
        dt = parse_iso_datetime(delivery_time)
        delivery_date = dt.date().strftime("%Y-%m-%d")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid delivery_time timestamp: {e}")

    normalized_actuals, forecasts_by_start, _, _ = await fetch_processed_data(
        delivery_date, delivery_date, cutoff_config
    )

    history = forecast_service.get_interval_history(
        delivery_time,
        normalized_actuals,
        forecasts_by_start,
        cutoff_config
    )
    return history
