import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Briefcase, Clock, Code, Upload, ArrowRight, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';

const DEFAULT_STRUCTURE = {
  "Customer Support": ["Customer Success Manager"],
  "Engineering": [
    "Embedded Systems Engineer",
    "BMS Engineer",
    "Motor Control Engineer",
    "Power Electronics Engineer",
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "DevOps Engineer",
    "Data Scientist",
    "AI/ML Engineer"
  ],
  "Finance": ["Financial Analyst", "Accounts Manager"],
  "Human Resources": [
    "HR Specialist",
    "Talent Acquisition Specialist",
    "HR Manager",
    "Learning and Development Specialist",
    "Payroll Specialist"
  ],
  "IT": ["Cybersecurity Analyst", "System Administrator"],
  "Marketing": ["Marketing Specialist", "Brand Manager"],
  "Operations": ["Operations Manager", "Supply Chain Analyst"],
  "Sales": ["Sales Executive", "Sales Manager"]
};
const EXPERIENCE_LEVELS = ['Fresher (0 years)', '1-2 years', '3-5 years', '5-8 years', '8+ years'];

  const Field = ({ label, icon: Icon, value, alwaysFloat, children }) => (
    <div className="relative mt-5">
      {children}
      <label className={`absolute left-3 top-3.5 transition-all pointer-events-none flex items-center gap-2 text-xs font-bold uppercase tracking-wider transform origin-left ${(value || alwaysFloat) ? '-translate-y-6 scale-75 text-red-600 bg-white px-1' : 'text-slate-500 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-red-600 peer-focus:bg-white peer-focus:px-1'}`}>
        <Icon size={14} className={(value || alwaysFloat) ? 'text-red-600' : 'text-slate-400'} /> {label}
      </label>
    </div>
  );

export default function CandidateDetails() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    department: '', job_role: '', experience: '', skills: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  const [companyStructure, setCompanyStructure] = useState(DEFAULT_STRUCTURE);

  React.useEffect(() => {
    let retries = 5;
    const fetchStructure = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/config/global/company_structure`);
        if (res.ok) {
          const data = await res.json();
          if (data.value) setCompanyStructure(JSON.parse(data.value));
        }
      } catch (err) {
        if (retries > 0) {
          retries -= 1;
          setTimeout(fetchStructure, 1000);
        } else {
          console.warn("Failed to fetch dynamic structure after retries:", err);
        }
      }
    };
    fetchStructure();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [isLoginMode, setIsLoginMode] = useState(false);
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
        // LOGIN FLOW: just authenticate, then navigate directly to interview
        const loginRes = await apiClient.loginCandidate({ email: form.email, password: form.password });
        const cid = loginRes.candidate_id || loginRes.id;
        const cname = loginRes.name || form.email;
        localStorage.setItem('candidate_id', cid);
        localStorage.setItem('candidate_name', cname);
        // For login, we need job role selection too if they haven't applied before
        if (!form.job_role || !form.department) {
          setError('Please also select a Department and Job Role to continue.');
          setLoading(false);
          return;
        }
        const appResult = await apiClient.applyForRole(cid, {
          job_role: form.job_role,
          experience: form.experience || 'Fresher (0 years)',
          skills: form.skills || ''
        });
        localStorage.setItem('job_role', form.job_role);
        setCandidateId(cid);

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
      } else {
        // REGISTRATION FLOW: create account then apply for a role
        if (!form.name) { setError('Name is required for registration.'); setLoading(false); return; }
        candidate = await apiClient.registerCandidate({ name: form.name, email: form.email, phone: form.phone, password: form.password });
        
        const cid = candidate.id || candidate.candidate_id;
        const cname = candidate.name || form.name;
        localStorage.setItem('candidate_id', cid);
        localStorage.setItem('candidate_name', cname);
        
        if (!form.job_role || !form.department) {
           setError('Please select a Department and Job Role to apply for.'); setLoading(false); return; 
        }
        const appResult = await apiClient.applyForRole(cid, {
            job_role: form.job_role,
            experience: form.experience || 'Fresher (0 years)',
            skills: form.skills || ''
        });
        
        localStorage.setItem('job_role', form.job_role);
        setCandidateId(cid);

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
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>

          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
              Step 1 of 3
            </div>
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-slate-900">
              Candidate <span className="text-red-700">Registration</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Fill in your details to begin the AI-powered interview session.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            {/* ── Form ── */}
            <form onSubmit={handleSubmit}>
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-6 pb-4 border-b border-slate-200 text-slate-900">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                  {!isLoginMode && (<Field label="Full Name" icon={User} value={form.name}>
                    <input className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-medium"
                      value={form.name} onChange={set('name')} required />
                  </Field>)}
                  <Field label="Password" icon={User} value={form.password}>
                  <input type="password" className="peer w-full px-4 py-4 rounded-xl border border-slate-200 shadow-inner bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-900 font-medium placeholder-transparent" 
                         value={form.password} onChange={set('password')} required />
                </Field>
                <Field label="Email Address" icon={Mail} value={form.email}>
                    <input className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-medium" type="email"
                      value={form.email} onChange={set('email')} required />
                  </Field>
                  {!isLoginMode && (<Field label="Phone Number" icon={Phone} value={form.phone} alwaysFloat={true}>
                    <input className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-medium"
                      type="tel"
                      pattern="^[6-9][0-9]{9}$"
                      maxLength="10"
                      title="Please enter a valid 10-digit Indian phone number starting with 6-9"
                      placeholder="e.g. 9876543210"
                      value={form.phone} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setForm(prev => ({...prev, phone: val}));
                      }} 
                      required
                    />
                  </Field>)}
                  <Field label="Department" icon={Briefcase} value={form.department} alwaysFloat={true}>
                    <select className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all cursor-pointer font-medium"
                      value={form.department} 
                      onChange={e => {
                        const newDept = e.target.value;
                        setForm({...form, department: newDept, job_role: ''});
                      }} required>
                      <option value="" disabled className="text-slate-500">Select Department</option>
                      {Object.keys(companyStructure).map((d) => <option key={d} value={d} className="bg-white text-slate-900">{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Job Role" icon={Briefcase} value={form.job_role} alwaysFloat={true}>
                    <select className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      value={form.job_role} onChange={set('job_role')} disabled={!form.department} required>
                      <option value="" disabled className="text-slate-500">{form.department ? "Select Job Role" : "Select Department First"}</option>
                      {(companyStructure[form.department] || []).map((r) => <option key={r} value={r} className="bg-white text-slate-900">{r}</option>)}
                    </select>
                  </Field>
                </div>

                <h3 className="text-lg font-bold mb-6 pb-4 border-b border-slate-200 text-slate-900 mt-8">
                  Professional Background
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 mb-6">
                  <Field label="Experience Level" icon={Clock} value={form.experience} alwaysFloat={true}>
                    <select className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all cursor-pointer font-medium"
                      value={form.experience} onChange={set('experience')}>
                      <option value="" disabled className="text-slate-500">Select Experience</option>
                      {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l} className="bg-white text-slate-900">{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Key Skills" icon={Code} value={form.skills}>
                    <input className="peer w-full bg-white border border-slate-300 rounded-lg px-3 pt-4 pb-2 text-slate-900 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-medium"
                      value={form.skills} onChange={set('skills')} />
                  </Field>
                </div>

                {/* Resume upload */}
                <h3 className="text-lg font-bold mb-6 pb-4 border-b border-slate-200 text-slate-900 mt-8">
                  Resume (Optional)
                </h3>
                <label className={`flex flex-col items-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${resumeFile ? 'border-red-500 bg-red-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    setResumeFile(e.dataTransfer.files[0]);
                  }}>
                  <input type="file" accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files[0])} />
                  {resumeFile ? (
                    <>
                      <CheckCircle size={32} className="text-red-600 mb-3" />
                      <p className="text-red-700 font-bold">{resumeFile.name}</p>
                      <p className="text-slate-500 text-xs mt-1">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-red-500 mb-3" />
                      <p className="text-slate-900 font-bold">Drop or click to upload</p>
                      <p className="text-slate-500 text-xs mt-1">PDF, DOCX, TXT — max 5MB</p>
                    </>
                  )}
                </label>

                {/* AI Resume Screening Result */}
                {resumeLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-slate-900">Intelligent Assessment Engine is screening your resume…</p>
                      <p className="text-slate-500 text-xs mt-1">Analyzing skills, projects, and job alignment</p>
                    </div>
                  </motion.div>
                )}

                {resumeResult && !resumeLoading && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-5 rounded-xl border ${resumeResult.resume_score >= 70 ? 'bg-green-50 border-green-200' : resumeResult.resume_score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-bold text-sm text-slate-900">AI Resume Screening Complete</p>
                      <CheckCircle size={20} className={resumeResult.resume_score >= 70 ? 'text-green-600' : resumeResult.resume_score >= 50 ? 'text-amber-500' : 'text-red-500'} />
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {(resumeResult.extracted_skills || []).slice(0, 6).map(s => (
                        <span key={s} className="px-2 py-1 bg-white rounded border border-slate-200 text-xs font-bold text-slate-700">{s}</span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{resumeResult.shortlist_reason}</p>
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => navigate('/interview')}
                      className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md">
                      Proceed to AI Interview <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}

                {/* Submit */}
                {!resumeResult && (
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={loading || resumeLoading || (success && !resumeFile)}
                    className={`mt-8 w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm ${success && !resumeFile ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 disabled:opacity-50 disabled:shadow-none'}`}>
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Registering…</>
                    ) : success && !resumeFile ? (
                      <><CheckCircle size={18} /> Registered! Launching Interview…</>
                    ) : (
                      <>{resumeFile ? 'Register & Screen Resume' : 'Start Interview'} <ArrowRight size={18} /></>
                    )}
                  </motion.button>
                )}
              </div>
            <div className="mt-4 text-center">
                  <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-red-600 font-bold hover:underline">
                    {isLoginMode ? "Need to register? Click here." : "Already have an account? Login here."}
                  </button>
                </div>
              </form>

            {/* ── Right Panel ── */}
            <div className="flex flex-col gap-6">
              {/* Session Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold mb-4 text-red-700 tracking-widest uppercase">
                  Interview Session
                </h4>
                <div className="space-y-1">
                  {[
                    { label: 'Duration', value: '30–45 min' },
                    { label: 'Questions', value: '5–8 Dynamic' },
                    { label: 'Format', value: 'Video + Voice' },
                    { label: 'Scoring', value: 'Real-time AI' },
                    { label: 'Report', value: 'Instant PDF' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                      <span className="text-slate-500 font-medium">{label}</span>
                      <span className="font-bold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What to expect */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold mb-4 text-red-700 tracking-widest uppercase">
                  What to Expect
                </h4>
                <div className="space-y-3">
                  {[
                    'Camera & mic access required',
                    'Speak clearly — AI transcribes live',
                    'Emotion tracked via webcam',
                    'Questions adapt to your answers',
                    'Full report generated at the end',
                  ].map((tip) => (
                    <div key={tip} className="flex items-center gap-3 text-sm">
                      <CheckCircle size={14} className="text-red-500 shrink-0" />
                      <span className="text-slate-700 font-medium">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live preview of filled form */}
              {(form.name || form.job_role) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold mb-4 text-red-700 tracking-widest uppercase">
                    Preview
                  </h4>
                  {form.name && <p className="text-xl font-bold mb-1 text-slate-900">{form.name}</p>}
                  {form.job_role && <p className="text-red-600 text-sm font-bold">{form.job_role}</p>}
                  {form.experience && <p className="text-slate-500 text-sm mt-1 font-medium">{form.experience}</p>}
                  {form.skills && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {form.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                        <span key={s} className="px-2 py-1 bg-white rounded border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">{s}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Frosted Glass Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-white border border-red-200 rounded-xl p-4 text-red-600 text-sm font-bold flex items-center gap-3 z-50 shadow-xl"
          >
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
