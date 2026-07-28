import asyncio
from app.db.session import SessionLocal
from app.models.candidate import Candidate
db = SessionLocal()
candidate = db.query(Candidate).filter(Candidate.id == '0e5f3d27-a53e-4eb1-81bc-4d3b2767cefc').first()
print(f'Current Stage: {candidate.current_stage}')
print(f'Stage Before Hold: {candidate.stage_before_hold}')
