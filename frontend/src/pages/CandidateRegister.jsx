/**
 * CandidateRegister.jsx
 * Passwordless registration: Step 1 → details form, Step 2 → OTP verification.
 * Features: strict email format validation, full international phone code selector.
 * Admin Login.jsx is completely separate and untouched.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/apiClient';
import Sidebar from '../components/Layout/Sidebar';
import logoUrl from '../assets/sterling_logo.png';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 60;

// ── Email validation (strict RFC-5322 inspired regex) ─────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
function isValidEmail(email) {
  return EMAIL_REGEX.test(email.trim());
}

// ── Complete world country phone codes ────────────────────────────────────────
// Sorted: India first (default), then alphabetically by country name
const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+93',  flag: '🇦🇫', name: 'Afghanistan' },
  { code: '+355', flag: '🇦🇱', name: 'Albania' },
  { code: '+213', flag: '🇩🇿', name: 'Algeria' },
  { code: '+376', flag: '🇦🇩', name: 'Andorra' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+1',   flag: '🇦🇬', name: 'Antigua and Barbuda' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+374', flag: '🇦🇲', name: 'Armenia' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+43',  flag: '🇦🇹', name: 'Austria' },
  { code: '+994', flag: '🇦🇿', name: 'Azerbaijan' },
  { code: '+1',   flag: '🇧🇸', name: 'Bahamas' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+1',   flag: '🇧🇧', name: 'Barbados' },
  { code: '+375', flag: '🇧🇾', name: 'Belarus' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { code: '+501', flag: '🇧🇿', name: 'Belize' },
  { code: '+229', flag: '🇧🇯', name: 'Benin' },
  { code: '+975', flag: '🇧🇹', name: 'Bhutan' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+387', flag: '🇧🇦', name: 'Bosnia and Herzegovina' },
  { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+673', flag: '🇧🇳', name: 'Brunei' },
  { code: '+359', flag: '🇧🇬', name: 'Bulgaria' },
  { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  { code: '+238', flag: '🇨🇻', name: 'Cabo Verde' },
  { code: '+855', flag: '🇰🇭', name: 'Cambodia' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
  { code: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: '+236', flag: '🇨🇫', name: 'Central African Republic' },
  { code: '+235', flag: '🇹🇩', name: 'Chad' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+269', flag: '🇰🇲', name: 'Comoros' },
  { code: '+243', flag: '🇨🇩', name: 'Congo (DRC)' },
  { code: '+242', flag: '🇨🇬', name: 'Congo (Republic)' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+385', flag: '🇭🇷', name: 'Croatia' },
  { code: '+53',  flag: '🇨🇺', name: 'Cuba' },
  { code: '+357', flag: '🇨🇾', name: 'Cyprus' },
  { code: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: '+45',  flag: '🇩🇰', name: 'Denmark' },
  { code: '+253', flag: '🇩🇯', name: 'Djibouti' },
  { code: '+1',   flag: '🇩🇲', name: 'Dominica' },
  { code: '+1',   flag: '🇩🇴', name: 'Dominican Republic' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+240', flag: '🇬🇶', name: 'Equatorial Guinea' },
  { code: '+291', flag: '🇪🇷', name: 'Eritrea' },
  { code: '+372', flag: '🇪🇪', name: 'Estonia' },
  { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+679', flag: '🇫🇯', name: 'Fiji' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+241', flag: '🇬🇦', name: 'Gabon' },
  { code: '+220', flag: '🇬🇲', name: 'Gambia' },
  { code: '+995', flag: '🇬🇪', name: 'Georgia' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+30',  flag: '🇬🇷', name: 'Greece' },
  { code: '+1',   flag: '🇬🇩', name: 'Grenada' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+224', flag: '🇬🇳', name: 'Guinea' },
  { code: '+245', flag: '🇬🇼', name: 'Guinea-Bissau' },
  { code: '+592', flag: '🇬🇾', name: 'Guyana' },
  { code: '+509', flag: '🇭🇹', name: 'Haiti' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+36',  flag: '🇭🇺', name: 'Hungary' },
  { code: '+354', flag: '🇮🇸', name: 'Iceland' },
  { code: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: '+98',  flag: '🇮🇷', name: 'Iran' },
  { code: '+964', flag: '🇮🇶', name: 'Iraq' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+1',   flag: '🇯🇲', name: 'Jamaica' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+7',   flag: '🇰🇿', name: 'Kazakhstan' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+686', flag: '🇰🇮', name: 'Kiribati' },
  { code: '+383', flag: '🇽🇰', name: 'Kosovo' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+996', flag: '🇰🇬', name: 'Kyrgyzstan' },
  { code: '+856', flag: '🇱🇦', name: 'Laos' },
  { code: '+371', flag: '🇱🇻', name: 'Latvia' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
  { code: '+231', flag: '🇱🇷', name: 'Liberia' },
  { code: '+218', flag: '🇱🇾', name: 'Libya' },
  { code: '+423', flag: '🇱🇮', name: 'Liechtenstein' },
  { code: '+370', flag: '🇱🇹', name: 'Lithuania' },
  { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
  { code: '+261', flag: '🇲🇬', name: 'Madagascar' },
  { code: '+265', flag: '🇲🇼', name: 'Malawi' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+960', flag: '🇲🇻', name: 'Maldives' },
  { code: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: '+356', flag: '🇲🇹', name: 'Malta' },
  { code: '+692', flag: '🇲🇭', name: 'Marshall Islands' },
  { code: '+222', flag: '🇲🇷', name: 'Mauritania' },
  { code: '+230', flag: '🇲🇺', name: 'Mauritius' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+691', flag: '🇫🇲', name: 'Micronesia' },
  { code: '+373', flag: '🇲🇩', name: 'Moldova' },
  { code: '+377', flag: '🇲🇨', name: 'Monaco' },
  { code: '+976', flag: '🇲🇳', name: 'Mongolia' },
  { code: '+382', flag: '🇲🇪', name: 'Montenegro' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+258', flag: '🇲🇿', name: 'Mozambique' },
  { code: '+95',  flag: '🇲🇲', name: 'Myanmar' },
  { code: '+264', flag: '🇳🇦', name: 'Namibia' },
  { code: '+674', flag: '🇳🇷', name: 'Nauru' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+227', flag: '🇳🇪', name: 'Niger' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+850', flag: '🇰🇵', name: 'North Korea' },
  { code: '+389', flag: '🇲🇰', name: 'North Macedonia' },
  { code: '+47',  flag: '🇳🇴', name: 'Norway' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+680', flag: '🇵🇼', name: 'Palau' },
  { code: '+970', flag: '🇵🇸', name: 'Palestine' },
  { code: '+507', flag: '🇵🇦', name: 'Panama' },
  { code: '+675', flag: '🇵🇬', name: 'Papua New Guinea' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+40',  flag: '🇷🇴', name: 'Romania' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+1',   flag: '🇰🇳', name: 'Saint Kitts and Nevis' },
  { code: '+1',   flag: '🇱🇨', name: 'Saint Lucia' },
  { code: '+1',   flag: '🇻🇨', name: 'Saint Vincent and the Grenadines' },
  { code: '+685', flag: '🇼🇸', name: 'Samoa' },
  { code: '+378', flag: '🇸🇲', name: 'San Marino' },
  { code: '+239', flag: '🇸🇹', name: 'Sao Tome and Principe' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+221', flag: '🇸🇳', name: 'Senegal' },
  { code: '+381', flag: '🇷🇸', name: 'Serbia' },
  { code: '+248', flag: '🇸🇨', name: 'Seychelles' },
  { code: '+232', flag: '🇸🇱', name: 'Sierra Leone' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+421', flag: '🇸🇰', name: 'Slovakia' },
  { code: '+386', flag: '🇸🇮', name: 'Slovenia' },
  { code: '+677', flag: '🇸🇧', name: 'Solomon Islands' },
  { code: '+252', flag: '🇸🇴', name: 'Somalia' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+211', flag: '🇸🇸', name: 'South Sudan' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+249', flag: '🇸🇩', name: 'Sudan' },
  { code: '+597', flag: '🇸🇷', name: 'Suriname' },
  { code: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: '+963', flag: '🇸🇾', name: 'Syria' },
  { code: '+886', flag: '🇹🇼', name: 'Taiwan' },
  { code: '+992', flag: '🇹🇯', name: 'Tajikistan' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: '+670', flag: '🇹🇱', name: 'Timor-Leste' },
  { code: '+228', flag: '🇹🇬', name: 'Togo' },
  { code: '+676', flag: '🇹🇴', name: 'Tonga' },
  { code: '+1',   flag: '🇹🇹', name: 'Trinidad and Tobago' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { code: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: '+993', flag: '🇹🇲', name: 'Turkmenistan' },
  { code: '+688', flag: '🇹🇻', name: 'Tuvalu' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+998', flag: '🇺🇿', name: 'Uzbekistan' },
  { code: '+678', flag: '🇻🇺', name: 'Vanuatu' },
  { code: '+379', flag: '🇻🇦', name: 'Vatican City' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: '+967', flag: '🇾🇪', name: 'Yemen' },
  { code: '+260', flag: '🇿🇲', name: 'Zambia' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
];

export default function CandidateRegister() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1 fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [countryCode, setCountryCode] = useState('+91'); // Default: India
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef([]);

  // Derived: full phone string
  const fullPhone = phoneNumber.trim() ? `${countryCode}${phoneNumber.trim()}` : '';

  // Real-time email format error
  const emailFormatError = emailTouched && email && !isValidEmail(email)
    ? 'Please enter a valid email address (e.g. name@example.com).'
    : '';

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

    // ── Client-side guards ─────────────────────────────────────────────────
    if (!name.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!isValidEmail(email)) {
      setError('The email address format is invalid. Please enter a valid email (e.g. name@domain.com).');
      return;
    }

    setLoading(true);
    try {
      await apiClient.sendCandidateOtp({
        identifier: email.trim().toLowerCase(),
        purpose: 'registration',
        name: name.trim(),
      });
      setStep(2);
      setCountdown(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      // Map specific backend errors to user-friendly messages
      const msg = err.message || '';
      if (msg.includes('already registered')) {
        setError('This email is already registered. Please login instead.');
      } else if (msg.includes('Too many')) {
        setError('Too many requests. Please wait a minute before trying again.');
      } else {
        setError(msg || 'Failed to send verification code. Please check your email and try again.');
      }
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
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits of your code.'); return; }
    if (countdown <= 0) { setError('Your code has expired. Please request a new one.'); return; }
    setLoading(true);
    try {
      const res = await apiClient.verifyCandidateOtp({
        identifier: email.trim().toLowerCase(),
        otp_code: code,
        purpose: 'registration',
        name: name.trim(),
        phone: fullPhone,
      });
      sessionStorage.setItem('candidateToken', res.token);
      sessionStorage.setItem('candidateId', res.candidate_id);
      sessionStorage.setItem('candidateName', res.name);
      setSuccessMsg(`Welcome, ${res.name}! Redirecting you to the portal...`);
      setTimeout(() => navigate('/candidate'), 1800);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('expired')) {
        setError('Your code has expired. Please request a new one using the Resend button.');
      } else if (msg.includes('Too many')) {
        setError('Too many incorrect attempts. This code has been invalidated. Please request a new one.');
      } else if (msg.includes('Incorrect')) {
        setError(msg);
      } else {
        setError('Verification failed. Please try again.');
      }
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
      await apiClient.sendCandidateOtp({
        identifier: email.trim().toLowerCase(),
        purpose: 'registration',
        name: name.trim(),
      });
      setCountdown(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
        <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mt-5 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Spark-<span className="text-[#EF4444]">Hire</span>
        </motion.h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-mono tracking-[0.2em] uppercase">
          Candidate Registration
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">

          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════
                STEP 1 — DETAILS FORM
            ════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.form key="step1"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOtp} className="space-y-5">

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Create Your Account</h3>
                  <p className="text-sm text-slate-500">No password needed — we'll send a 6-digit code to your email.</p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aditya Singh"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 focus:border-[#EF4444] transition-all sm:text-sm font-medium text-slate-900"
                  />
                </div>

                {/* Email with real-time validation */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 border rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition-all sm:text-sm font-medium text-slate-900 ${
                      emailFormatError
                        ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400 bg-red-50'
                        : 'border-slate-300 focus:ring-[#EF4444]/50 focus:border-[#EF4444]'
                    }`}
                  />
                  {emailFormatError && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <span>⚠</span> {emailFormatError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    The verification code will be sent to this address. Make sure it is valid and accessible.
                  </p>
                </div>

                {/* Phone with country code selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <div className="relative flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="appearance-none h-full pl-3 pr-8 py-3 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 focus:border-[#EF4444] transition-all cursor-pointer"
                        style={{ minWidth: '110px' }}
                      >
                        {COUNTRY_CODES.map((c, i) => (
                          <option key={`${c.code}-${c.name}-${i}`} value={c.code}>
                            {c.flag} {c.code} ({c.name})
                          </option>
                        ))}
                      </select>
                      {/* Dropdown arrow */}
                      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {/* Phone number input */}
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="98765 43210"
                      className="flex-1 min-w-0 px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/50 focus:border-[#EF4444] transition-all sm:text-sm font-medium text-slate-900"
                    />
                  </div>
                  {fullPhone && (
                    <p className="mt-1 text-xs text-slate-400">Full number: <span className="font-semibold text-slate-600">{fullPhone}</span></p>
                  )}
                </div>

                {/* Error banner */}
                {error && (
                  <div className="text-sm text-[#EF4444] bg-red-50 p-3 rounded-xl border border-red-100 font-medium flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !!emailFormatError}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-[#EF4444] hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4444] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending Code...
                    </span>
                  ) : 'Send Verification Code →'}
                </button>

                <p className="text-center text-sm text-slate-500">
                  Already registered?{' '}
                  <button type="button" onClick={() => navigate('/candidate-login')}
                    className="text-[#EF4444] font-semibold hover:underline">
                    Login here
                  </button>
                </p>
              </motion.form>
            )}

            {/* ════════════════════════════════════════════
                STEP 2 — OTP SCREEN
            ════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.form key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp} className="space-y-6">

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Check Your Email</h3>
                  <p className="text-sm text-slate-500">
                    We sent a 6-digit verification code to{' '}
                    <span className="font-semibold text-slate-700">{email}</span>.
                    Enter it below to complete registration.
                  </p>
                </div>

                {/* 6-box OTP input */}
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-300 rounded-xl focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30 outline-none transition-all text-slate-900 bg-white"
                    />
                  ))}
                </div>

                {/* Countdown */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-sm text-slate-500">
                      Code expires in{' '}
                      <span className={`font-bold tabular-nums ${countdown < 60 ? 'text-red-500' : 'text-slate-700'}`}>
                        {formatTime(countdown)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-red-500 font-semibold">Code expired. Use the Resend button below.</span>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-[#EF4444] bg-red-50 p-3 rounded-xl border border-red-100 font-medium flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">⚠</span><span>{error}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl border border-green-200 font-medium">
                    ✅ {successMsg}
                  </div>
                )}

                <button type="submit" disabled={loading || countdown <= 0}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md shadow-red-500/20 text-sm font-bold text-white bg-[#EF4444] hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EF4444] transition-all disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setStep(1); setError(''); }}
                    className="text-slate-500 hover:text-slate-700 font-medium">
                    ← Change Email
                  </button>
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
      </main>
    </div>
  );
}
