from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool, text

from app.core.config import settings
from app.core.database import Base
from app.models.candidate import Candidate  # noqa: F401
from app.models.stage_history import StageHistory  # noqa: F401
from app.models.user import User  # noqa: F401

config = context.config
# Escape % so ConfigParser does not treat password URL-encoding as interpolation.
config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
SCHEMA = settings.db_schema


def _connect_args() -> dict:
    if "supabase" in settings.database_url.lower():
        return {"sslmode": "require"}
    return {}


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        version_table_schema=SCHEMA,
        include_schemas=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        settings.database_url,
        poolclass=pool.NullPool,
        connect_args=_connect_args(),
    )
    with connectable.connect() as connection:
        connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
        connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=SCHEMA,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
