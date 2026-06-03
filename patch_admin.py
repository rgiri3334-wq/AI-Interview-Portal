import re
import os

path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\frontend\src\pages\AdminPanel.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Add Question Form and Question List blocks
pattern = r'\{\/\*\s*Add Question Form\s*\*\/\}.*?\{\/\*\s*Question List\s*\*\/\}.*?<\/div>\s*<\/div>\s*<\/div>'
# Wait, the structure is:
# {/* Add Question Form */}
# <div ...> ... </div>
# </div> (end of left col)
# {/* Question List */}
# <div className="lg:col-span-2"> ... </div>

# Let's just do it with string replace since regex with DOM is tricky.
# Alternatively, I can just replace the entire content between {/* Add Question Form */} and the end of the rubric tab.
start_str = '{/* Add Question Form */}'
end_str = '{/* ── PIPELINE TAB ── */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + '</div>\n          ' + content[end_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
