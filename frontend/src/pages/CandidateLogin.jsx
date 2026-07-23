/**
 * CandidateLogin.jsx
 * Passwordless candidate login via OTP with Cyber-Industrial Dark Glassmorphic styling.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/apiClient';
import logoUrl from '../assets/sterling_logo.png';
import PageWrapper from '../components/Layout/PageWrapper';

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
      navigate('/candidate-home');
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
      setTimeout(() => navigate('/candidate-home'), 1800);
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
    <PageWrapper className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Cyber Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
          <div className="w-20 h-20 bg-black rounded-3xl shadow-[0_0_35px_rgba(220,38,38,0.35)] border border-slate-800 flex items-center justify-center p-3.5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            <img src={logoUrl} alt="Sterling Logo" className="w-full h-full object-contain relative z-10" />
          </div>
        </motion.div>
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mt-5 text-center text-3xl font-extrabold text-white tracking-tight">
          Spark-<span className="text-red-500 drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]">Hire</span>
        </motion.h2>
        <p className="mt-1 text-center text-xs text-slate-400 font-mono tracking-[0.25em] uppercase">
          Autonomous Candidate Portal
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-950/75 backdrop-blur-2xl py-10 px-6 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]">
          <AnimatePresence mode="wait">

            {/* STEP 1: EMAIL INPUT */}
            {step === 1 && (
              <motion.form key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 mb-1 tracking-tight">Candidate Entry</h3>
                  <p className="text-xs text-slate-400">Enter your registered email address to receive your OTP code.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3.5 bg-slate-900/90 border border-white/10 rounded-xl shadow-inner placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm font-medium text-white" />
                </div>
                {error && (
                  <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-500/30 font-medium">{error}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/30 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 focus:outline-none transition-all disabled:opacity-50 active:scale-[0.99]">
                  {loading ? 'Transmitting Code...' : 'Send Verification Code →'}
                </button>
              </motion.form>
            )}

            {/* STEP 2: OTP */}
            {step === 2 && (
              <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-1">Enter Verification Code</h3>
                  <p className="text-xs text-slate-400">
                    Enter the 6-digit code transmitted to <span className="font-semibold text-slate-200">{email}</span>.
                  </p>
                </div>

                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, idx) => (
                    <input key={idx} ref={(el) => (inputRefs.current[idx] = el)}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold border border-white/10 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/40 outline-none transition-all text-white bg-slate-900/90 shadow-inner" />
                  ))}
                </div>

                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-xs text-slate-400">
                      Code expires in <span className={`font-bold font-mono ${countdown < 60 ? 'text-red-400' : 'text-slate-200'}`}>{formatTime(countdown)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-red-400 font-semibold">Code expired. Please request a new one.</span>
                  )}
                </div>

                {error && <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-500/30 font-medium">{error}</div>}
                {successMsg && <div className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 font-medium">✅ {successMsg}</div>}

                <button type="submit" disabled={loading || countdown <= 0}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg shadow-red-600/30 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 focus:outline-none transition-all disabled:opacity-50 active:scale-[0.99]">
                  {loading ? 'Authenticating...' : 'Verify & Launch Portal'}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setStep(1); setError(''); }}
                    className="text-slate-400 hover:text-slate-200 font-medium transition-colors">← Change Email</button>
                  <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                    className={`font-semibold transition-colors ${resendCooldown > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-red-400 hover:text-red-300 underline'}`}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
