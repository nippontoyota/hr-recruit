import os
from collections.abc import Generator

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

connect_args: dict = {"connect_timeout": 5}
if "supabase" in settings.database_url.lower() or "postgres" in settings.database_url.lower():
    connect_args["options"] = f"-c search_path={settings.db_schema},public"
if "supabase" in settings.database_url.lower():
    connect_args["sslmode"] = "require"

db_url = settings.database_url
# When running on Vercel/serverless against the Supabase pooler on port 5432 (session mode),
# port 6543 (transaction mode) prevents (EMAXCONNSESSION) max clients reached errors.
if is_serverless and "pooler.supabase.com:5432" in db_url:
    db_url = db_url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")

if is_serverless:
    _engine_kwargs: dict = {
        "connect_args": connect_args,
        "poolclass": NullPool,
    }
else:
    _engine_kwargs: dict = {
        "connect_args": connect_args,
        # pool_pre_ping adds a remote `SELECT 1` before every checkout. With the
        # Supabase pooler this doubles database round trips on ordinary requests;
        # recycle connections proactively instead of paying that cost per request.
        "pool_pre_ping": False,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 10,
        "pool_timeout": 15,
    }

engine = create_engine(db_url, **_engine_kwargs)


@event.listens_for(engine, "connect")
def _set_search_path(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET search_path TO {settings.db_schema}, public")
    cursor.close()


SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    metadata = MetaData(schema=settings.db_schema)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
