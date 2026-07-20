from sqlalchemy import delete
from app.core.database import SessionLocal
from app.models.technical_question import TechnicalQuestion

def seed_questions():
    db = SessionLocal()
    
    # 1. Clear existing questions
    db.execute(delete(TechnicalQuestion))
    
    # 2. Define new questions
    questions = [
        # Sales
        {"id": "S1", "department": "SALES", "text": "What is the most important skill for a salesperson?", "options": {"A": "Ignoring the customer", "B": "Active listening", "C": "Talking constantly", "D": "Being aggressive"}, "answer": "B"},
        {"id": "S2", "department": "SALES", "text": "How should you greet a customer entering the showroom?", "options": {"A": "Ignore them until they ask for help", "B": "With a warm smile and a polite greeting", "C": "Ask them if they have money", "D": "Tell them you are busy"}, "answer": "B"},
        {"id": "S3", "department": "SALES", "text": "What does 'closing a sale' mean?", "options": {"A": "Closing the showroom door", "B": "Successfully finalizing the transaction with the customer", "C": "Giving up on the customer", "D": "Asking the customer to leave"}, "answer": "B"},
        {"id": "S4", "department": "SALES", "text": "If a customer objects to the price, what is the best approach?", "options": {"A": "Argue with them", "B": "Walk away", "C": "Highlight the value and benefits of the product", "D": "Tell them to go elsewhere"}, "answer": "C"},
        {"id": "S5", "department": "SALES", "text": "Why is follow-up important in sales?", "options": {"A": "To annoy the customer", "B": "To build a long-term relationship and ensure satisfaction", "C": "Because the manager said so", "D": "It is not important"}, "answer": "B"},

        # Service
        {"id": "SRV1", "department": "SERVICE", "text": "What is the first step when receiving a vehicle for service?", "options": {"A": "Start dismantling the engine", "B": "Listen to the customer's concerns and inspect the vehicle", "C": "Wash the car", "D": "Take a coffee break"}, "answer": "B"},
        {"id": "SRV2", "department": "SERVICE", "text": "Why is it important to use genuine spare parts?", "options": {"A": "They are more colorful", "B": "To ensure reliability, safety, and optimal performance", "C": "They are cheaper", "D": "It doesn't matter what parts you use"}, "answer": "B"},
        {"id": "SRV3", "department": "SERVICE", "text": "If a repair will take longer than expected, what should you do?", "options": {"A": "Keep the customer waiting without information", "B": "Inform the customer proactively with a new estimated time", "C": "Hide from the customer", "D": "Rush the job and compromise quality"}, "answer": "B"},
        {"id": "SRV4", "department": "SERVICE", "text": "What is a regular maintenance schedule?", "options": {"A": "Fixing the car only when it breaks down completely", "B": "A set of preventative checks and replacements at specified intervals", "C": "Painting the car every year", "D": "Changing the radio station"}, "answer": "B"},
        {"id": "SRV5", "department": "SERVICE", "text": "How should a repaired vehicle be handed back to the customer?", "options": {"A": "Dirty and with greasy steering wheel", "B": "Clean, with an explanation of the work done", "C": "Parked far away", "D": "Without the keys"}, "answer": "B"},

        # Insurance
        {"id": "INS1", "department": "INSURANCE", "text": "What is a premium in auto insurance?", "options": {"A": "A free car wash", "B": "The amount paid for the insurance policy", "C": "The type of fuel used", "D": "The steering wheel cover"}, "answer": "B"},
        {"id": "INS2", "department": "INSURANCE", "text": "What does comprehensive insurance typically cover?", "options": {"A": "Only damage to other vehicles", "B": "Damage to your vehicle from non-collision events (theft, weather) as well as collisions", "C": "Only oil changes", "D": "Nothing"}, "answer": "B"},
        {"id": "INS3", "department": "INSURANCE", "text": "Why is it important for a customer to declare previous accidents?", "options": {"A": "To make the application longer", "B": "To ensure accurate risk assessment and valid coverage", "C": "It is not important", "D": "Just for fun"}, "answer": "B"},
        {"id": "INS4", "department": "INSURANCE", "text": "What is a deductible (or excess)?", "options": {"A": "The amount the customer pays out of pocket before insurance covers the rest", "B": "A discount on the premium", "C": "The total value of the car", "D": "A type of tax"}, "answer": "A"},
        {"id": "INS5", "department": "INSURANCE", "text": "How should you assist a customer filing a claim?", "options": {"A": "Tell them to figure it out themselves", "B": "Guide them through the process with empathy and clear instructions", "C": "Ignore their calls", "D": "Blame them for the accident"}, "answer": "B"},
    ]

    for q_data in questions:
        db.add(TechnicalQuestion(**q_data))
    
    db.commit()
    print("Successfully seeded questions!")

if __name__ == "__main__":
    seed_questions()
