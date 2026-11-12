from app.core.database import engine
from sqlalchemy.pool import NullPool


def test_request_path_does_not_issue_a_remote_pre_ping_on_every_connection_checkout():
    # pool_recycle bounds connection age; a per-request pre-ping would add a
    # second Supabase round trip before every normal database operation.
    assert engine.pool._pre_ping is False


def test_serverless_supabase_pooler_port_rewrite_and_nullpool(monkeypatch):
    import importlib
    from app.core import database, config

    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setattr(config.settings, "database_url", "postgresql://user:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres")

    # Re-import to trigger serverless branch
    reloaded_db = importlib.reload(database)
    try:
        assert ":6543" in str(reloaded_db.engine.url)
        assert isinstance(reloaded_db.engine.pool, NullPool)
    finally:
        monkeypatch.delenv("VERCEL", raising=False)
        importlib.reload(database)
