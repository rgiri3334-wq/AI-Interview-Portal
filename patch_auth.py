import re
import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add hashlib import
if 'import hashlib' not in content:
    content = content.replace('import json\n', 'import json\nimport hashlib\n')

# Replace Pydantic schemas
schema_pattern = r'class CandidateCreate\(BaseModel\):.*?class CandidateResponse\(BaseModel\):\n    id: str; name: str; email: str; job_role: str; created_at: str'
new_schemas = '''class CandidateRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    phone: str = Field(default="")
    password: str = Field(..., min_length=6)

class CandidateLogin(BaseModel):
    email: str
    password: str

class ApplicationCreate(BaseModel):
    job_role: str
    experience: str = Field(default="Fresher (0 years)")
    skills: str = Field(default="")

class CandidateResponse(BaseModel):
    id: str; name: str; email: str; phone: str; created_at: str'''

content = re.sub(schema_pattern, new_schemas, content, flags=re.DOTALL)

# Replace the Candidates endpoints
routes_pattern = r'@app\.post\("/api/candidates", response_model=CandidateResponse, tags=\["Candidates"\]\).*?def delete_candidate\(candidate_id: str, db: Session = Depends\(get_db\)\):\n    cand = db\.query\(Candidate\)\.filter\(Candidate\.candidate_id == candidate_id\)\.first\(\)\n    if not cand: raise HTTPException\(status_code=404, detail="Candidate not found"\)\n    db\.delete\(cand\)\n    db\.commit\(\)\n    return {"status": "success"}'
new_routes = '''@app.post("/api/auth/register", response_model=CandidateResponse, tags=["Auth"])
async def register_candidate(data: CandidateRegister, db: Session = Depends(get_db)):
    existing = db.query(Candidate).filter(Candidate.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please login.")
    
    cid = generate_enterprise_id(db, "CAN")
    pwd_hash = hashlib.sha256(data.password.encode()).hexdigest()
    
    new_cand = Candidate(
        candidate_id=cid,
        name=data.name,
        email=data.email,
        phone=data.phone,
        password_hash=pwd_hash
    )
    db.add(new_cand)
    db.commit()
    
    return CandidateResponse(id=cid, name=data.name, email=data.email, phone=data.phone, created_at=str(new_cand.registration_date))

@app.post("/api/auth/login", tags=["Auth"])
async def login_candidate(data: CandidateLogin, db: Session = Depends(get_db)):
    pwd_hash = hashlib.sha256(data.password.encode()).hexdigest()
    cand = db.query(Candidate).filter(Candidate.email == data.email, Candidate.password_hash == pwd_hash).first()
    if not cand:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"status": "success", "candidate_id": cand.candidate_id, "name": cand.name}

@app.get("/api/candidates/{candidate_id}", tags=["Candidates"])
async def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand: raise HTTPException(status_code=404, detail="Candidate not found")
    
    interviews = []
    for i in cand.interviews:
        interviews.append({
            "interview_id": i.interview_id,
            "role": i.role.role_name if i.role else "",
            "department": i.role.department.department_name if i.role and i.role.department else "",
            "date": i.started_at,
            "status_id": i.status_id,
            "score": i.overall_score
        })
        
    return {
        "id": cand.candidate_id,
        "name": cand.name,
        "email": cand.email,
        "phone": cand.phone,
        "created_at": cand.registration_date,
        "interviews": interviews
    }

@app.post("/api/candidates/{candidate_id}/apply", tags=["Candidates"])
async def apply_for_role(candidate_id: str, data: ApplicationCreate, db: Session = Depends(get_db)):
    cand = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not cand: raise HTTPException(status_code=404, detail="Candidate not found")
    
    role = db.query(JobRole).filter(JobRole.role_name == data.job_role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid job role. Role not found in database.")
    
    rid = generate_enterprise_id(db, "RES")
    new_resume = Resume(
        resume_id=rid,
        candidate_id=cand.candidate_id,
        experience_years=data.experience,
        skills_detected=data.skills
    )
    db.add(new_resume)
    
    iid = generate_enterprise_id(db, "INT")
    new_interview = InterviewSession(
        interview_id=iid,
        candidate_id=cand.candidate_id,
        role_id=role.role_id,
        status_id=100
    )
    db.add(new_interview)
    
    db.commit()
    
    # Pre-warm AI session logic usually here
    
    return {"status": "success", "interview_id": iid, "resume_id": rid}'''

content = re.sub(routes_pattern, new_routes, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
