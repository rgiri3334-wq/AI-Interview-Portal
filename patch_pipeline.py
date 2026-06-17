import re

with open('Main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = (
    '        results.append({\n'
    '            "id": c.candidate_id,\n'
    '            "name": c.name,\n'
    '            "email": c.email,\n'
    '            "job_role": (latest.role.role_name if (latest and latest.role) else ""),\n'
    '            "experience": resume.experience_years if resume else "",\n'
    '            "created_at": c.registration_date,\n'
    '            "global_score": latest.overall_score if latest else 0.0,\n'
    '            "hiring_decision": latest.recommendation if latest and latest.recommendation else "PENDING",\n'
    '            "status": "COMPLETED" if latest and latest.completed_at else "PENDING"\n'
    '        })\n'
    '    return results'
)

new = (
    '        # Get hiring_decision from FinalReport (single source of truth, same as dashboard)\n'
    '        report = db.query(FinalReport).filter_by(interview_id=latest.interview_id).first() if latest else None\n'
    '        hiring_decision = getattr(report, "hiring_decision", "PENDING") if report else "PENDING"\n'
    '        is_completed = bool(latest and (latest.completed_at or (latest.overall_score or 0) > 0 or hiring_decision == "PROCTORING_ACT"))\n'
    '\n'
    '        results.append({\n'
    '            "id": c.candidate_id,\n'
    '            "interview_id": latest.interview_id if latest else None,\n'
    '            "name": c.name,\n'
    '            "email": c.email,\n'
    '            "job_role": (latest.role.role_name if (latest and latest.role) else ""),\n'
    '            "experience": resume.experience_years if resume else "",\n'
    '            "created_at": c.registration_date,\n'
    '            "global_score": float(latest.overall_score or 0) if latest else 0.0,\n'
    '            "technical_score": float(getattr(latest, "technical_score", 0) or 0) if latest else 0.0,\n'
    '            "hiring_decision": hiring_decision,\n'
    '            "interview_status": "completed" if is_completed else "pending",\n'
    '            "termination_reason": "PROCTORING_ACT" if hiring_decision == "PROCTORING_ACT" else None,\n'
    '            "status": "COMPLETED" if is_completed else "PENDING"\n'
    '        })\n'
    '    return results'
)

if old in content:
    content = content.replace(old, new, 1)
    with open('Main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Pipeline endpoint updated with interview_id and correct hiring_decision')
else:
    # Try with \r\n line endings
    old_crlf = old.replace('\n', '\r\n')
    new_crlf = new.replace('\n', '\r\n')
    if old_crlf in content:
        content = content.replace(old_crlf, new_crlf, 1)
        with open('Main.py', 'w', encoding='utf-8') as f:
            f.write(content)
        print('SUCCESS (CRLF): Pipeline endpoint updated')
    else:
        print('ERROR: Could not find target block. Showing context:')
        idx = content.find('"hiring_decision": latest.recommendation')
        if idx >= 0:
            print(repr(content[idx-200:idx+200]))
