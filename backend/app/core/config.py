from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
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

    doubletick_api_key: str = ""
    waba_phone_number_id: str = ""
    # Comma-separated origins for the SPA (Vite default included)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    public_app_url: str = "http://localhost:5173"
    rate_limit_per_minute: int = 60
    redis_url: str = ""

    # SMTP Configuration
    smtp_host: str = "smtp.sendgrid.net"
    smtp_port: int = 587
    smtp_user: str = "apikey"
    smtp_password: str = ""
    smtp_from_email: str = "hr@nippontoyota.com"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() == "production"

    def validate_security(self) -> None:
        weak_secret = self.secret_key in {"", "change-me-use-long-random-string"}
        if self.is_production and weak_secret:
            raise ValueError("SECRET_KEY must be set to a long random value in production.")
        if self.is_production and not self.supabase_url:
            raise ValueError("SUPABASE_URL is required in production.")
        if self.is_production and not self.supabase_service_role_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required in production.")


settings = Settings()
settings.validate_security()
