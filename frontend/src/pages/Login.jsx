import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  // Auto-redirect if already logged in (session only)
  useEffect(() => {
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
      navigate('/home');
    }
  }, [navigate]);

  // Intro animation sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroComplete(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

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
        if (res.email) {
          sessionStorage.setItem('adminEmail', res.email);
        }
        if (res.role) {
          sessionStorage.setItem('adminRole', res.role);
        }
        navigate('/home'); 
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="flex flex-col justify-center px-4 sm:px-6 lg:px-8">
      
      {/* Dynamic Animated Background */}
      <LoginBackground />

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

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-4 sm:px-6 lg:px-8">
        
        {/* Header / Logo section */}
        <motion.div 
          className="absolute top-8 left-8 flex items-center gap-4 group"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isIntroComplete ? 1 : 0, y: isIntroComplete ? 0 : -20 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="w-14 h-14 bg-slate-950/80 rounded-2xl shadow-[0_0_25px_rgba(225,29,72,0.3)] border border-red-500/20 flex items-center justify-center p-2 group-hover:rotate-12 transition-transform duration-500 backdrop-blur-xl">
            <img 
              src={logoUrl} 
              alt="Sterling Logo" 
              className="w-full h-full object-contain mix-blend-screen"
            />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Spark-<span className="text-red-500 drop-shadow-[0_0_12px_rgba(225,29,72,0.5)]">Hire</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono tracking-[0.2em] uppercase">
              Sterling E-Mobility Control
            </p>
          </div>
        </motion.div>

        {/* Main Content Area: Split Layout */}
        <div className="w-full max-w-7xl mx-auto mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Admin Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: isIntroComplete ? 1 : 0, x: isIntroComplete ? 0 : -50 }}
            transition={{ delay: 0.5, duration: 0.7 }}
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

          {/* Candidate Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: isIntroComplete ? 1 : 0, x: isIntroComplete ? 0 : 50 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="lg:border-l lg:border-white/10 lg:pl-24"
          >
            <CandidateOptions navigate={navigate} />
          </motion.div>

        </div>
      </div>
    </PageWrapper>
  );
}
