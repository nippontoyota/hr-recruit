from app.core.database import engine


def test_request_path_does_not_issue_a_remote_pre_ping_on_every_connection_checkout():
    # pool_recycle bounds connection age; a per-request pre-ping would add a
    # second Supabase round trip before every normal database operation.
    assert engine.pool._pre_ping is False
