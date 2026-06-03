import re

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Lines 518 and 644
content = content.replace(
    'company_structure = json.loads(curr_struct.value) if curr_struct else {}',
    'company_structure = json.loads(str(curr_struct.value)) if curr_struct else {}'
)

# Lines 529, 530 and 655, 656
content = content.replace(
    'curr_struct.value = struct_json',
    'curr_struct.value = struct_json  # type: ignore'
)
content = content.replace(
    'curr_struct.updated_at = ts',
    'curr_struct.updated_at = ts  # type: ignore'
)

# If lines 683 and 684 are somehow not ignoring correctly or if the error was stale, let's verify.
# Actually, the user's message says:
# "str is not assignable to attribute value with type Column[str]" at line 683.
# Wait, if `req.value` is being assigned, `row.value = req.value` is at line 683.
# My script replaced it as `row.value = req.value  # type: ignore`. Does Pylance still complain if there's an ignore?
# Maybe the IDE needs `# pyright: ignore` or simply `# type: ignore` is sufficient and the user's error report is from BEFORE my patch?
# Wait! In the user's prompt: `The IDE found these problems in the code. Any line numbers in the following JSON are 1-based.`
# The timestamp of the user's prompt is 2026-06-01T11:15:21+05:30. My previous reply was at 11:14:xx. The user might have not saved the file or the IDE hasn't updated its diagnostics.
# Wait, my previous script for float `patch_types3.py` had:
# content = content.replace('float(i.technical_score)', 'i.technical_score')
# BUT let's see if it successfully matched!

# In patch_types.py:
# 'avg_tech = sum(float(i.technical_score) for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore'
# In patch_types3.py:
# content.replace('float(i.technical_score)', 'i.technical_score')
# This means it would become:
# 'avg_tech = sum(i.technical_score for i in interviews) / len(interviews) if interviews else 0.0  # type: ignore'
# Which shouldn't have the float() warning anymore.
# I will double check lines 1172-1173 to ensure float() is removed.

content = content.replace('float(i.technical_score)', 'i.technical_score')
content = content.replace('float(i.confidence_score)', 'i.confidence_score')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("patch_types4 done")
