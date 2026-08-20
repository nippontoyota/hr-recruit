"""Seed role-specific technical test banks (Sales, Driver, and department papers)."""
from __future__ import annotations

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.positions import (
    PAPER_BACK_OFFICE,
    PAPER_DRIVER,
    PAPER_GEM_EXPERIENCED,
    PAPER_GEM_FRESHER,
    PAPER_LOBBY,
)
from app.models.technical_question import TechnicalQuestion
from dept_question_banks import DEPT_PAPERS

GEM_FRESHER = [
    ("R1", "What is the first step when dealing with a new customer?",
     {"A": "Discuss discounts immediately", "B": "Understand the customer's requirements",
      "C": "Ask for payment", "D": "Give a quotation without asking questions"}, "B"),
    ("R2", "What is lead generation?",
     {"A": "Finding potential customers", "B": "Repairing vehicles",
      "C": "Delivering vehicles", "D": "Cleaning vehicles"}, "A"),
    ("R3", "What is the purpose of a test drive?",
     {"A": "To check the customer's driving licence only",
      "B": "To allow the customer to experience the vehicle",
      "C": "To repair the vehicle", "D": "To increase fuel consumption"}, "B"),
    ("R4", "Which is an example of an open-ended sales question?",
     {"A": "Do you want a car?", "B": "Is your budget ₹10 lakh?",
      "C": "What are the main features you are looking for in your new car?",
      "D": "Do you like Toyota?"}, "C"),
    ("R5", "What is a sales quotation?",
     {"A": "A document showing the proposed price and details of a vehicle/product",
      "B": "A vehicle repair manual", "C": "A driving licence", "D": "An insurance claim"}, "A"),
    ("R6", 'What does "follow-up" mean in automobile sales?',
     {"A": "Contacting a potential customer after the initial interaction",
      "B": "Repairing a vehicle", "C": "Washing a vehicle", "D": "Cancelling an enquiry"}, "A"),
    ("R7", 'A customer says, "The price is too high." What should you do first?',
     {"A": "Argue with the customer",
      "B": "Understand the customer's concern and explain the value appropriately",
      "C": "End the conversation", "D": "Immediately give the maximum discount"}, "B"),
    ("R8", "What is a customer objection?",
     {"A": "A concern or reason given by a customer that may prevent a purchase",
      "B": "A vehicle feature", "C": "A spare part", "D": "A service invoice"}, "A"),
    ("R9", "What is the best way to handle a customer objection?",
     {"A": "Ignore it", "B": "Listen, understand, and respond with accurate information",
      "C": "Argue", "D": "Give false promises"}, "B"),
    ("R10", 'What is a vehicle\'s "variant"?',
     {"A": "A particular version/configuration of a vehicle model",
      "B": "The vehicle registration number", "C": "The engine oil brand",
      "D": "The showroom location"}, "A"),
    ("R11", 'What is an automobile\'s "ex-showroom price"?',
     {"A": "Price of the vehicle before applicable on-road charges",
      "B": "Final price including every possible charge",
      "C": "Insurance renewal cost only", "D": "Service cost only"}, "A"),
    ("R12", "What is generally included in an on-road price?",
     {"A": "Applicable registration, insurance, taxes/charges, and vehicle price",
      "B": "Only the vehicle's basic price", "C": "Only fuel cost", "D": "Only service charges"}, "A"),
    ("R13", "What is EMI?",
     {"A": "Equated Monthly Instalment", "B": "Estimated Motor Insurance",
      "C": "Engine Maintenance Indicator", "D": "Electronic Motor Inspection"}, "A"),
    ("R14", "What is the purpose of a vehicle loan?",
     {"A": "To finance the purchase of a vehicle", "B": "To repair tyres only",
      "C": "To increase engine power", "D": "To provide free fuel"}, "A"),
    ("R15", "A customer asks a question you don't know the answer to. What should you do?",
     {"A": "Guess", "B": "Give incorrect information",
      "C": "Verify the information and then respond accurately", "D": "Ignore the question"}, "C"),
    ("R16", "Which quality is most important for a Sales Executive?",
     {"A": "Good communication and listening skills", "B": "Arguing skills",
      "C": "Ignoring customers", "D": "Giving false promises"}, "A"),
    ("R17", "What should a Sales Executive avoid?",
     {"A": "Listening to customers", "B": "Understanding customer needs",
      "C": "Making false promises about price, features, or delivery",
      "D": "Explaining vehicle features"}, "C"),
    ("R18", "What is the ultimate goal of good automobile sales?",
     {"A": "Sell any vehicle regardless of customer needs",
      "B": "Match the right product to the customer's needs while providing a good customer experience",
      "C": "Give the highest possible price", "D": "Avoid customer follow-up"}, "B"),
]

GEM_EXPERIENCED = [
    ("R1", 'A customer says, "I am comparing your vehicle with a competitor." What should you do first?',
     {"A": "Criticize the competitor",
      "B": "Ask what factors are important to the customer and compare objectively",
      "C": "Immediately offer a discount",
      "D": "Tell the customer to buy the competitor's vehicle"}, "B"),
    ("R2", "Your monthly target is 20 vehicles and you have achieved 12 by the 20th of the month. What is the best approach?",
     {"A": "Wait until the end of the month",
      "B": "Analyze the pipeline, prioritize hot leads, and increase follow-ups",
      "C": "Stop contacting old leads", "D": "Give discounts to everyone"}, "B"),
    ("R3", "A customer has completed a test drive but has not booked the vehicle. What is the best next step?",
     {"A": "Never contact the customer again",
      "B": "Follow up to understand feedback, objections, and purchase timeline",
      "C": "Immediately send a discount without asking anything",
      "D": "Mark the customer as lost"}, "B"),
    ("R4", "What does lead conversion rate measure?",
     {"A": "Number of employees in the dealership",
      "B": "Percentage of leads that become customers/sales",
      "C": "Number of vehicles in stock", "D": "Number of service appointments"}, "B"),
    ("R5", "What is the best method for handling a competitor comparison?",
     {"A": "Give false information about the competitor",
      "B": "Understand the customer's priorities and provide factual comparisons",
      "C": "Avoid discussing competitors completely",
      "D": "Insult the competitor's product"}, "B"),
    ("R6", "Which action is most likely to improve customer retention?",
     {"A": "Poor follow-up",
      "B": "Consistent after-sales support and relationship management",
      "C": "Ignoring complaints", "D": "Giving incorrect information"}, "B"),
    ("R7", "Why is inventory management important in automobile sales?",
     {"A": "To balance vehicle availability with demand and avoid unnecessary stock",
      "B": "To keep maximum vehicles regardless of demand",
      "C": "To avoid customer enquiries", "D": "To increase vehicle waiting time"}, "A"),
    ("R8", "What is the purpose of a sales forecast?",
     {"A": "To estimate future sales based on available information and pipeline",
      "B": "To calculate tyre pressure", "C": "To repair vehicles",
      "D": "To determine engine oil level"}, "A"),
    ("R9", "If a dealership has many enquiries but low conversions, what should management first investigate?",
     {"A": "Lead quality, sales process, follow-up, customer objections, and conversion stages",
      "B": "Paint colour only", "C": "Workshop equipment only", "D": "Employee uniforms only"}, "A"),
    ("R10", "What is the purpose of CRM in automobile sales?",
     {"A": "To track and manage customer interactions, leads, follow-ups, and sales activities",
      "B": "To repair engines", "C": "To measure tyre pressure", "D": "To manufacture vehicles"}, "A"),
    ("R11", "Which combination best represents a strong automobile sales professional?",
     {"A": "Product knowledge + communication + customer understanding + follow-up",
      "B": "Discounting + pressure selling",
      "C": "Talking more + listening less",
      "D": "Target achievement without customer satisfaction"}, "A"),
    ("R12", "A customer reports a recurring vehicle problem. What approach best reflects Toyota's problem-solving philosophy?",
     {"A": "Ignore the complaint",
      "B": "Identify the root cause and take appropriate corrective action",
      "C": "Blame the customer", "D": "Replace random parts without diagnosis"}, "B"),
    ("R13", "Which is an example of an open-ended sales question?",
     {"A": "Do you want a car?", "B": "Is your budget ₹10 lakh?",
      "C": "What are the main features you are looking for in your new car?",
      "D": "Do you like Toyota?"}, "C"),
    ("R14", "Which metric is most useful for measuring how effectively enquiries are converted into sales?",
     {"A": "Conversion rate", "B": "Employee attendance",
      "C": "Workshop area", "D": "Number of test-drive cars"}, "A"),
    ("R15", 'What is "need analysis" in automobile sales?',
     {"A": "Understanding the customer's requirements before recommending a vehicle",
      "B": "Calculating employee salary", "C": "Checking workshop tools",
      "D": "Preparing an insurance claim"}, "A"),
    ("R16", 'What does "lead ageing" generally refer to?',
     {"A": "The amount of time a lead has remained in the sales process",
      "B": "The age of the salesperson", "C": "The age of the vehicle",
      "D": "The age of the dealership"}, "A"),
    ("R17", "A customer complains about delayed vehicle delivery. What should you do?",
     {"A": "Avoid the customer",
      "B": "Verify the actual status, communicate transparently, and provide the latest realistic information",
      "C": "Promise an unconfirmed delivery date",
      "D": "Blame another department without checking"}, "B"),
    ("R18", "What is a trade-in/exchange?",
     {"A": "Customer offers an existing vehicle toward the purchase of another vehicle, subject to valuation and applicable terms",
      "B": "Customer changes the vehicle colour",
      "C": "Customer exchanges tyres",
      "D": "Customer changes the registration number"}, "A"),
]

BACK_OFFICE = [
    ("R1", "What is the primary responsibility of a Sales Back Office Coordinator?",
     {"A": "Engine repair", "B": "Managing sales documentation, coordination, and records",
      "C": "Vehicle painting", "D": "Tyre manufacturing"}, "B"),
    ("R2", "What is the main responsibility of a Vehicle Delivery Coordinator?",
     {"A": "Manufacturing vehicles",
      "B": "Coordinating the vehicle delivery process and ensuring required preparations are completed",
      "C": "Repairing engines", "D": "Selling spare parts only"}, "B"),
    ("R3", "Which document records the details of a customer's vehicle booking?",
     {"A": "Booking form/order document", "B": "Driving licence only",
      "C": "Fuel receipt", "D": "Workshop tool list"}, "A"),
    ("R4", "What does PDI stand for in automobile sales?",
     {"A": "Pre-Delivery Inspection", "B": "Product Delivery Invoice",
      "C": "Personal Driver Inspection", "D": "Pre-Dealer Insurance"}, "A"),
    ("R5", "What is an invoice?",
     {"A": "A document showing details of goods/services supplied and applicable charges",
      "B": "A driving licence", "C": "A vehicle inspection tool", "D": "A customer complaint"}, "A"),
    ("R6", "What is VIN commonly used for?",
     {"A": "Unique identification of a vehicle", "B": "Measuring tyre pressure",
      "C": "Calculating fuel consumption", "D": "Identifying the salesperson"}, "A"),
    ("R7", "What does HSRP stand for?",
     {"A": "High Security Registration Plate", "B": "Highway Safety Registration Permit",
      "C": "High Speed Road Plate", "D": "Heavy Safety Registration Process"}, "A"),
    ("R8", "What is road tax?",
     {"A": "A government tax/charge associated with the use or registration of a vehicle, as applicable",
      "B": "Vehicle service charge", "C": "Insurance premium", "D": "Fuel cost"}, "A"),
    ("R9", "What is Form 21 generally related to?",
     {"A": "Sale Certificate", "B": "Insurance Certificate",
      "C": "Driving Licence", "D": "Pollution Certificate"}, "A"),
    ("R10", "What is vehicle registration?",
     {"A": "Officially recording a vehicle with the transport authority",
      "B": "Servicing the vehicle", "C": "Washing the vehicle", "D": "Purchasing accessories"}, "A"),
    ("R11", "Which website is used for vehicle registration and other RTO-related online services in India?",
     {"A": "IRCTC", "B": "Parivahan Sewa", "C": "GST Portal", "D": "DigiLocker"}, "B"),
]

LOBBY = [
    ("R1", "What is the primary responsibility of a Lobby In-Charge in an automobile dealership?",
     {"A": "Repairing vehicles",
      "B": "Welcoming customers and coordinating their showroom experience",
      "C": "Manufacturing vehicles", "D": "Managing spare-parts inventory"}, "B"),
    ("R2", "Which quality is most important for a Lobby In-Charge?",
     {"A": "Poor communication", "B": "Good communication and customer-handling skills",
      "C": "Mechanical repair skills only", "D": "Avoiding customers"}, "B"),
    ("R3", "What does CRM stand for?",
     {"A": "Customer Relationship Management", "B": "Customer Repair Management",
      "C": "Car Registration Method", "D": "Company Resource Management"}, "A"),
    ("R4", "If all Sales Consultants are busy, what should the Lobby In-Charge do?",
     {"A": "Ignore the customer",
      "B": "Politely inform the customer and arrange assistance as soon as possible",
      "C": "Ask the customer to leave", "D": "Give random technical information"}, "B"),
    ("R5", "What is good customer etiquette?",
     {"A": "Interrupting the customer", "B": "Listening carefully and speaking politely",
      "C": "Arguing with the customer", "D": "Ignoring complaints"}, "B"),
    ("R6", "What should a Lobby In-Charge monitor during showroom operations?",
     {"A": "Customer flow, appointments, enquiries, and coordination",
      "B": "Engine oil pressure only", "C": "Workshop machinery only",
      "D": "Vehicle manufacturing"}, "A"),
    ("R7", "If several customers arrive at the same time, what should you do?",
     {"A": "Ignore some customers",
      "B": "Acknowledge all customers and coordinate assistance based on availability and priority",
      "C": "Serve only the last customer", "D": "Ask everyone to leave"}, "B"),
    ("R8", "What is the best approach for a Lobby In-Charge following Toyota's customer-focused philosophy?",
     {"A": "Focus only on completing paperwork",
      "B": "Welcome customers, understand their needs, and ensure smooth coordination",
      "C": "Avoid customer interaction", "D": "Give information without verification"}, "B"),
    ("R9", "If the requested test-drive vehicle is unavailable, what should you do?",
     {"A": "Tell the customer it is available",
      "B": "Explain the situation honestly and coordinate an alternative if possible",
      "C": "Ignore the customer", "D": "Cancel all appointments"}, "B"),
    ("R10", "What should you do if a customer becomes verbally aggressive?",
     {"A": "Respond aggressively",
      "B": "Remain calm, maintain professionalism, and seek appropriate assistance if required",
      "C": "Insult the customer",
      "D": "Record and share their personal details publicly"}, "B"),
]

DRIVER = [
    ("R1",
     "Before changing lanes, what should you do?\nLane മാറുന്നതിന് മുമ്പ് എന്ത് ചെയ്യണം?",
     {"A": "Change immediately / ഉടൻ Lane മാറ്റുക",
      "B": "Use indicator, check mirrors and blind spots / ഇൻഡിക്കേറ്റർ ഉപയോഗിച്ച് മിററുകളും Blind Spot-ഉം പരിശോധിക്കുക",
      "C": "Speed up / വേഗത കൂട്ടുക",
      "D": "Turn off headlights / ഹെഡ്‌ലൈറ്റ് ഓഫ് ചെയ്യുക"}, "B"),
    ("R2",
     "What is defensive driving?\nDefensive Driving എന്നത് എന്താണ്?",
     {"A": "Aggressive driving / അശ്രദ്ധമായ അല്ലെങ്കിൽ ആക്രമണാത്മക ഡ്രൈവിംഗ്",
      "B": "Anticipating hazards and driving safely / അപകടസാധ്യതകൾ മുൻകൂട്ടി മനസ്സിലാക്കി സുരക്ഷിതമായി വാഹനം ഓടിക്കൽ",
      "C": "Driving at high speed / അമിത വേഗത്തിൽ ഡ്രൈവ് ചെയ്യൽ",
      "D": "Frequent overtaking / ഇടയ്ക്കിടെ ഓവർടേക്ക് ചെയ്യൽ"}, "B"),
    ("R3",
     "What should you do at a pedestrian crossing when people are crossing?\nപെഡസ്ട്രിയൻ ക്രോസിംഗിൽ ആളുകൾ റോഡ് മുറിച്ചുകടക്കുമ്പോൾ എന്ത് ചെയ്യണം?",
     {"A": "Speed up / വേഗത കൂട്ടുക",
      "B": "Stop and allow pedestrians to cross safely / വാഹനം നിർത്തി അവർക്ക് സുരക്ഷിതമായി കടന്നുപോകാൻ അവസരം നൽകുക",
      "C": "Overtake / ഓവർടേക്ക് ചെയ്യുക",
      "D": "Honk continuously / തുടർച്ചയായി ഹോൺ മുഴക്കുക"}, "B"),
    ("R4",
     "Why should a driver maintain a safe following distance?\nമുന്നിലുള്ള വാഹനത്തിൽ നിന്ന് സുരക്ഷിതമായ അകലം പാലിക്കേണ്ടത് എന്തുകൊണ്ട്?",
     {"A": "To increase speed / വേഗത കൂട്ടാൻ",
      "B": "To have enough time to react and stop / പ്രതികരിക്കാനും വാഹനം നിർത്താനും മതിയായ സമയം ലഭിക്കാൻ",
      "C": "To save fuel only / ഇന്ധനം ലാഭിക്കാൻ മാത്രം",
      "D": "To overtake easily / എളുപ്പത്തിൽ ഓവർടേക്ക് ചെയ്യാൻ"}, "B"),
    ("R5",
     "What should you do when driving in heavy rain?\nകനത്ത മഴയിൽ വാഹനം ഓടിക്കുമ്പോൾ എന്ത് ചെയ്യണം?",
     {"A": "Increase speed / വേഗത കൂട്ടുക",
      "B": "Reduce speed and maintain more distance / വേഗത കുറച്ച് മുന്നിലുള്ള വാഹനത്തിൽ നിന്ന് കൂടുതൽ അകലം പാലിക്കുക",
      "C": "Switch off headlights / ഹെഡ്‌ലൈറ്റ് ഓഫ് ചെയ്യുക",
      "D": "Drive very close to the vehicle ahead / മുന്നിലുള്ള വാഹനത്തോട് വളരെ അടുത്ത് ഓടിക്കുക"}, "B"),
    ("R6",
     "What should you do when approaching a blind curve?\nBlind Curve സമീപിക്കുമ്പോൾ എന്ത് ചെയ്യണം?",
     {"A": "Increase speed / വേഗത കൂട്ടുക",
      "B": "Reduce speed and be prepared for hazards / വേഗത കുറച്ച് അപകടസാധ്യതകൾക്ക് തയ്യാറായിരിക്കുക",
      "C": "Overtake / ഓവർടേക്ക് ചെയ്യുക",
      "D": "Drive on the opposite side / എതിർവശത്തുകൂടി ഡ്രൈവ് ചെയ്യുക"}, "B"),
    ("R7",
     "If a customer asks you to drive faster than the legal/safe limit, what should you do?\nCustomer നിയമപരമായ/സുരക്ഷിതമായ വേഗപരിധിക്ക് മുകളിൽ ഡ്രൈവ് ചെയ്യാൻ ആവശ്യപ്പെട്ടാൽ എന്ത് ചെയ്യണം?",
     {"A": "Follow the customer's request / Customer പറഞ്ഞതുപോലെ ചെയ്യുക",
      "B": "Maintain safe and lawful driving / സുരക്ഷിതവും നിയമാനുസൃതവുമായ രീതിയിൽ ഡ്രൈവ് ചെയ്യുക",
      "C": "Race another vehicle / മറ്റൊരു വാഹനവുമായി മത്സരിക്കുക",
      "D": "Ignore traffic rules / ട്രാഫിക് നിയമങ്ങൾ അവഗണിക്കുക"}, "B"),
    ("R8",
     "What is hydroplaning?\nHydroplaning എന്നത് എന്താണ്?",
     {"A": "Tyre losing contact/grip with the road due to water / വെള്ളത്തിന്റെ പാളി കാരണം ടയറിന് റോഡുമായുള്ള grip കുറയുന്ന അവസ്ഥ",
      "B": "Engine overheating / എഞ്ചിൻ ചൂടാകൽ",
      "C": "Battery failure / ബാറ്ററി തകരാർ",
      "D": "Brake oil leakage / ബ്രേക്ക് ഓയിൽ ലീക്ക്"}, "A"),
    ("R9",
     "Why is driving at excessive speed dangerous?\nഅമിത വേഗതയിൽ ഡ്രൈവ് ചെയ്യുന്നത് അപകടകരമാകുന്നത് എന്തുകൊണ്ട്?",
     {"A": "It reduces reaction time and increases stopping distance / പ്രതികരിക്കാനുള്ള സമയം കുറയുകയും stopping distance വർദ്ധിക്കുകയും ചെയ്യുന്നു",
      "B": "It always saves fuel / എല്ലായ്പ്പോഴും ഇന്ധനം ലാഭിക്കുന്നു",
      "C": "It improves safety / സുരക്ഷ വർദ്ധിപ്പിക്കുന്നു",
      "D": "It improves braking / ബ്രേക്കിംഗ് മെച്ചപ്പെടുത്തുന്നു"}, "A"),
    ("R10",
     "Which quality is most important for a professional dealership driver?\nഒരു Professional Dealership Driver-ന് ഏറ്റവും പ്രധാനപ്പെട്ട ഗുണം ഏതാണ്?",
     {"A": "High-speed driving / അമിത വേഗതയിൽ ഡ്രൈവ് ചെയ്യൽ",
      "B": "Safe driving, punctuality, vehicle care and discipline / സുരക്ഷിതമായ ഡ്രൈവിംഗ്, സമയനിഷ്ഠ, വാഹനപരിചരണം, അച്ചടക്കം",
      "C": "Frequent horn use / ഇടയ്ക്കിടെ ഹോൺ ഉപയോഗിക്കൽ",
      "D": "Aggressive driving / ആക്രമണാത്മക ഡ്രൈവിംഗ്"}, "B"),
]

PAPERS: dict[str, list[tuple]] = {
    PAPER_GEM_FRESHER: GEM_FRESHER,
    PAPER_GEM_EXPERIENCED: GEM_EXPERIENCED,
    PAPER_BACK_OFFICE: BACK_OFFICE,
    PAPER_LOBBY: LOBBY,
    PAPER_DRIVER: DRIVER,
    **DEPT_PAPERS,
}


def _upsert(db, paper: str, rows: list[tuple]) -> int:
    count = 0
    for qid, text, options, answer in rows:
        found = db.scalar(
            select(TechnicalQuestion).where(
                TechnicalQuestion.id == qid,
                TechnicalQuestion.department == paper,
            )
        )
        if found:
            found.text = text
            found.options = options
            found.answer = answer
        else:
            db.add(
                TechnicalQuestion(
                    id=qid,
                    department=paper,
                    text=text,
                    options=options,
                    answer=answer,
                )
            )
        count += 1
    return count


def seed_role_questions() -> None:
    db = SessionLocal()
    try:
        total = 0
        for paper, rows in PAPERS.items():
            total += _upsert(db, paper, rows)
        db.commit()
        print(f"Seeded {total} role technical-test questions across {len(PAPERS)} papers.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_role_questions()
