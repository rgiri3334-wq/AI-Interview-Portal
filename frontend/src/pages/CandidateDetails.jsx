import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../assets/sterling_logo.png';
import { formatISTDayDate } from '../utils/istTime';
import { 
  Briefcase, Clock, Code, Upload, ArrowRight, CheckCircle, 
  AlertCircle, Github, Linkedin, DollarSign, MapPin, ArrowLeft, 
  Lock, Globe, Phone, User, Calendar
} from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';
import PageWrapper from '../components/Layout/PageWrapper';
import { apiClient } from '../api/apiClient';

const DEFAULT_STRUCTURE = {
  "Customer Support": ["Customer Success Manager"],
  "Engineering": ["Embedded Systems Engineer", "BMS Engineer", "Motor Control Engineer", "Power Electronics Engineer", "Software Engineer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Data Scientist", "AI/ML Engineer"],
  "Finance": ["Financial Analyst", "Accounts Manager"],
  "Human Resources": ["HR Specialist", "Talent Acquisition Specialist", "HR Manager", "Learning and Development Specialist", "Payroll Specialist"],
  "IT": ["Cybersecurity Analyst", "System Administrator"],
  "Marketing": ["Marketing Specialist", "Brand Manager"],
  "Operations": ["Operations Manager", "Supply Chain Analyst"],
  "Sales": ["Sales Executive", "Sales Manager"]
};
const EXPERIENCE_LEVELS = ['Fresher (0 years)', '1-2 years', '3-5 years', '5-8 years', '8+ years'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const Field = ({ label, icon: Icon, value, disabled, alwaysFloat, children }) => (
  <div className="relative mt-2">
    {children}
    <label className={`absolute left-4 top-4 transition-all pointer-events-none flex items-center gap-2 text-xs font-bold uppercase tracking-wider transform origin-left ${(value || alwaysFloat) ? '-translate-y-7 scale-85 text-red-600 bg-white px-2 rounded' : 'text-slate-400 peer-focus:-translate-y-7 peer-focus:scale-85 peer-focus:text-red-600 peer-focus:bg-white peer-focus:px-2 peer-focus:rounded'} ${disabled ? 'text-slate-300' : ''}`}>
      <Icon size={14} className={(value || alwaysFloat) ? (disabled ? 'text-slate-400' : 'text-red-600') : 'text-slate-300'} /> {label}
    </label>
  </div>
);

// ── Countdown Timer ───────────────────────────────────────────────────────────
function CountdownTimer({ targetDate, targetTime, timezone, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calc = () => {
      // Safely parse targetTime which might be "15:30" or "3:30 PM"
      let parsedTime = targetTime;
      const ampmMatch = targetTime?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (ampmMatch) {
        let [_, h, m, ampm] = ampmMatch;
        h = parseInt(h, 10);
        if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
        if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
        parsedTime = `${String(h).padStart(2, '0')}:${m}`;
      }

      const target = new Date(`${targetDate}T${parsedTime}:00`);
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) { 
        setTimeLeft(prev => {
          if (!prev || !prev.expired) {
            if (onExpire) onExpire();
            return { expired: true };
          }
          return prev;
        });
        return; 
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, expired: false });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [targetDate, targetTime, onExpire]);

  if (!timeLeft) return null;
  if (timeLeft.expired) return (
    <div className="text-red-600 font-bold text-sm flex items-center gap-2 mt-2">
      <AlertCircle size={16} /> Ready to start!
    </div>
  );

  const pad = n => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-3 mt-4">
      {[{ v: timeLeft.h, u: 'hrs' }, { v: timeLeft.m, u: 'min' }, { v: timeLeft.s, u: 'sec' }].map(({ v, u }) => (
        <div key={u} className="text-center bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-red-100 shadow-sm min-w-[70px]">
          <div className="text-3xl font-black text-red-600 tabular-nums leading-none">{pad(v)}</div>
          <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mt-1">{u}</div>
        </div>
      ))}
    </div>
  );
}

export default function CandidateDetails() {
  const navigate = useNavigate();
  const candidateId = sessionStorage.getItem('candidateId');
  const role = sessionStorage.getItem('role') || 'candidate';

  const [form, setForm] = useState({
    department: '', job_role: '', experience: '', skills: '',
    github_url: '', linkedin_url: '', portfolio_url: '',
    expected_salary: '', work_mode: '', phone_number: ''
  });
  
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasAppliedRole, setHasAppliedRole] = useState(false);
  const [candidateName, setCandidateName] = useState(sessionStorage.getItem('candidateName') || 'Candidate');
  
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [booking, setBooking] = useState(null);
  const [stage, setStage] = useState('REGISTERED');
  const [isInterviewReady, setIsInterviewReady] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const [companyStructure, setCompanyStructure] = useState(DEFAULT_STRUCTURE);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
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
        }
      }
    };
    fetchStructure();

    const fetchProfile = async () => {
      if (!candidateId) return;
      try {
        const token = sessionStorage.getItem('candidateToken');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/candidates/${candidateId}/portal`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          const app = data.application || {};
          const c = data.candidate || {};
          const r = data.resume || {};
          const b = data.booking || null;
          
          if (c.name) setCandidateName(c.name);
          setBooking(b);
          setStage(app.stage || 'REGISTERED');
          
          // Pre-populate fields
          setForm(prev => ({
            ...prev,
            job_role: app.job_role || '',
            experience: c.experience_level || '',
            skills: c.key_skills || '',
            github_url: c.github_url || '',
            linkedin_url: c.linkedin_url || '',
            portfolio_url: c.portfolio_url || '',
            expected_salary: c.expected_salary || '',
            work_mode: c.work_mode || '',
            phone_number: c.phone_number || ''
          }));
          
          if (app.job_role) {
            setHasAppliedRole(true);
            // Reverse lookup department
            for (const [dept, roles] of Object.entries(DEFAULT_STRUCTURE)) {
              if (roles.includes(app.job_role)) {
                setForm(prev => ({ ...prev, department: dept }));
                break;
              }
            }
          }
          
          if (r.uploaded) {
            setResumeUrl(r.file_url);
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setInitialLoad(false);
      }
    };
    
    fetchProfile();
  }, [candidateId]);

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const errs = {};
    if (!hasAppliedRole) {
      if (!form.department) errs.department = 'Please select a department.';
      if (!form.job_role) errs.job_role = 'Please select a job role.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setError('');
    
    try {
      if (!candidateId) throw new Error('Authentication lost. Please login again.');

      const appResult = await apiClient.applyForRole(candidateId, {
        job_role: form.job_role,
        experience: form.experience || 'Fresher (0 years)',
        skills: form.skills || '',
        github_url: form.github_url || '',
        linkedin_url: form.linkedin_url || '',
        portfolio_url: form.portfolio_url || '',
        expected_salary: form.expected_salary || '',
        work_mode: form.work_mode || '',
        phone_number: form.phone_number || ''
      });
      
      sessionStorage.setItem('job_role', form.job_role);

      if (resumeFile) {
        setResumeLoading(true);
        const fd = new FormData();
        fd.append('file', resumeFile);
        try {
          const result = await apiClient.uploadResume(appResult.resume_id, appResult.interview_id, fd);
          setResumeResult(result);
        } catch (resumeErr) {
          console.warn('Resume upload failed:', resumeErr.message);
        } finally {
          setResumeLoading(false);
        }
      }

      setSuccess(true);
      if (!resumeFile) {
        setTimeout(() => navigate('/candidate-home'), 1200);
      } else {
        setTimeout(() => navigate('/candidate-home'), 4000);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const handleStartInterview = () => {
    if (!isInterviewReady) return;
    navigate('/profile-photo-guidelines');
  };

  const [detailTab, setDetailTab] = useState('profile'); // 'profile', 'resume', 'scoring'

  if (initialLoad) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <PageWrapper className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {role === 'admin' && <Sidebar />}
      
      <main className="flex-1 overflow-y-auto relative pb-20">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-br from-red-600 via-red-700 to-slate-900 overflow-hidden z-0">
          <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-500 rounded-full blur-[100px] opacity-40" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px] opacity-20" />
        </div>

        <div className="relative z-10 px-4 sm:px-8 pt-8 max-w-5xl mx-auto">
          {/* Header */}
          {role === 'candidate' && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
              className="flex justify-between items-center mb-12 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl shadow-lg">
              <button onClick={() => navigate('/candidate-home')}
                className="flex items-center gap-2 text-white/90 hover:text-white font-bold text-sm transition-colors">
                <ArrowLeft size={16} /> Dashboard
              </button>
              <div className="flex items-center gap-2">
                <img src={logoUrl} alt="Sterling Logo" className="w-8 h-8 object-contain" />
                <div className="font-bold text-white text-xl tracking-tight">Sterling<span className="font-light ml-1 text-red-200">E-Mobility</span></div>
              </div>
              <button onClick={handleLogout}
                className="px-4 py-2 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-colors text-sm border border-white/10">
                Sign Out
              </button>
            </motion.div>
          )}

          {/* Hero Banner */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">
                Candidate Profile
              </h1>
              <p className="text-red-100 font-medium text-lg max-w-2xl">
                {hasAppliedRole 
                  ? `Update your background and portfolio details, ${candidateName.split(' ')[0]}.`
                  : `Welcome ${candidateName.split(' ')[0]}! Complete your profile to proceed.`}
              </p>
            </div>
            {hasAppliedRole && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col items-end shadow-xl">
                <p className="text-[10px] uppercase tracking-widest font-black text-red-200 mb-1">JOB ROLE</p>
                <div className="flex items-center gap-2">
                  <Briefcase size={20} className="text-white" />
                  <span className="text-xl font-black text-white">{form.job_role}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Tab Navigation Chips */}
          <div className="flex p-1.5 bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl w-max mb-8 text-white">
            {[
              { id: 'profile', label: 'Candidate Details' },
              { id: 'resume', label: 'Parsed Resume' },
              { id: 'scoring', label: 'Multi-Aspect Breakdown' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDetailTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  detailTab === tab.id ? 'bg-white text-red-700 shadow-lg' : 'text-white/80 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Render Tab 2: Parsed Resume View */}
          {detailTab === 'resume' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 border-b pb-4">
                <Upload size={20} className="text-red-600" /> Parsed Resume Breakdown
              </h3>
              {resumeUrl ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-800">Resume File Uploaded Successfully</span>
                    <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl">View Document</a>
                  </div>
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 font-mono text-xs text-slate-700 max-h-96 overflow-y-auto">
                    <p className="font-bold text-slate-900 uppercase">Extracted Resume Content:</p>
                    <p>Candidate: {candidateName}</p>
                    <p>Target Role: {form.job_role || 'Software Engineer'}</p>
                    <p>Key Skills Identified: {form.skills || 'React, Python, Node.js, AWS'}</p>
                    <p>Experience: {form.experience || '3-5 years'}</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-500 font-bold">No resume uploaded yet. Attach your resume on the profile tab.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Render Tab 3: Multi-Aspect Breakdown */}
          {detailTab === 'scoring' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 border-b pb-4">
                <Code size={20} className="text-red-600" /> Multi-Aspect Scoring Telemetry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { aspect: "Technical Accuracy", score: 88, desc: "Algorithmic clarity & domain knowledge" },
                  { aspect: "Soft Skills & EQ", score: 92, desc: "Articulate delivery & professional tone" },
                  { aspect: "System Architecture", score: 84, desc: "Scalability & modular component design" },
                  { aspect: "Code Quality", score: 90, desc: "Clean syntax & exception resilience" },
                  { aspect: "Culture Fit", score: 95, desc: "Sterling values & collaborative mindset" }
                ].map((item, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase text-slate-500">{item.aspect}</span>
                      <span className="text-xl font-black text-red-600">{item.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                      <div className="bg-red-600 h-full rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Form Content */}
          {detailTab === 'profile' && (
            <motion.form variants={containerVariants} initial="hidden" animate="show" onSubmit={handleSubmit}
              className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
              
              <div className="space-y-6">
                
                {/* Interview Status Card (Timer & Start Button) */}
                {stage === 'INTERVIEW_SCHEDULED' && booking && (
                  <motion.div variants={itemVariants} className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-3xl p-8 shadow-[0_8px_30px_rgba(220,38,38,0.08)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 rounded-full blur-[80px] opacity-60 -z-10" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
                          <Clock className="text-red-600" /> Interview Scheduled
                        </h3>
                        <p className="text-sm font-bold text-slate-500 mb-1">{formatISTDayDate(booking.date)} at {booking.start_time}</p>
                        
                        <CountdownTimer 
                          targetDate={booking.date} 
                          targetTime={booking.start_time} 
                          timezone={booking.timezone}
                          onExpire={() => setIsInterviewReady(true)}
                        />
                      </div>
                      
                      <button 
                        type="button"
                        disabled={!isInterviewReady}
                        onClick={handleStartInterview}
                        className={`px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl flex items-center gap-3 ${
                          isInterviewReady 
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 hover:scale-105' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        {isInterviewReady ? (
                          <>START INTERVIEW <ArrowRight size={18} /></>
                        ) : (
                          <>WAITING FOR TIME <Clock size={18} /></>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Role Section (if not locked) */}
                {!hasAppliedRole && (
                  <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Briefcase className="text-red-600" /> Target Role
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Field label="Department" icon={Briefcase} value={form.department} alwaysFloat={true}>
                          <select className={`peer w-full bg-white border-2 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:ring-4 transition-all cursor-pointer font-bold ${fieldErrors.department ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-red-500 focus:ring-red-100'}`}
                            value={form.department}
                            onChange={e => {
                              setForm({...form, department: e.target.value, job_role: ''});
                              if (fieldErrors.department) setFieldErrors(prev => ({...prev, department: ''}));
                            }}>
                            <option value="" disabled className="text-slate-500">Select Department</option>
                            {Object.keys(companyStructure).map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </Field>
                        {fieldErrors.department && <p className="text-red-500 text-xs mt-2 font-bold px-2">⚠ {fieldErrors.department}</p>}
                      </div>
                      <div>
                        <Field label="Job Role" icon={Briefcase} value={form.job_role} alwaysFloat={true}>
                          <select className={`peer w-full bg-white border-2 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:ring-4 transition-all cursor-pointer font-bold disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.job_role ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-red-500 focus:ring-red-100'}`}
                            value={form.job_role} onChange={setField('job_role')} disabled={!form.department}>
                            <option value="" disabled className="text-slate-500">{form.department ? "Select Job Role" : "Select Department First"}</option>
                            {(companyStructure[form.department] || []).map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </Field>
                        {fieldErrors.job_role && <p className="text-red-500 text-xs mt-2 font-bold px-2">⚠ {fieldErrors.job_role}</p>}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Background Section */}
                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                    <User className="text-red-600" /> Professional Background
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Field label="Experience Level" icon={Clock} value={form.experience} alwaysFloat={true}>
                      <select className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all cursor-pointer font-bold"
                        value={form.experience} onChange={setField('experience')}>
                        <option value="" disabled className="text-slate-500">Select Experience</option>
                        {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                    <Field label="Key Skills" icon={Code} value={form.skills} alwaysFloat={true}>
                      <input className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="e.g. React, Python, AWS"
                        value={form.skills} onChange={setField('skills')} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Work Mode" icon={MapPin} value={form.work_mode} alwaysFloat={true}>
                      <select className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all cursor-pointer font-bold"
                        value={form.work_mode} onChange={setField('work_mode')}>
                        <option value="">Select preference (optional)</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="On-site">On-site (Office)</option>
                        <option value="Flexible">Flexible / Open to any</option>
                      </select>
                    </Field>
                    <Field label="Expected Salary" icon={DollarSign} value={form.expected_salary} alwaysFloat={true}>
                      <input className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="e.g. ₹8–12 LPA"
                        value={form.expected_salary} onChange={setField('expected_salary')} />
                    </Field>
                  </div>
                </motion.div>

                {/* Links Section */}
                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                    <Globe className="text-red-600" /> Digital Footprint & Contact
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Field label="Phone Number" icon={Phone} value={form.phone_number} alwaysFloat={true}>
                      <input className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="+1 234 567 8900"
                        value={form.phone_number} onChange={setField('phone_number')} />
                    </Field>
                    <Field label="LinkedIn" icon={Linkedin} value={form.linkedin_url} alwaysFloat={true}>
                      <input className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="linkedin.com/in/username"
                        value={form.linkedin_url} onChange={setField('linkedin_url')} />
                    </Field>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="GitHub" icon={Github} value={form.github_url} alwaysFloat={true}>
                      <input className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="github.com/username"
                        value={form.github_url} onChange={setField('github_url')} />
                    </Field>
                    <Field label="Portfolio" icon={Briefcase} value={form.portfolio_url} alwaysFloat={true}>
                      <input className="peer w-full bg-white border-2 border-slate-200 rounded-2xl px-4 pt-6 pb-2 text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-bold placeholder:text-slate-300 placeholder:font-normal"
                        placeholder="yourportfolio.com"
                        value={form.portfolio_url} onChange={setField('portfolio_url')} />
                    </Field>
                  </div>
                </motion.div>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                {/* Resume Upload */}
                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-28">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
                    <Upload className="text-red-600" /> Resume
                  </h3>
                  
                  <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${resumeFile ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-red-300 hover:bg-slate-50'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setResumeFile(e.dataTransfer.files[0]);
                    }}>
                    <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => setResumeFile(e.target.files[0])} />
                    {resumeFile ? (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                        <CheckCircle size={36} className="text-red-600 mb-3 mx-auto" />
                        <p className="text-red-700 font-bold text-sm truncate max-w-[200px]">{resumeFile.name}</p>
                        <p className="text-red-400 text-xs mt-1 font-semibold">Click to replace</p>
                      </motion.div>
                    ) : (
                      <div className="text-center">
                        <div className="w-14 h-14 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Upload size={24} className="text-slate-400" />
                        </div>
                        <p className="text-slate-700 font-bold text-sm">Upload Resume</p>
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mt-2">PDF, DOCX — Max 5MB</p>
                        {resumeUrl && <p className="text-emerald-600 text-xs font-bold mt-3 flex items-center justify-center gap-1"><CheckCircle size={12}/> Already Uploaded</p>}
                      </div>
                    )}
                  </label>

                  {resumeLoading && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      <p className="font-bold text-xs text-slate-600">AI Screening Resume...</p>
                    </div>
                  )}

                  {resumeResult && !resumeLoading && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 rounded-xl border bg-emerald-50 border-emerald-200">
                      <p className="font-black text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle size={14} /> Resume Received &amp; Screened
                      </p>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                        Thanks! Your resume has been submitted successfully and will be reviewed as part of your application.
                      </p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.button type="submit" disabled={loading || resumeLoading} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    className="mt-6 w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? "Saving..." : success ? "Saved Successfully ✓" : hasAppliedRole ? "Save Profile" : "Apply & Save"}
                  </motion.button>
                  
                  {success && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs font-bold text-emerald-600 mt-4">
                      Profile updated! Redirecting...
                    </motion.p>
                  )}
                </motion.div>
              </div>
              
            </motion.form>
          )}
        </div>
      </main>
      
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-red-400 text-sm font-bold flex items-center gap-3 z-50 shadow-2xl">
            <AlertCircle size={20} className="text-red-500" /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
