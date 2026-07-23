/**
 * CandidateOnboarding.jsx
 * Candidate profile completion form with Cyber-Industrial Dark Glassmorphic styling.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Briefcase, Globe, Upload, Save, CheckCircle, AlertCircle } from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png';
import PageWrapper from '../components/Layout/PageWrapper';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const candidateId = sessionStorage.getItem('candidateId');
  const candidateName = sessionStorage.getItem('candidateName') || 'Candidate';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form State
  const [experience, setExperience] = useState('');
  const [skills, setSkills] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [salary, setSalary] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [resume, setResume] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Resume file must be less than 5MB.');
        return;
      }
      setResume(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!experience || !skills || !phone || !resume) {
      setError('Please fill out all required fields and upload your resume.');
      return;
    }

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('experience_level', experience);
    formData.append('key_skills', skills);
    formData.append('work_mode', workMode);
    formData.append('expected_salary', salary);
    formData.append('phone', phone);
    formData.append('linkedin', linkedin);
    formData.append('github', github);
    formData.append('portfolio', portfolio);
    formData.append('resume', resume);

    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/complete-profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('candidateToken')}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile successfully updated! Redirecting to portal...');
        sessionStorage.setItem('profileCompleted', 'true');
        setTimeout(() => {
          navigate('/candidate-home');
        }, 2000);
      } else {
        setError(data.detail || 'Failed to complete profile. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="pb-16">
      {/* Header Banner */}
      <div className="w-full bg-slate-950/80 border-b border-white/10 h-64 relative overflow-hidden flex items-center justify-center backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-transparent to-red-600/10 pointer-events-none" />
        <div className="relative z-10 text-center px-4">
          <div className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center p-2.5 mx-auto mb-4 shadow-lg shadow-red-600/20">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain mix-blend-screen" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Complete Your Profile</h1>
          <p className="text-slate-400 font-medium text-sm mt-2">Welcome {candidateName}. Finalize your details to unlock your assessment workspace.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Professional Background */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User className="text-red-500" size={20} /> Professional Background
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Briefcase size={14} className="text-red-500" /> Experience Level <span className="text-red-500">*</span>
                  </label>
                  <select value={experience} onChange={e => setExperience(e.target.value)} required className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white font-medium">
                    <option value="">Select Experience</option>
                    <option value="Fresher (0 years)">Fresher (0 years)</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="3-5 years">3-5 years</option>
                    <option value="5-8 years">5-8 years</option>
                    <option value="8+ years">8+ years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    Key Skills <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={skills} onChange={e => setSkills(e.target.value)} required placeholder="e.g. React, Python, AWS" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Work Mode
                  </label>
                  <select value={workMode} onChange={e => setWorkMode(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white font-medium">
                    <option value="">Select preference (optional)</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Expected Salary
                  </label>
                  <input type="text" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. ₹8–12 LPA" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white font-medium" />
                </div>
              </div>
            </motion.div>

            {/* Digital Footprint & Contact */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-950/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Globe className="text-red-500" size={20} /> Digital Footprint & Contact
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+1 234 567 8900" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">LinkedIn</label>
                  <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">GitHub</label>
                  <input type="url" value={github} onChange={e => setGithub(e.target.value)} placeholder="github.com/username" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Portfolio</label>
                  <input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="yourportfolio.com" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none text-sm text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <div className="bg-slate-950/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col h-full">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Upload className="text-red-500" size={20} /> Resume
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-2xl bg-slate-900/50 p-6 text-center hover:bg-slate-900 hover:border-red-500/50 transition-all group relative cursor-pointer">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-red-600 transition-all">
                  <Upload size={20} className="text-slate-300 group-hover:text-white" />
                </div>
                {resume ? (
                  <p className="font-bold text-white text-sm">{resume.name}</p>
                ) : (
                  <>
                    <p className="font-bold text-white text-sm">Upload Resume</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mt-2">PDF, DOCX — Max 5MB</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-950/40 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-500/30">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-emerald-950/40 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-500/30">
                  <CheckCircle size={14} /> {success}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full mt-6 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs active:scale-[0.99]">
                {loading ? <><Upload className="animate-spin" size={16} /> Saving Profile...</> : 'Save Profile & Continue →'}
              </button>
            </div>
          </motion.div>

        </form>
      </div>
    </PageWrapper>
  );
}
