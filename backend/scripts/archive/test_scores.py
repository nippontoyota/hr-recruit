from app.core.database import SessionLocal
from app.models.evaluation import Evaluation

db = SessionLocal()
evs = db.query(Evaluation).filter(Evaluation.scores != None, Evaluation.type == 'TECHNICAL_TEST').all()
for ev in evs:
    print(ev.id, ev.scores)
