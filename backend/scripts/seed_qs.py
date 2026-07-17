import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.technical_question import TechnicalQuestion
from app.core.config import settings
import uuid

engine = create_engine(str(settings.database_url))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Clear existing questions
db.query(TechnicalQuestion).delete()

qs = [
    {"department": "Telecalling Customer Support", "text": "What is the position of Toyota in global automobile industry?", "options": {}, "answer": ""},
    {"department": "Telecalling Customer Support", "text": "Which are existing models of Toyota in India?", "options": {}, "answer": ""},
    {"department": "Telecalling Customer Support", "text": "How many dealerships does Nippon Toyota have in Kerala?", "options": {}, "answer": ""},
    {"department": "Telecalling Customer Support", "text": "You should greet & say the Company's name when you answer the phone.", "options": {"A": "True", "B": "False"}, "answer": "A"},
    {"department": "Telecalling Customer Support", "text": "Apologise to the customer, even if any mistake was done by another staff.", "options": {"A": "True", "B": "False"}, "answer": "A"},
    {"department": "Telecalling Customer Support", "text": "Which of the following is a communication type?", "options": {"A": "Verbal & Non verbal", "B": "Positive and Negative", "C": "One way and Two way", "D": "None of these"}, "answer": "A"},
    {"department": "Telecalling Customer Support", "text": "Which of the following are barriers to effective communication — 1) Noise, 2) Frame of mind, 3) Difficult words, 4) Listening skills, 5) Interruptions", "options": {"A": "Only 1 & 2", "B": "Only 3 & 4", "C": "Only 1 & 5", "D": "All of options", "E": "None of the options"}, "answer": "D"},
    {"department": "Telecalling Customer Support", "text": "Is effective communication an important skill as an individual and professional?", "options": {"A": "True", "B": "False"}, "answer": "A"},
    {"department": "Telecalling Customer Support", "text": "When having a disagreement, I typically:", "options": {"A": "Lower my voice to iminous whisper", "B": "Maintain a normal voice level", "C": "Raise my voice slightly markedly"}, "answer": "B"},
    {"department": "Telecalling Customer Support", "text": "The way we communicate makes an impression on others.", "options": {"A": "True", "B": "False"}, "answer": "A"},
    {"department": "Telecalling Customer Support", "text": "Why do customers usually complain?", "options": {"A": "Because their needs have not been met", "B": "Building relationship that keeps customers coming back", "C": "They are fond of increasing their social network"}, "answer": "A"},
]

for q in qs:
    db.add(TechnicalQuestion(
        id=str(uuid.uuid4()),
        department=q["department"],
        text=q["text"],
        options=q["options"],
        answer=q["answer"]
    ))

db.commit()
print("Questions inserted.")
