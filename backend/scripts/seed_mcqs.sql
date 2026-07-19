SET search_path TO recruitment;

DELETE FROM technical_questions WHERE department IN ('IT', 'Tech', 'Telecalling Customer Support', 'Sales');

INSERT INTO technical_questions (id, department, text, options, answer) VALUES
('1', 'Tech', 'What does HTTP stand for?', '{"A": "HyperText Transfer Protocol", "B": "HyperText Transmission Protocol", "C": "HyperTransfer Text Protocol", "D": "HyperText Transfer Program"}', 'A'),
('2', 'Tech', 'Which of the following is a backend framework?', '{"A": "React", "B": "Angular", "C": "FastAPI", "D": "Vue"}', 'C'),
('3', 'Tech', 'What is the time complexity of binary search?', '{"A": "O(n)", "B": "O(n log n)", "C": "O(log n)", "D": "O(1)"}', 'C'),
('4', 'Tech', 'Which data structure uses LIFO?', '{"A": "Queue", "B": "Stack", "C": "Tree", "D": "Graph"}', 'B'),
('5', 'Tech', 'What is the primary key in a database?', '{"A": "A unique identifier for a record", "B": "A foreign key", "C": "A string field", "D": "An indexed column"}', 'A'),
('6', 'Tech', 'What does API stand for?', '{"A": "Application Programming Interface", "B": "Advanced Programming Interface", "C": "Application Process Integration", "D": "Automated Programming Interface"}', 'A'),
('7', 'Tech', 'Which protocol is used for secure communication over the internet?', '{"A": "HTTP", "B": "FTP", "C": "HTTPS", "D": "SMTP"}', 'C'),
('8', 'Tech', 'What is the output of 2 ** 3 in Python?', '{"A": "6", "B": "8", "C": "9", "D": "None of the above"}', 'B'),
('9', 'Tech', 'Which database is a NoSQL database?', '{"A": "PostgreSQL", "B": "MySQL", "C": "MongoDB", "D": "SQLite"}', 'C'),
('10', 'Tech', 'What is Docker primarily used for?', '{"A": "Containerization", "B": "Database Management", "C": "UI Design", "D": "Network Routing"}', 'A');

INSERT INTO technical_questions (id, department, text, options, answer) VALUES
('11', 'Telecalling Customer Support', 'How should you handle an angry customer?', '{"A": "Argue back", "B": "Listen actively and empathize", "C": "Hang up", "D": "Transfer immediately without listening"}', 'B'),
('12', 'Telecalling Customer Support', 'What does CRM stand for?', '{"A": "Customer Relationship Management", "B": "Consumer Retail Marketing", "C": "Customer Response Mechanism", "D": "Company Resource Management"}', 'A'),
('13', 'Telecalling Customer Support', 'When answering a call, what is the best practice?', '{"A": "Wait for them to speak first", "B": "Greet and state company name", "C": "Say Hello?", "D": "Put on hold immediately"}', 'B'),
('14', 'Telecalling Customer Support', 'What is active listening?', '{"A": "Listening to music while working", "B": "Focusing fully on the speaker and responding thoughtfully", "C": "Interrupting to ask questions", "D": "Writing down everything word-for-word"}', 'B'),
('15', 'Telecalling Customer Support', 'What should you do if you don’t know the answer to a customer’s question?', '{"A": "Guess the answer", "B": "Say I don’t know", "C": "Tell them you will find out and follow up", "D": "Transfer to another random department"}', 'C');
