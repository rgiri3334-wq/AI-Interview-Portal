import urllib.request
import json

data = json.dumps({
    "name": "Aditya",
    "email": "aditya@test.com",
    "job_role": "Dev",
    "phone": "123",
    "experience": "Fresher",
    "skills": "None"
}).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/candidates', 
    data=data, 
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print("ERROR BODY:", e.read().decode())
except Exception as e:
    print("OTHER ERROR:", str(e))
