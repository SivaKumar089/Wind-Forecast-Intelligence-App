import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta, time
from ..models.schemas import (
    CutoffConfig,
    CutoffType,
    ForecastObservation,
    ObservationStatus,
    PublicationHistoryItem,
    ForecastHistoryResponse
)

logger = logging.getLogger(__name__)

def parse_iso_datetime(dt_str: str) -> datetime:
    """Parse an ISO 8601 timestamp string into a timezone-aware UTC datetime."""
    clean_str = dt_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(clean_str)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def format_iso_datetime(dt: datetime) -> str:
    """Format a datetime into standard UTC ISO 8601 string with Z suffix."""
    utc_dt = dt.astimezone(timezone.utc)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

class ForecastService:
    @staticmethod
    def calculate_cutoff_threshold(start_dt: datetime, config: CutoffConfig) -> datetime:
        """
        Calculates the decision cutoff timestamp for a given delivery interval start time.
        
        UK Electricity Market Context:
        - Day-Ahead GB Auction Gate Closure (EPEX SPOT / Nord Pool GB) closes at 11:00 GMT on D-1.
        - Therefore, for delivery on date D, the trader's cutoff is D-1 at 11:00 GMT (or configured cutoff_time).
        - Rolling Cutoff: X hours before the delivery interval.
        - Custom Cutoff: Fixed global point in time.
        """
        if config.cutoff_type == CutoffType.DAY_AHEAD:
            delivery_date = start_dt.date()
            prev_day = delivery_date - timedelta(days=1)
            
            # Parse HH:MM from config.cutoff_time
            cutoff_h, cutoff_m = 11, 0
            if config.cutoff_time:
                try:
                    parts = config.cutoff_time.split(":")
                    cutoff_h = int(parts[0])
                    cutoff_m = int(parts[1]) if len(parts) > 1 else 0
                except Exception as e:
                    logger.warning(f"Failed to parse cutoff_time '{config.cutoff_time}', defaulting to 11:00. Err: {e}")
            
            return datetime.combine(prev_day, time(cutoff_h, cutoff_m)).replace(tzinfo=timezone.utc)
            
        elif config.cutoff_type == CutoffType.ROLLING_HOURS:
            hours = config.rolling_hours if config.rolling_hours is not None else 4.0
            return start_dt - timedelta(hours=hours)
            
        elif config.cutoff_type == CutoffType.CUSTOM_DATETIME:
            if config.custom_datetime:
                return parse_iso_datetime(config.custom_datetime)
            # Default fallback if custom_datetime missing
            return start_dt - timedelta(hours=12)
            
        return start_dt - timedelta(hours=13)

    @staticmethod
    def filter_and_normalize_actuals(raw_actuals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filters FUELHH records for fuelType == 'WIND', deduplicates by startTime,
        and ensures valid numeric generation and timestamps.
        """
        filtered: Dict[str, Dict[str, Any]] = {}
        
        for item in raw_actuals:
            if item.get("fuelType") != "WIND":
                continue
                
            start_time_str = item.get("startTime")
            if not start_time_str:
                continue
                
            try:
                st_dt = parse_iso_datetime(start_time_str)
                normalized_st = format_iso_datetime(st_dt)
                gen_val = item.get("generation")
                if gen_val is None:
                    continue
                gen = float(gen_val)
                
                # Check for duplicates: if already exists, retain latest publishTime or log
                existing = filtered.get(normalized_st)
                if existing:
                    # Compare publishTime if present
                    pub_curr = parse_iso_datetime(item.get("publishTime", "1970-01-01T00:00:00Z"))
                    pub_prev = parse_iso_datetime(existing.get("publishTime", "1970-01-01T00:00:00Z"))
                    if pub_curr > pub_prev:
                        filtered[normalized_st] = {
                            "startTime": normalized_st,
                            "settlementDate": item.get("settlementDate"),
                            "settlementPeriod": item.get("settlementPeriod"),
                            "generation": gen,
                            "publishTime": format_iso_datetime(pub_curr)
                        }
                else:
                    filtered[normalized_st] = {
                        "startTime": normalized_st,
                        "settlementDate": item.get("settlementDate"),
                        "settlementPeriod": item.get("settlementPeriod"),
                        "generation": gen,
                        "publishTime": format_iso_datetime(parse_iso_datetime(item.get("publishTime", "1970-01-01T00:00:00Z")))
                    }
            except Exception as e:
                logger.warning(f"Error normalizing actual item {item}: {e}")
                continue
                
        # Sort chronologically
        return sorted(list(filtered.values()), key=lambda x: x["startTime"])

    @staticmethod
    def group_forecasts_by_start_time(raw_forecasts: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Groups WINDFOR forecast records by normalized delivery startTime.
        """
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        
        for item in raw_forecasts:
            st_str = item.get("startTime")
            pub_str = item.get("publishTime")
            gen_val = item.get("generation")
            
            if not st_str or not pub_str or gen_val is None:
                continue
                
            try:
                st_dt = parse_iso_datetime(st_str)
                pub_dt = parse_iso_datetime(pub_str)
                gen = float(gen_val)
                
                norm_st = format_iso_datetime(st_dt)
                norm_pub = format_iso_datetime(pub_dt)
                
                if norm_st not in grouped:
                    grouped[norm_st] = []
                    
                grouped[norm_st].append({
                    "startTime": norm_st,
                    "publishTime": norm_pub,
                    "publish_dt": pub_dt,
                    "generation": gen
                })
            except Exception as e:
                logger.warning(f"Error parsing forecast record {item}: {e}")
                continue
                
        return grouped

    @classmethod
    def match_forecasts_and_actuals(
        cls,
        actuals: List[Dict[str, Any]],
        forecasts_by_start: Dict[str, List[Dict[str, Any]]],
        config: CutoffConfig
    ) -> List[ForecastObservation]:
        """
        Critical Business Logic:
        For each delivery interval:
        1. Calculate applicable decision cutoff threshold.
        2. Identify forecasts with publishTime <= cutoff threshold.
        3. Select the eligible forecast with the latest publishTime.
        4. Match with actual generation.
        5. Calculate error = forecast - actual.
        """
        observations: List[ForecastObservation] = []
        
        for act in actuals:
            st_str = act["startTime"]
            st_dt = parse_iso_datetime(st_str)
            actual_gen = act["generation"]
            
            cutoff_dt = cls.calculate_cutoff_threshold(st_dt, config)
            cutoff_str = format_iso_datetime(cutoff_dt)
            
            cands = forecasts_by_start.get(st_str, [])
            # Filter for publishTime <= cutoff_dt
            eligible_cands = [c for c in cands if c["publish_dt"] <= cutoff_dt]
            
            if eligible_cands:
                # Select the eligible record with latest publishTime
                best_cand = max(eligible_cands, key=lambda c: c["publish_dt"])
                forecast_gen = best_cand["generation"]
                pub_time_str = best_cand["publishTime"]
                
                error = forecast_gen - actual_gen
                abs_error = abs(error)
                pct_error = (error / actual_gen * 100.0) if actual_gen > 0 else None
                
                observations.append(ForecastObservation(
                    delivery_time=st_str,
                    settlement_date=act.get("settlementDate"),
                    settlement_period=act.get("settlementPeriod"),
                    actual_generation=actual_gen,
                    selected_forecast=forecast_gen,
                    forecast_publish_time=pub_time_str,
                    cutoff_time=cutoff_str,
                    error=round(error, 2),
                    abs_error=round(abs_error, 2),
                    percentage_error=round(pct_error, 2) if pct_error is not None else None,
                    status=ObservationStatus.MATCHED
                ))
            else:
                # Actual generation exists but no eligible forecast was available by the cutoff
                observations.append(ForecastObservation(
                    delivery_time=st_str,
                    settlement_date=act.get("settlementDate"),
                    settlement_period=act.get("settlementPeriod"),
                    actual_generation=actual_gen,
                    selected_forecast=None,
                    forecast_publish_time=None,
                    cutoff_time=cutoff_str,
                    error=None,
                    abs_error=None,
                    percentage_error=None,
                    status=ObservationStatus.MISSING_FORECAST
                ))
                
        return observations

    @classmethod
    def get_interval_history(
        cls,
        delivery_time_str: str,
        actuals: List[Dict[str, Any]],
        forecasts_by_start: Dict[str, List[Dict[str, Any]]],
        config: CutoffConfig
    ) -> ForecastHistoryResponse:
        """
        Inspect all forecast publications for a single delivery interval to audit eligibility and selection.
        """
        norm_dt = parse_iso_datetime(delivery_time_str)
        norm_st_str = format_iso_datetime(norm_dt)
        
        cutoff_dt = cls.calculate_cutoff_threshold(norm_dt, config)
        cutoff_str = format_iso_datetime(cutoff_dt)
        
        # Find actual generation
        actual_val = None
        for act in actuals:
            if act["startTime"] == norm_st_str:
                actual_val = act["generation"]
                break
                
        cands = forecasts_by_start.get(norm_st_str, [])
        eligible_cands = [c for c in cands if c["publish_dt"] <= cutoff_dt]
        best_cand = max(eligible_cands, key=lambda c: c["publish_dt"]) if eligible_cands else None
        
        history_items: List[PublicationHistoryItem] = []
        for c in sorted(cands, key=lambda x: x["publish_dt"]):
            is_elig = c["publish_dt"] <= cutoff_dt
            is_sel = (best_cand is not None and c["publishTime"] == best_cand["publishTime"])
            history_items.append(PublicationHistoryItem(
                delivery_time=norm_st_str,
                publish_time=c["publishTime"],
                generation=c["generation"],
                cutoff_time=cutoff_str,
                is_eligible=is_elig,
                is_selected=is_sel
            ))
            
        return ForecastHistoryResponse(
            delivery_time=norm_st_str,
            actual_generation=actual_val,
            cutoff_time=cutoff_str,
            selected_publish_time=best_cand["publishTime"] if best_cand else None,
            selected_generation=best_cand["generation"] if best_cand else None,
            forecasts=history_items
        )

forecast_service = ForecastService()
