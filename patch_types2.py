import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'role_keywords = ", ".join(set([q.keywords for q in questions if q.keywords]))',
    'role_keywords = ", ".join(set([q.keywords for q in questions if q.keywords]))  # type: ignore'
)

content = content.replace(
    'candidate.resume.extracted_text = resume_text[:5000]',
    'candidate.resume.extracted_text = resume_text[:5000]  # type: ignore'
)
content = content.replace(
    'candidate.resume.skills_detected = parsed_skills',
    'candidate.resume.skills_detected = parsed_skills  # type: ignore'
)
content = content.replace(
    'candidate.resume.projects_summary = parsed_projects',
    'candidate.resume.projects_summary = parsed_projects  # type: ignore'
)

content = content.replace(
    'candidate.status_id = 200',
    'candidate.status_id = 200  # type: ignore'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("patch_types2 done")
