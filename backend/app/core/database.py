import socket
from collections.abc import Generator
from urllib.parse import urlparse

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Windows tries broken AAAA first (~30s) for Supabase DB and Storage.
_orig_getaddrinfo = socket.getaddrinfo


def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)


socket.getaddrinfo = _ipv4_getaddrinfo


def _ipv4_hostaddr(database_url: str) -> str | None:
    host = urlparse(database_url).hostname
    if not host:
        return None
    try:
        infos = _orig_getaddrinfo(host, None, socket.AF_INET, socket.SOCK_STREAM)
    except OSError:
        return None
    if not infos:
        return None
    return infos[0][4][0]


connect_args: dict = {"connect_timeout": 10}
if "supabase" in settings.database_url.lower():
    connect_args["sslmode"] = "require"
    hostaddr = _ipv4_hostaddr(settings.database_url)
    if hostaddr:
        connect_args["hostaddr"] = hostaddr

# Small pool: sequential form submit (apply + resume + photo) reuses TLS.
# Keep it tiny so uvicorn --reload cannot exhaust the Supabase pooler.
_engine_kwargs: dict = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "pool_size": 3,
    "max_overflow": 2,
}

engine = create_engine(settings.database_url, **_engine_kwargs)


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
