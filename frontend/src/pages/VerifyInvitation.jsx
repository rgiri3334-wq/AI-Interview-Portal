/**
 * VerifyInvitation.jsx
 * Verification flow for invitation link tokens.
 * Cyber-Industrial Dark Glassmorphism.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png';
import PageWrapper from '../components/Layout/PageWrapper';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function VerifyInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const action = searchParams.get('action'); // 'confirm' or 'cancel'
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !action) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/candidates/verify?token=${token}&action=${action}`);
        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Verification failed.');
        }
      } catch (err) { console.error(err);
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    verify();
  }, [token, action]);

  return (
    <PageWrapper className="flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Cyber Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-slate-950/80 rounded-3xl shadow-[0_0_40px_rgba(225,29,72,0.25)] border border-red-500/20 flex items-center justify-center p-3 backdrop-blur-xl">
            <img src={logoUrl} alt="Sterling Logo" className="w-12 h-12 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/75 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-white tracking-tight">Processing Verification...</h2>
              <p className="text-slate-400 mt-2 text-xs">Verifying your candidate token with enterprise credentials.</p>
            </div>
          )}

          {status === 'success' && action === 'confirm' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="text-emerald-400 mb-4" size={56} />
              <h2 className="text-2xl font-black text-white tracking-tight">Registration Confirmed!</h2>
              <p className="text-slate-300 mt-2 text-sm font-medium">{message}</p>
              <div className="mt-8 w-full">
                <button onClick={() => navigate('/candidate-login')} className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/30 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 focus:outline-none transition-all active:scale-[0.99]">
                  Proceed to Candidate Login →
                </button>
              </div>
            </div>
          )}

          {status === 'success' && action === 'cancel' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="text-slate-500 mb-4" size={56} />
              <h2 className="text-2xl font-black text-white tracking-tight">Registration Canceled</h2>
              <p className="text-slate-300 mt-2 text-sm font-medium">{message}</p>
              <p className="text-slate-400 mt-4 text-xs">You may now safely close this window.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="text-red-500 mb-4" size={56} />
              <h2 className="text-2xl font-black text-white tracking-tight">Verification Failed</h2>
              <p className="text-slate-300 mt-2 text-sm font-medium">{message}</p>
              <div className="mt-8 w-full">
                <button onClick={() => navigate('/')} className="w-full flex justify-center py-3 px-4 border border-white/10 rounded-xl text-sm font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 transition-all">
                  Return to Home
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
