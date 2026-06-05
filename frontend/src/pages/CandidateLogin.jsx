/**
 * CandidateLogin.jsx
 * Passwordless candidate login via OTP.
 * Completely separate from admin Login.jsx which remains untouched.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/apiClient';
import logoUrl from '../assets/sterling_logo.png';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 60;

export default function CandidateLogin() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = email input, 2 = OTP screen
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef([]);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (sessionStorage.getItem('candidateId')) {
      navigate('/candidate');
    }
  }, [navigate]);

  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  useEffect(() => {
    if (step !== 2 || resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendCooldown]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await apiClient.sendCandidateOtp({
        identifier: email.trim().toLowerCase(),
        purpose: 'login',
      });
      setStep(2);
      setCountdown(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const updated = [...otpDigits];
    updated[idx] = val;
    setOtpDigits(updated);
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setOtpDigits(pasted.split(''));
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = otpDigits.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }
    if (countdown <= 0) { setError('Your OTP has expired. Please request a new one.'); return; }
    setLoading(true);
    try {
      const res = await apiClient.verifyCandidateOtp({
        identifier: email.trim().toLowerCase(),
        otp_code: code,
        purpose: 'login',
      });
      sessionStorage.setItem('candidateToken', res.token);
      sessionStorage.setItem('candidateId', res.candidate_id);
      sessionStorage.setItem('candidateName', res.name);
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('role', 'candidate');
      setSuccessMsg(`Welcome back, ${res.name}! Taking you to the portal...`);
      setTimeout(() => navigate('/candidate'), 1800);
    } catch (err) {
      const msg = err.message || '';
      setError(msg);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await apiClient.sendCandidateOtp({ identifier: email.trim().toLowerCase(), purpose: 'login' });
      setCountdown(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
          <div className="w-20 h-20 bg-black rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.2)] border border-slate-800 flex items-center justify-center p-3">
            <img src={logoUrl} alt="Sterling Logo" className="w-14 h-14 object-contain mix-blend-screen"
              onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mt-5 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Spark-<span className="text-[#EF4444]">Hire</span>
        </motion.h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-mono tracking-[0.2em] uppercase">
          Candidate Login
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <AnimatePresence mode="wait">

            {/* STEP 1: EMAIL INPUT */}
            {step === 1 && (
              <motion.form key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Welcome Back</h3>
                  <p className="text-sm text-slate-500">Enter your registered Email. We'll send a one-time code — no password needed.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 focus:border-[#EF4444] transition-all sm:text-sm font-medium text-slate-900" />
                </div>
                {error && (
                  <div className="text-sm text-[#EF4444] bg-red-50 p-3 rounded-xl border border-red-100 font-medium">{error}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-[#EF4444] hover:bg-red-600 focus:outline-none transition-all disabled:opacity-50">
                  {loading ? 'Sending Code...' : 'Send Verification Code →'}
                </button>
                <p className="text-center text-sm text-slate-500">
                  New candidate?{' '}
                  <button type="button" onClick={() => navigate('/candidate-register')}
                    className="text-[#EF4444] font-semibold hover:underline">
                    Register here
                  </button>
                </p>
              </motion.form>
            )}

            {/* STEP 2: OTP */}
            {step === 2 && (
              <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Enter Your Code</h3>
                  <p className="text-sm text-slate-500">
                    A 6-digit code was sent to <span className="font-semibold text-slate-700">{email}</span>.
                  </p>
                </div>

                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, idx) => (
                    <input key={idx} ref={(el) => (inputRefs.current[idx] = el)}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-300 rounded-xl focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30 outline-none transition-all text-slate-900 bg-white" />
                  ))}
                </div>

                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-sm text-slate-500">
                      Expires in <span className={`font-bold ${countdown < 60 ? 'text-red-500' : 'text-slate-700'}`}>{formatTime(countdown)}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-red-500 font-semibold">Code expired. Please resend.</span>
                  )}
                </div>

                {error && <div className="text-sm text-[#EF4444] bg-red-50 p-3 rounded-xl border border-red-100 font-medium">{error}</div>}
                {successMsg && <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 font-medium">✅ {successMsg}</div>}

                <button type="submit" disabled={loading || countdown <= 0}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-[#EF4444] hover:bg-red-600 focus:outline-none transition-all disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setStep(1); setError(''); }}
                    className="text-slate-500 hover:text-slate-700 font-medium">← Change Email</button>
                  <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                    className={`font-semibold transition-colors ${resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#EF4444] hover:underline'}`}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
