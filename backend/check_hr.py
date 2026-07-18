import asyncio
from app.db.session import SessionLocal
from app.models.user import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'hr@nippon.test').first()
print(f'Role: {user.role}')
