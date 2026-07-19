import uuid
from sqlalchemy import text
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.technical_question import TechnicalQuestion

def seed_mcqs():
    db = SessionLocal()
    try:
        # Clear existing questions for Tech
        db.execute(text("DELETE FROM recruitment.technical_questions WHERE department = 'Tech'"))
        
        questions = [
            ("What does 'HTTP' stand for?", {"A": "HyperText Transfer Protocol", "B": "HyperText Transmission Protocol", "C": "HyperTransfer Text Protocol", "D": "HyperText Transfer Program"}, "A"),
            ("Which of the following is a backend framework?", {"A": "React", "B": "Angular", "C": "FastAPI", "D": "Vue"}, "C"),
            ("What is the time complexity of binary search?", {"A": "O(n)", "B": "O(n log n)", "C": "O(log n)", "D": "O(1)"}, "C"),
            ("Which data structure uses LIFO?", {"A": "Queue", "B": "Stack", "C": "Tree", "D": "Graph"}, "B"),
            ("What is the primary key in a database?", {"A": "A unique identifier for a record", "B": "A foreign key", "C": "A string field", "D": "An indexed column"}, "A"),
            ("What does API stand for?", {"A": "Application Programming Interface", "B": "Advanced Programming Interface", "C": "Application Process Integration", "D": "Automated Programming Interface"}, "A"),
            ("Which protocol is used for secure communication over the internet?", {"A": "HTTP", "B": "FTP", "C": "HTTPS", "D": "SMTP"}, "C"),
            ("What is the output of 2 ** 3 in Python?", {"A": "6", "B": "8", "C": "9", "D": "None of the above"}, "B"),
            ("Which database is a NoSQL database?", {"A": "PostgreSQL", "B": "MySQL", "C": "MongoDB", "D": "SQLite"}, "C"),
            ("What is Docker primarily used for?", {"A": "Containerization", "B": "Database Management", "C": "UI Design", "D": "Network Routing"}, "A"),
        ]
        
        for q, options, ans in questions:
            tq = TechnicalQuestion(
                id=str(uuid.uuid4()),
                department="Tech",
                text=q,
                options=options,
                answer=ans
            )
            db.add(tq)
            
        db.commit()
        print("Successfully seeded 10 MCQ questions for 'Tech' department.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_mcqs()
