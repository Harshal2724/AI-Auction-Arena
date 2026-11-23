from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Auction Arena API"
    api_v1_prefix: str = "/api"
    database_url: str = "sqlite:///./auction_arena.db"
    cricket_data_provider: str = "manual"
    cricket_data_api_key: str | None = None
    cricket_data_base_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
