import re
import os

# 1. Update apiClient.js
api_path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\frontend\src\api\apiClient.js'
with open(api_path, 'r', encoding='utf-8') as f:
    api_content = f.read()

new_api = """  // ── Candidate Operations ───────────────────────────────────────────────
  registerCandidate: (data) => withRetry(() => api.post('/api/auth/register', data)),
  loginCandidate: (data) => withRetry(() => api.post('/api/auth/login', data)),
  applyForRole: (candidateId, data) => withRetry(() => api.post(`/api/candidates/${candidateId}/apply`, data)),
  getCandidate: (id) => api.get(`/api/candidates/${id}`),

  // ── AI Engine ─────────────────────────────────────────────────────────"""

api_content = re.sub(r'// ── Candidate Operations.*?\n  // ── AI Engine ─────────────────────────────────────────────────────────', new_api, api_content, flags=re.DOTALL)

# Update uploadResume
old_upload = """uploadResume: (candidateId, formData) =>
    withRetry(() =>
      api.post(`/api/candidates/${candidateId}/upload-resume`, formData,"""
new_upload = """uploadResume: (resumeId, interviewId, formData) =>
    withRetry(() =>
      api.post(`/api/resumes/${resumeId}/upload?interview_id=${interviewId}`, formData,"""
api_content = api_content.replace(old_upload, new_upload)

with open(api_path, 'w', encoding='utf-8') as f:
    f.write(api_content)


# 2. Update CandidateDetails.jsx
cand_path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\frontend\src\pages\CandidateDetails.jsx'
with open(cand_path, 'r', encoding='utf-8') as f:
    cand_content = f.read()

if 'password: ' not in cand_content:
    cand_content = cand_content.replace(
        "name: '', email: '', phone: '',",
        "name: '', email: '', phone: '', password: '',"
    )

submit_pattern = r'const handleSubmit = async \(e\) => \{.*?\};'
new_submit = """const [isLoginMode, setIsLoginMode] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in Email and Password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let candidate;
      if (isLoginMode) {
        candidate = await apiClient.loginCandidate({ email: form.email, password: form.password });
      } else {
        if (!form.name) { setError('Name is required for registration.'); setLoading(false); return; }
        candidate = await apiClient.registerCandidate({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      }
      
      localStorage.setItem('candidate_id', candidate.id || candidate.candidate_id);
      localStorage.setItem('candidate_name', candidate.name);
      
      if (!form.job_role || !form.department) {
         setError('Please select a Job Role to apply for.'); setLoading(false); return; 
      }
      const appResult = await apiClient.applyForRole(candidate.id || candidate.candidate_id, {
          job_role: form.job_role,
          experience: form.experience,
          skills: form.skills
      });
      
      localStorage.setItem('job_role', form.job_role);
      setCandidateId(candidate.id || candidate.candidate_id);

      if (resumeFile) {
        setResumeLoading(true);
        const fd = new FormData();
        fd.append('file', resumeFile);
        try {
          const result = await apiClient.uploadResume(appResult.resume_id, appResult.interview_id, fd);
          setResumeResult(result);
        } catch (resumeErr) {
          console.warn('Resume upload failed (non-blocking):', resumeErr.message);
        } finally {
          setResumeLoading(false);
        }
      }

      setSuccess(true);
      if (!resumeFile) {
        setTimeout(() => navigate('/interview'), 1200);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials or API.');
    } finally {
      setLoading(false);
    }
  };"""

cand_content = re.sub(submit_pattern, new_submit, cand_content, flags=re.DOTALL)

if '<Field label="Email Address"' in cand_content and '<Field label="Password"' not in cand_content:
    password_ui = """<Field label="Password" icon={User} value={form.password}>
                  <input type="password" className="peer w-full px-4 py-4 rounded-xl border border-slate-200 shadow-inner bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-900 font-medium placeholder-transparent" 
                         value={form.password} onChange={set('password')} required />
                </Field>"""
    cand_content = cand_content.replace(
        '<Field label="Email Address"',
        password_ui + '\n                <Field label="Email Address"'
    )

toggle_ui = """<div className="mt-4 text-center">
                  <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-red-600 font-bold hover:underline">
                    {isLoginMode ? "Need to register? Click here." : "Already have an account? Login here."}
                  </button>
                </div>"""
if 'Already have an account' not in cand_content:
    cand_content = cand_content.replace(
        '</form>',
        toggle_ui + '\n              </form>'
    )

if '{!isLoginMode && (<Field label="Full Name"' not in cand_content:
    cand_content = cand_content.replace(
        '<Field label="Full Name"',
        '{!isLoginMode && (<Field label="Full Name"'
    )
    cand_content = cand_content.replace(
        "onChange={set('name')} required />\n                </Field>",
        "onChange={set('name')} required />\n                </Field>)}"
    )
    cand_content = cand_content.replace(
        '<Field label="Phone Number"',
        '{!isLoginMode && (<Field label="Phone Number"'
    )
    cand_content = cand_content.replace(
        "setForm(prev => ({...prev, phone: val}));\n                  }} />\n                </Field>",
        "setForm(prev => ({...prev, phone: val}));\n                  }} />\n                </Field>)}"
    )

with open(cand_path, 'w', encoding='utf-8') as f:
    f.write(cand_content)

# 3. Update Main.py for upload_resume
main_path = r'c:\Users\Niraj Singh\OneDrive\Documents\Desktop\Interview portal\Main.py'
with open(main_path, 'r', encoding='utf-8') as f:
    main_content = f.read()

old_resume_route = """@app.post("/api/candidates/{candidate_id}/upload-resume", tags=["Resume Intelligence"])
async def upload_resume(
    candidate_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    \"\"\"Upload a resume PDF/TXT, parse it with Sterling AI, and score it against the job role.\"\"\"
    candidate = db.query(Candidate).filter_by(candidate_id=candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    job_role = candidate.role.role_name if candidate.role else ""
    skills = candidate.resume.skills_detected if candidate.resume else ""
    experience = candidate.resume.experience_years if candidate.resume else \"\"\""""

new_resume_route = """@app.post("/api/resumes/{resume_id}/upload", tags=["Resume Intelligence"])
async def upload_resume(
    resume_id: str,
    interview_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    \"\"\"Upload a resume PDF/TXT, parse it with Sterling AI, and score it against the job role.\"\"\"
    resume = db.query(Resume).filter_by(resume_id=resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    interview = db.query(InterviewSession).filter_by(interview_id=interview_id).first()
    
    job_role = interview.role.role_name if (interview and interview.role) else ""
    skills = resume.skills_detected
    experience = resume.experience_years\"\"\""""

if 'api/resumes/{resume_id}/upload' not in main_content:
    main_content = main_content.replace(old_resume_route, new_resume_route)
    
    # Also update where it saves to db
    main_content = main_content.replace('candidate.resume.extracted_text = resume_text', 'resume.extracted_text = resume_text')
    main_content = main_content.replace('candidate.resume.skills_detected = json.dumps(extracted_skills)', 'resume.skills_detected = json.dumps(extracted_skills)')
    main_content = main_content.replace('db.query(QuestionBank).filter_by(role_id=candidate.role_id).all()', 'db.query(QuestionBank).filter_by(role_id=interview.role_id).all()')
    main_content = main_content.replace('persona = candidate.role.persona if candidate.role else', 'persona = interview.role.persona if (interview and interview.role) else')
    
    with open(main_path, 'w', encoding='utf-8') as f:
        f.write(main_content)

print("Patch complete!")
