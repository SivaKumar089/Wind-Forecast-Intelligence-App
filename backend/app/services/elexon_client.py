import os
import json
import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import httpx
from ..config import settings

logger = logging.getLogger(__name__)

class ElexonClient:
    def __init__(self):
        self.base_url = settings.ELEXON_BASE_URL
        self.timeout = settings.ELEXON_REQUEST_TIMEOUT
        self.cache_dir = settings.CACHE_DIR
        self.enable_cache = settings.ENABLE_CACHE
        self.cache_ttl = settings.CACHE_TTL_SECONDS
        
        if self.enable_cache:
            os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_path(self, cache_key: str) -> str:
        safe_key = "".join([c if c.isalnum() or c in ("-", "_") else "_" for c in cache_key])
        return os.path.join(self.cache_dir, f"{safe_key}.json")

    def _read_cache(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        if not self.enable_cache:
            return None
        cache_path = self._get_cache_path(cache_key)
        if not os.path.exists(cache_path):
            return None
        try:
            mtime = os.path.getmtime(cache_path)
            if time.time() - mtime > self.cache_ttl:
                logger.info(f"Cache expired for key: {cache_key}")
                return None
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info(f"Loaded {len(data)} items from cache: {cache_path}")
                return data
        except Exception as e:
            logger.warning(f"Error reading cache for {cache_key}: {e}")
            return None

    def _write_cache(self, cache_key: str, data: List[Dict[str, Any]]) -> None:
        if not self.enable_cache:
            return
        cache_path = self._get_cache_path(cache_key)
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(data, f)
            logger.info(f"Saved {len(data)} items to cache: {cache_path}")
        except Exception as e:
            logger.warning(f"Error writing cache for {cache_key}: {e}")

    async def check_health(self) -> bool:
        """Check if Elexon API is responsive."""
        url = f"{self.base_url}/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-01&fuelType=WIND"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers={"User-Agent": "WindForecastIntelligence/1.0"})
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Elexon health check failed: {e}")
            return False

    async def get_actual_wind_generation(self, date_from: str, date_to: str) -> List[Dict[str, Any]]:
        """
        Fetch FUELHH actual generation dataset for fuelType=WIND.
        date_from and date_to are strings in format YYYY-MM-DD.
        """
        cache_key = f"FUELHH_WIND_{date_from}_{date_to}"
        cached = self._read_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": date_from,
            "settlementDateTo": date_to,
            "fuelType": "WIND"
        }
        
        logger.info(f"Fetching actual wind generation: {url} with params {params}")
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers={"User-Agent": "WindForecastIntelligence/1.0"})
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list):
                    self._write_cache(cache_key, data)
                    return data
                elif isinstance(data, dict) and "data" in data:
                    res = data["data"]
                    self._write_cache(cache_key, res)
                    return res
                else:
                    logger.error(f"Unexpected response format from FUELHH: {type(data)}")
                    return []
        except Exception as e:
            logger.error(f"Failed to fetch FUELHH from Elexon: {e}")
            # Try fallback to expired cache if available
            fallback_path = self._get_cache_path(cache_key)
            if os.path.exists(fallback_path):
                logger.warning(f"Using stale cache fallback for {cache_key}")
                with open(fallback_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            raise e

    async def get_wind_forecasts(self, publish_from: str, publish_to: str) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR forecast dataset published between publish_from and publish_to.
        Format: ISO string e.g. '2025-12-28T00:00:00Z'.
        """
        cache_key = f"WINDFOR_{publish_from[:10]}_{publish_to[:10]}"
        cached = self._read_cache(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": publish_from,
            "publishDateTimeTo": publish_to
        }
        
        logger.info(f"Fetching wind forecasts: {url} with params {params}")
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers={"User-Agent": "WindForecastIntelligence/1.0"})
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list):
                    self._write_cache(cache_key, data)
                    return data
                elif isinstance(data, dict) and "data" in data:
                    res = data["data"]
                    self._write_cache(cache_key, res)
                    return res
                else:
                    logger.error(f"Unexpected response format from WINDFOR: {type(data)}")
                    return []
        except Exception as e:
            logger.error(f"Failed to fetch WINDFOR from Elexon: {e}")
            fallback_path = self._get_cache_path(cache_key)
            if os.path.exists(fallback_path):
                logger.warning(f"Using stale cache fallback for {cache_key}")
                with open(fallback_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            raise e

elexon_client = ElexonClient()
