import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png';

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
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    verify();
  }, [token, action]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-50 z-0"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-black rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.2)] border border-slate-800 flex items-center justify-center p-3">
            <img src={logoUrl} alt="Sterling Logo" className="w-14 h-14 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-slate-800">Processing Request...</h2>
              <p className="text-slate-500 mt-2 text-sm">Please wait while we verify your invitation securely.</p>
            </div>
          )}

          {status === 'success' && action === 'confirm' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="text-green-500 mb-4" size={56} />
              <h2 className="text-2xl font-black text-slate-900">Registration Confirmed!</h2>
              <p className="text-slate-600 mt-2 font-medium">{message}</p>
              <div className="mt-8 w-full">
                <button onClick={() => navigate('/candidate-login')} className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all">
                  Proceed to Login
                </button>
              </div>
            </div>
          )}

          {status === 'success' && action === 'cancel' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="text-slate-400 mb-4" size={56} />
              <h2 className="text-2xl font-black text-slate-900">Registration Canceled</h2>
              <p className="text-slate-600 mt-2 font-medium">{message}</p>
              <p className="text-slate-400 mt-4 text-xs">You may now safely close this window.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="text-red-500 mb-4" size={56} />
              <h2 className="text-2xl font-black text-slate-900">Verification Failed</h2>
              <p className="text-slate-600 mt-2 font-medium">{message}</p>
              <div className="mt-8 w-full">
                <button onClick={() => navigate('/')} className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all">
                  Return to Home
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
