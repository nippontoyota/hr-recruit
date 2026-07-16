import sys
sys.path.append('backend')
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    print(conn.execute(text('SELECT token, is_used, expires_at FROM evaluation_tokens ORDER BY created_at DESC LIMIT 5')).fetchall())
