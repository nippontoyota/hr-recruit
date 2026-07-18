import asyncio
from uuid import UUID
from app.db.session import SessionLocal
from app.models.candidate import Candidate
db = SessionLocal()
candidate = db.query(Candidate).filter(Candidate.id == '0e5f3d27-a53e-4eb1-81bc-4d3b2767cefc').first()
print(f'Token: {candidate.pre_form_token}')
print(f'Status: {candidate.pre_form_status}')
print(f'Screening: {candidate.screening_status}')
