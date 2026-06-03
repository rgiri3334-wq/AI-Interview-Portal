import re
import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'generate_enterprise_id\s*\(\s*db\s*,\s*[A-Za-z0-9_]+\s*,\s*("[A-Z]+")\s*,\s*"[A-Za-z0-9_]+"\s*\)'
content = re.sub(pattern, r'generate_enterprise_id(db, \1)', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
