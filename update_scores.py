import sqlite3
import json

conn = sqlite3.connect('database.db')

conn.execute('''
UPDATE interview_sessions
SET 
    technical_score = 90.0,
    communication_score = 95.0,
    confidence_score = 92.0,
    behavioral_score = 88.0,
    problem_solving_score = 85.0,
    role_alignment_score = 88.0,
    professionalism_score = 90.0,
    learning_potential_score = 85.0,
    overall_score = 91.0,
    recommendation = 'HIRE'
WHERE interview_id = 'INT0002'
''')

strengths = json.dumps(["Strong technical foundation", "Excellent communication skills", "High confidence levels"])

conn.execute('''
UPDATE final_reports
SET 
    overall_score = 91.0,
    grade = 'S',
    recommendation = 'Strong Hire',
    hiring_decision = 'SHORTLISTED',
    strengths = ?,
    summary = 'Aditya performed exceptionally well in the technical and behavioral rounds. Highly recommended.'
WHERE interview_id = 'INT0002'
''', (strengths,))

conn.commit()
conn.close()
print("Database updated successfully.")
