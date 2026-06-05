import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../api/apiClient';
import logoUrl from '../assets/sterling_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        navigate('/home'); 
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className="w-24 h-24 bg-black rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.2)] border border-slate-800 flex items-center justify-center p-3 relative overflow-hidden">
            {/* The transparent 3D logo from public folder */}
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-16 h-16 object-contain relative z-10 mix-blend-screen"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback if logo.png is missing */}
            <div className="hidden w-full h-full bg-[#EF4444] text-white flex-col items-center justify-center font-bold text-2xl relative z-10">
              Sterling
            </div>
          </div>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight"
        >
          Spark-<span className="text-[#EF4444]">Hire</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-center text-sm text-slate-500 font-mono tracking-[0.2em] uppercase whitespace-nowrap"
        >
          AI Interview Platform · Sterling E-Mobility
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl flex flex-col md:flex-row gap-6 px-4 sm:px-0"
      >
        <div className="flex-1 bg-white py-10 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100 flex flex-col justify-center">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Corporate Email
              </label>
              <div className="mt-2 relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 focus:border-[#EF4444] transition-all sm:text-sm font-medium text-slate-900"
                  placeholder="admin@sterling.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 focus:border-[#EF4444] transition-all sm:text-sm font-medium text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#EF4444] bg-red-50 p-4 rounded-xl border border-red-100 font-medium flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-[#EF4444] hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4444] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Secure Login'}
              </button>
            </div>
          </form>
          
        </div>

        {/* --- PROMINENT CANDIDATE SECTION --- */}
        <div className="flex-1 bg-white py-10 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100 text-center flex flex-col justify-center">
          <h3 className="text-2xl font-extrabold mb-2 text-slate-900 tracking-tight">Are you a Candidate?</h3>
          <p className="text-slate-500 text-sm font-medium mb-8">
            Access your AI interview portal directly with your email.
          </p>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => navigate('/candidate-login')}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-[#EF4444] hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4444] transition-all"
            >
              Candidate Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/candidate-register')}
              className="w-full flex justify-center py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-all"
            >
              Register Here
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
