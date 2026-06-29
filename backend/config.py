from typing import Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    PYTHONUNBUFFERED: int = 1
    TEMP_DIR: str = "temp_files"
    LOG_LEVEL: str = "INFO"
    WEASYPRINT_BASE_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
