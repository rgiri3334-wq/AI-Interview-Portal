import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, Lock, Sparkles, Cpu } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import logoUrl from '../assets/sterling_logo.png';
import PageWrapper from '../components/Layout/PageWrapper';

// Import modular components
import LoginBackground from '../components/login/LoginBackground';
import AdminLoginForm from '../components/login/AdminLoginForm';
import CandidateOptions from '../components/login/CandidateOptions';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'candidate'
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  // Intro animation sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroComplete(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-redirect if already logged in (session only)
  useEffect(() => {
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
      navigate('/home');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await apiClient.adminLogin({ email, password });
      if (res.status === 'success') {
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('role', res.role || 'admin');
        if (res.email) sessionStorage.setItem('adminEmail', res.email);
        if (res.role) sessionStorage.setItem('adminRole', res.role);
        if (res.token) sessionStorage.setItem('adminToken', res.token);
        // We will call the onSuccess callback if provided, else navigate immediately
        return res;
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setLoading(false);
      throw err;
    }
  };

  return (
    <PageWrapper className="min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 relative font-sans text-slate-900 bg-slate-50 overflow-hidden">
      
      {/* Dynamic Animated Background */}
      <LoginBackground />

      {/* Intro Red Curtain Overlay */}
      <AnimatePresence>
        {!isIntroComplete && (
          <motion.div
            key="intro-overlay"
            className="fixed inset-0 z-[100] flex pointer-events-none"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`col-${i}`}
                className="h-full bg-red-600 flex-1 origin-top"
                initial={{ scaleY: 1 }}
                exit={{ scaleY: 0 }}
                transition={{ 
                  duration: 0.7, 
                  ease: [0.77, 0, 0.175, 1],
                  delay: i * 0.08
                }}
              />
            ))}

            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              <div className="relative flex flex-col items-center">
                <div className="bg-slate-950/90 border border-white/10 p-6 rounded-3xl shadow-2xl flex items-center justify-center">
                  <img 
                    src={logoUrl} 
                    alt="Sterling Logo" 
                    className="w-28 h-28 object-contain relative z-10"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER BAR */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isIntroComplete ? 1 : 0, y: isIntroComplete ? 0 : -20 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="relative z-20 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-6"
      >
        
        {/* BRAND LOGO BADGE */}
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="relative w-14 h-14 bg-black rounded-2xl border border-slate-800 shadow-[0_0_20px_rgba(220,38,38,0.2)] flex items-center justify-center p-2.5 group-hover:scale-105 transition-transform duration-300">
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-full h-full object-contain relative z-10 drop-shadow-sm"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Spark-<span className="text-red-600">Hire</span>
            </h1>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[0.25em]">
              Sterling E-Mobility Control
            </p>
          </div>
        </div>

        {/* MODE TAB SWITCHER */}
        <div className="flex items-center bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'admin'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Lock size={14} /> Recruiter Access
          </button>
          <button
            onClick={() => setActiveTab('candidate')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'candidate'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <User size={14} /> Candidate Entry
          </button>
        </div>

      </motion.header>

      {/* MAIN DUAL LOGIN WORKSPACE */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isIntroComplete ? 1 : 0, y: isIntroComplete ? 0 : 20 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="relative z-20 w-full max-w-5xl mx-auto my-auto py-8"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'admin' ? (
            <motion.div
              key="admin-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              <AdminLoginForm 
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                error={error}
                loading={loading}
                handleLogin={handleLogin}
              />
            </motion.div>
          ) : (
            <motion.div
              key="candidate-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              <CandidateOptions navigate={navigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* SECURITY & COMPLIANCE FOOTER */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: isIntroComplete ? 1 : 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="relative z-20 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6 text-[11px] font-mono text-slate-500"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>ISO 27001 Certified • End-to-End Encrypted Telemetry</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1"><Cpu size={14} className="text-red-600" /> AI Engine v3.0</span>
          <span>EV Powertrains &amp; Embedded Systems</span>
        </div>
      </motion.footer>

    </PageWrapper>
  );
}

 
console.log(typeof Sparkles !== "undefined" ? Sparkles : "");
