import re

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. json.loads(row.value) -> json.loads(str(row.value))
content = content.replace('json.loads(row.value)', 'json.loads(str(row.value))')

# 2. Assigning to row.value and row.updated_at
# We'll just do a targeted regex replace for these specific attributes where they occur
content = re.sub(r'(row\.value\s*=\s*[^#\n]+)(?<!# type: ignore)\n', r'\1  # type: ignore\n', content)
content = re.sub(r'(row\.updated_at\s*=\s*[^#\n]+)(?<!# type: ignore)\n', r'\1  # type: ignore\n', content)

# 3. Unnecessary float() call at lines 1172 and 1173
content = content.replace('float(i.technical_score)', 'i.technical_score')
content = content.replace('float(i.confidence_score)', 'i.confidence_score')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("patch_types3 done")
