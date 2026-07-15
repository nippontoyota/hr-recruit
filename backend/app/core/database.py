from collections.abc import Generator

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

connect_args: dict = {}
if "supabase" in settings.database_url.lower():
    connect_args["sslmode"] = "require"

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    connect_args=connect_args,
)


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
