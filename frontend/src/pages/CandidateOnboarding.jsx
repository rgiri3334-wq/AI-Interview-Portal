import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Briefcase, Globe, Upload, Save, CheckCircle, AlertCircle } from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png';

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
        setSuccess('Profile successfully updated! Redirecting to dashboard...');
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Header */}
      <div className="w-full bg-slate-900 h-64 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-900/40 mix-blend-overlay"></div>
        <div className="relative z-10 text-center">
          <img src={logoUrl} alt="Logo" className="w-16 h-16 mx-auto mb-4 object-contain brightness-0 invert" />
          <h1 className="text-3xl font-black text-white tracking-tight">Complete Your Application</h1>
          <p className="text-red-100 font-medium mt-2">Welcome {candidateName}. Please finalize your details to proceed.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Forms) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Professional Background */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#fdfaf9] rounded-3xl p-8 shadow-xl shadow-red-900/5 border border-red-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                <User className="text-red-500" size={24} /> Professional Background
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Briefcase size={14} /> Experience Level <span className="text-red-500">*</span>
                  </label>
                  <select value={experience} onChange={e => setExperience(e.target.value)} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700 shadow-sm">
                    <option value="">Select Experience</option>
                    <option value="Fresher (0 years)">Fresher (0 years)</option>
                    <option value="1-2 years">1-2 years</option>
                    <option value="3-5 years">3-5 years</option>
                    <option value="5-8 years">5-8 years</option>
                    <option value="8+ years">8+ years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    {'</>'} Key Skills <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={skills} onChange={e => setSkills(e.target.value)} required placeholder="e.g. React, Python, AWS" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700 shadow-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    Work Mode
                  </label>
                  <select value={workMode} onChange={e => setWorkMode(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700 shadow-sm">
                    <option value="">Select preference (optional)</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    $ Expected Salary
                  </label>
                  <input type="text" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g. ₹8–12 LPA" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700 shadow-sm" />
                </div>
              </div>
            </motion.div>

            {/* Digital Footprint & Contact */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Globe className="text-red-500" size={24} /> Digital Footprint & Contact
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Phone Number <span className="text-red-500">*</span></label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+1 234 567 8900" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2">LinkedIn</label>
                  <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/username" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2">GitHub</label>
                  <input type="url" value={github} onChange={e => setGithub(e.target.value)} placeholder="github.com/username" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Portfolio</label>
                  <input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} placeholder="yourportfolio.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-700" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column (Resume & Submit) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <div className="bg-[#f4f2f4] rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col h-full">
              <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Upload className="text-red-500" size={24} /> Resume
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 p-6 text-center hover:bg-white hover:border-red-400 transition-all group relative cursor-pointer">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:text-red-500 transition-all">
                  <Upload size={24} className="text-slate-400 group-hover:text-red-500" />
                </div>
                {resume ? (
                  <p className="font-bold text-slate-800 text-sm">{resume.name}</p>
                ) : (
                  <>
                    <p className="font-bold text-slate-800">Upload Resume</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">PDF, DOCX — Max 5MB</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-xl text-sm font-bold flex items-center gap-2">
                  <CheckCircle size={16} /> {success}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full mt-6 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest py-4 px-6 rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Upload className="animate-spin" size={20} /> Saving...</> : 'Save Profile'}
              </button>
            </div>
          </motion.div>

        </form>
      </div>
    </div>
  );
}
