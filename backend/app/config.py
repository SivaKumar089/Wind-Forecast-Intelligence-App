import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Wind Forecast Intelligence"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Elexon BMRS API Settings
    ELEXON_BASE_URL: str = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
    ELEXON_REQUEST_TIMEOUT: float = float(os.getenv("ELEXON_REQUEST_TIMEOUT", "45.0"))
    
    # Data Caching Settings
    CACHE_DIR: str = os.getenv("CACHE_DIR", os.path.join(os.path.dirname(__file__), "..", "data_cache"))
    ENABLE_CACHE: bool = os.getenv("ENABLE_CACHE", "true").lower() in ("true", "1", "yes")
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "86400")) # 24 hours default for historical data
    
    # Default Market Cutoff Configuration
    # UK Day-Ahead auction order book gate closure benchmark is 11:00 GMT on D-1 (EPEX SPOT / Nord Pool GB)
    DEFAULT_CUTOFF_TYPE: str = "day_ahead"
    DEFAULT_CUTOFF_TIME: str = "11:00" # 11:00 UTC/GMT on D-1
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:80",
        "*"
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
