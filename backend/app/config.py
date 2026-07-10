from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    fireworks_api_key: str | None = None
    fireworks_model: str = "accounts/fireworks/models/llama-v3p1-8b-instruct"

    model_config = SettingsConfigDict(env_file=ENV_FILE)


settings = Settings()  # type: ignore
