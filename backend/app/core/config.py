from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://user:pass@localhost:5432/nippon_recruitment"
    secret_key: str = "change-me-use-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480


settings = Settings()
