import re
import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'@app\.post\("/api/admin/questions/bulk", tags=\["Admin"\]\).*?def add_admin_questions_bulk\(file: UploadFile = File\(\.\.\.\), db: Session = Depends\(get_db\)\):.*?return {"status": "success", "imported": imported_count}'

new_bulk = '''@app.post("/api/admin/questions/bulk", tags=["Admin"])
async def add_admin_questions_bulk(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Bulk import questions from a CSV file."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
    content = await file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload a UTF-8 CSV.")
        
    import csv, io
    reader = csv.DictReader(io.StringIO(text_content))
    required_cols = {"department", "role", "question", "keywords", "difficulty"}
    
    if not reader.fieldnames or not required_cols.issubset(set([f.strip().lower() for f in reader.fieldnames])):
        raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_cols)}")
        
    col_map = {f.strip().lower(): f for f in reader.fieldnames}
    
    imported_count = 0
    skipped_count = 0
    failed_count = 0
    failed_reasons = []
    
    new_structure_map = {}
    ts = datetime.now(timezone.utc).isoformat()
    
    for idx, row in enumerate(reader, start=1):
        try:
            dept_name = row[col_map["department"]].strip() or "General"
            role_name = row[col_map["role"]].strip() or "Any"
            question_text = row[col_map["question"]].strip()
            keywords = row[col_map["keywords"]].strip()
            difficulty = row[col_map["difficulty"]].strip() or "Medium"
            
            if not question_text:
                skipped_count += 1
                continue
                
            # Ensure Dept exists
            dept = db.query(Department).filter_by(department_name=dept_name).first()
            if not dept:
                max_dept = db.query(Department).count()
                dept = Department(department_id=f"DEPT{max_dept+1}", department_name=dept_name)
                db.add(dept)
                db.commit()
                db.refresh(dept)
                
            # Ensure Role exists
            role = db.query(JobRole).filter_by(role_name=role_name, department_id=dept.department_id).first()
            if not role:
                role_id = generate_enterprise_id(db, "ROLE")
                role = JobRole(role_id=role_id, department_id=dept.department_id, role_name=role_name)
                db.add(role)
                db.commit()
                db.refresh(role)
                
            qid = generate_enterprise_id(db, "Q")
            new_q = QuestionBank(
                question_id=qid,
                department_id=dept.department_id,
                role_id=role.role_id,
                question_text=question_text,
                keywords=keywords,
                difficulty=difficulty
            )
            db.add(new_q)
            db.commit()
            imported_count += 1
            
            if dept_name not in new_structure_map:
                new_structure_map[dept_name] = set()
            new_structure_map[dept_name].add(role_name)
            
        except Exception as e:
            db.rollback()
            failed_count += 1
            failed_reasons.append(f"Row {idx}: {str(e)}")
            
    # Merge with existing company structure
    try:
        curr_struct = db.query(GlobalConfig).filter_by(key="company_structure").first()
        company_structure = json.loads(str(curr_struct.value)) if curr_struct else {}
        
        for dept_str, roles in new_structure_map.items():
            if dept_str not in company_structure:
                company_structure[dept_str] = []
            for r_str in roles:
                if r_str not in company_structure[dept_str]:
                    company_structure[dept_str].append(r_str)
                    
        struct_json = json.dumps(company_structure)
        if curr_struct:
            curr_struct.value = struct_json  # type: ignore
            curr_struct.updated_at = ts  # type: ignore
        else:
            import uuid
            db.add(GlobalConfig(id=str(uuid.uuid4()), key="company_structure", value=struct_json, updated_at=ts))
        
        db.commit()
    except Exception as e:
        db.rollback()
        
    return {
        "status": "success",
        "imported": imported_count,
        "skipped": skipped_count,
        "failed": failed_count,
        "errors": failed_reasons[:10]  # Return up to 10 errors
    }'''

content = re.sub(pattern, new_bulk, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
