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
        sessionStorage.setItem('role', 'admin');
        sessionStorage.setItem('adminToken', res.token);
        if (res.email) sessionStorage.setItem('adminEmail', res.email);
        if (res.role) sessionStorage.setItem('adminRole', res.role);
        navigate('/home'); 
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 relative font-sans text-white bg-slate-950 overflow-hidden">
      
      {/* Dynamic Animated Cyber Background */}
      <LoginBackground />

      {/* TOP HEADER BAR & PURE BLACK LOGO BADGE */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
        
        {/* BRAND LOGO BADGE */}
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="relative w-14 h-14 bg-black rounded-2xl border border-slate-800 shadow-[0_0_30px_rgba(220,38,38,0.35)] flex items-center justify-center p-2.5 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-full h-full object-contain relative z-10"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Spark-<span className="text-red-500 drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]">Hire</span>
            </h1>
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.25em]">
              Sterling E-Mobility Control
            </p>
          </div>
        </div>

        {/* MODE TAB SWITCHER */}
        <div className="flex items-center bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl shadow-xl backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'admin'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock size={14} /> Recruiter Access
          </button>
          <button
            onClick={() => setActiveTab('candidate')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'candidate'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={14} /> Candidate Entry
          </button>
        </div>

      </header>

      {/* MAIN DUAL LOGIN WORKSPACE */}
      <main className="relative z-20 w-full max-w-5xl mx-auto my-auto py-8">
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
      </main>

      {/* SECURITY & COMPLIANCE FOOTER */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span>ISO 27001 Certified • End-to-End Encrypted Telemetry</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1"><Cpu size={14} className="text-red-500" /> AI Engine v3.0</span>
          <span>EV Powertrains &amp; Embedded Systems</span>
        </div>
      </footer>

    </PageWrapper>
  );
}
