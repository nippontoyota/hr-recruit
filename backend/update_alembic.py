import psycopg2
import os

DATABASE_URL = "postgresql://postgres.rupgxwsfkberlaeseigk:ijzAXx3%23%2B4WCx%2F.@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("UPDATE recruitment.alembic_version SET version_num = '8d8e558968c3'")
conn.commit()
cur.close()
conn.close()
