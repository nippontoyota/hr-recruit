import os
import sys
import uuid

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.technical_question import TechnicalQuestion
from sqlalchemy import delete

def seed_call_centre_questions():
    db = SessionLocal()
    try:
        # Clear existing call centre questions to avoid duplicates on re-run
        db.execute(delete(TechnicalQuestion).where(TechnicalQuestion.department == "Call Centre"))
        
        questions = [
            {
                "department": "Call Centre",
                "text": "What is the position of Toyota in global automobile industry?",
                "options": {}
            },
            {
                "department": "Call Centre",
                "text": "Which are existing models of Toyota in India?",
                "options": {}
            },
            {
                "department": "Call Centre",
                "text": "How many dealerships does Nippon Toyota have in Kerala?",
                "options": {}
            },
            {
                "department": "Call Centre",
                "text": "You should greet & say the Company's name when you answer the phone.",
                "options": {"True": "True", "False": "False"}
            },
            {
                "department": "Call Centre",
                "text": "Apologise to the customer, even if any mistake was done by another staff.",
                "options": {"True": "True", "False": "False"}
            },
            {
                "department": "Call Centre",
                "text": "Which of the following is a communication type?",
                "options": {
                    "A": "Verbal & Non-verbal",
                    "B": "Positive and Negative",
                    "C": "One way and Two way",
                    "D": "None of these"
                }
            },
            {
                "department": "Call Centre",
                "text": "Which of the following are barriers to effective communication? (1) Noise, (2) Frame of mind, (3) Difficult words, (4) Listening skills, (5) Interruptions",
                "options": {
                    "A": "Only 1 & 2",
                    "B": "Only 3 & 4",
                    "C": "Only 1 & 5",
                    "D": "All of the options",
                    "E": "None of the options"
                }
            },
            {
                "department": "Call Centre",
                "text": "Is effective communication an important skill as an individual and professional?",
                "options": {"True": "True", "False": "False"}
            },
            {
                "department": "Call Centre",
                "text": "When having a disagreement, I typically:",
                "options": {
                    "A": "Lower my voice to an ominous whisper",
                    "B": "Maintain a normal voice level",
                    "C": "Raise my voice slightly or markedly"
                }
            },
            {
                "department": "Call Centre",
                "text": "The way we communicate makes an impression on others.",
                "options": {"True": "True", "False": "False"}
            },
            {
                "department": "Call Centre",
                "text": "Why do customers usually complain?",
                "options": {
                    "A": "Because their needs have not been met",
                    "B": "Building relationship that keeps customers coming back",
                    "C": "They are fond of increasing their social network"
                }
            }
        ]

        for q_data in questions:
            q = TechnicalQuestion(
                id=uuid.uuid4().hex,
                answer="none",
                **q_data
            )
            db.add(q)
            
        db.commit()
        print("Successfully seeded 11 Call Centre Technical Questions!")
        
    except Exception as e:
        print(f"Error seeding questions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_call_centre_questions()
