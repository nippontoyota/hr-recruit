from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Dedicated Recruitment Portal Supabase project URI (not the payslip project)
    database_url: str = "postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
    db_schema: str = "recruitment"
    secret_key: str = "change-me-use-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "candidate-documents"
    resume_signed_url_expires_seconds: int = 3600
    resume_max_bytes: int = 10 * 1024 * 1024
    # Comma-separated origins for the SPA (Vite default included)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
