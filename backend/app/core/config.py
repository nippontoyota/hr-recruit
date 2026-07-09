from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase Postgres URI (Settings → Database → Connection string / URI)
    database_url: str = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
    db_schema: str = "recruitment"
    secret_key: str = "change-me-use-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480


settings = Settings()
