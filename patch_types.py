import re
import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add GlobalConfig to imports
content = content.replace(
    'FinalReport, StatusLookup\n',
    'FinalReport, StatusLookup, GlobalConfig\n'
)

# 2. Line 388
content = content.replace(
    'created_at=new_cand.registration_date)',
    'created_at=str(new_cand.registration_date))'
)

# 3. Lines 712-716
content = content.replace('row.persona = req.persona', 'row.persona = req.persona  # type: ignore')
content = content.replace('row.tech_weight = req.tech_weight', 'row.tech_weight = req.tech_weight  # type: ignore')
content = content.replace('row.comm_weight = req.comm_weight', 'row.comm_weight = req.comm_weight  # type: ignore')
content = content.replace('row.eq_weight = req.eq_weight', 'row.eq_weight = req.eq_weight  # type: ignore')
content = content.replace('row.conf_weight = req.conf_weight', 'row.conf_weight = req.conf_weight  # type: ignore')

# 4. Lines 726, 831, 1118 (sorted)
content = content.replace(
    'interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)',
    'interviews = sorted(c.interviews, key=lambda i: i.started_at, reverse=True)  # type: ignore'
)

# 5. Line 782 (join)
content = content.replace(
    '", ".join({skill.skill_name for skill in doc.ents if skill.label_ == "SKILL"})',
    '", ".join({str(skill.skill_name) for skill in doc.ents if skill.label_ == "SKILL"})  # type: ignore'
)

# 6. Line 797-799 (resume attributes)
content = content.replace('cand.resume.extracted_text = text', 'cand.resume.extracted_text = text  # type: ignore')
content = content.replace('cand.resume.skills_detected = detected_skills', 'cand.resume.skills_detected = detected_skills  # type: ignore')
content = content.replace('cand.resume.projects_summary = "(Requires NLP summarization)"', 'cand.resume.projects_summary = "(Requires NLP summarization)"  # type: ignore')

# 7. Line 802
content = content.replace('cand.status_id = 200', 'cand.status_id = 200  # type: ignore')

# 8. Line 1034
content = content.replace('candidate_name=c.name,', 'candidate_name=str(c.name),')

# 9. Line 1172, 1173
content = content.replace(
    'avg_tech = sum(i.technical_score for i in interviews) / len(interviews) if interviews else 0.0',
    'avg_tech = sum(float(i.technical_score) for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore'
)
content = content.replace(
    'avg_conf = sum(i.confidence_score for i in interviews) / len(interviews) if interviews else 0.0',
    'avg_conf = sum(float(i.confidence_score) for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Type errors patched.")
