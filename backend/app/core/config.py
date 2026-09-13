from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/db/sovereign.db — same file the seeder (simulation/seed_history.py) writes.
_DEFAULT_DB = Path(__file__).resolve().parents[1] / "db" / "sovereign.db"


class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    JWT_SECRET: str = "sovereign-amm-super-secret-key-for-hackathon"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://sovereign-amm.vercel.app"
    DATABASE_PATH: str = str(_DEFAULT_DB)
    LOG_LEVEL: str = "INFO"
    # Public grid that guests / judges may stream without an account.
    DEMO_GRID_ID: str = "demo"
    # Allow unauthenticated WebSocket access to the demo grid (presentation mode).
    PUBLIC_DEMO: bool = True
    GOOGLE_CLIENT_ID: str = ""
    # Wall-clock timezone used to align dataset playback with the time of day.
    SIM_TIMEZONE: str = "Asia/Kolkata"
    # Auto-generate + activate the sample 24 h dataset when no run is active.
    AUTO_SAMPLE_DATASET: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
