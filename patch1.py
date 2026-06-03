import re
import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace get_role_config & set_role_config
content = re.sub(
    r'@app\.get\("/api/admin/config/role/\{job_role:path\}", tags=\["Admin"\]\)\nasync def get_role_config.*?return \{"status": "success"\}',
    '''@app.get("/api/admin/config/role/{job_role:path}", tags=["Admin"])
async def get_role_config(job_role: str, db: Session = Depends(get_db)):
    row = db.query(JobRole).filter_by(role_name=job_role).first()
    if not row:
        return {
            "job_role": job_role,
            "persona": "Strictly Technical (System Design)",
            "tech_weight": 40, "comm_weight": 20, "eq_weight": 20, "conf_weight": 20
        }
    return {
        "job_role": row.role_name,
        "persona": row.persona,
        "tech_weight": row.tech_weight,
        "comm_weight": row.comm_weight,
        "eq_weight": row.eq_weight,
        "conf_weight": row.conf_weight
    }

@app.post("/api/admin/config/role", tags=["Admin"])
async def set_role_config(req: RoleConfigSet, db: Session = Depends(get_db)):
    row = db.query(JobRole).filter_by(role_name=req.job_role).first()
    if row:
        row.persona = req.persona
        row.tech_weight = req.tech_weight
        row.comm_weight = req.comm_weight
        row.eq_weight = req.eq_weight
        row.conf_weight = req.conf_weight
        db.commit()
    return {"status": "success"}''',
    content, flags=re.DOTALL
)

# Replace get_leaderboard
content = re.sub(
    r'@app\.get\("/api/leaderboard", tags=\["Recruiter"\]\).*?return \{"total": len\(ranked\), "candidates": ranked\}',
    '''@app.get("/api/leaderboard", tags=["Recruiter"])
async def get_leaderboard(db: Session = Depends(get_db)):
    """Return all candidates ranked by global score. The recruiter's shortlist view."""
    cands = db.query(Candidate).order_by(Candidate.registration_date.desc()).all()
    candidates = []
    
    for c in cands:
        interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)
        latest = interviews[0] if interviews else None
        
        d = {
            "id": c.candidate_id,
            "name": c.name,
            "email": c.email,
            "job_role": c.role.role_name if c.role else "",
            "experience": c.resume.experience_years if c.resume else "",
            "resume_score": getattr(c, "resume_score", 50), # default since resume_score not in new schema Candidate directly
            "resume_status": c.status_id,
            "technical_score": latest.technical_score if latest else 0.0,
            "communication_score": latest.communication_score if latest else 0.0,
            "confidence_score": latest.confidence_score if latest else 0.0,
            "behavioral_score": latest.behavioral_score if latest else 0.0,
            "fluency_score": getattr(latest, "fluency_score", 0.0) if latest else 0.0,
            "eq_score": getattr(latest, "eq_score", 0.0) if latest else 0.0,
            "global_score": latest.overall_score if latest else 0.0,
            "hiring_decision": latest.recommendation if latest and latest.recommendation else "PENDING",
            "interview_status": "completed" if latest and latest.completed_at else "pending",
            "proctoring_warnings": getattr(latest, "proctoring_warnings", 0) if latest else 0,
            "created_at": c.registration_date
        }
        
        if d["global_score"] == 0 and d["technical_score"] > 0:
            d["global_score"] = calculate_global_score(
                resume_score=d["resume_score"],
                technical_score=d["technical_score"],
                communication_score=d["communication_score"],
                confidence_score=d["confidence_score"],
                behavioral_score=d["behavioral_score"],
                fluency_score=d["fluency_score"],
                eq_score=d["eq_score"],
                job_role=d["job_role"],
            )
        candidates.append(d)

    ranked = rank_candidates(candidates)
    return {"total": len(ranked), "candidates": ranked}''',
    content, flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched.")
