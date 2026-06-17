import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle, ArrowRight, User, FileText,
  Zap, AlertCircle, Star, TrendingUp, Shield, Video, RotateCcw,
  ChevronRight, LogOut, Bell, MapPin
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Stage pipeline config ─────────────────────────────────────────────────────
const STAGES = [
  { key: 'REGISTERED',           label: 'Registered',         icon: User,        color: 'text-slate-500',  bg: 'bg-slate-100' },
  { key: 'APPLIED',              label: 'Applied',            icon: FileText,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  { key: 'INTERVIEW_PENDING',    label: 'Schedule Interview', icon: Calendar,    color: 'text-amber-600',  bg: 'bg-amber-50' },
  { key: 'INTERVIEW_SCHEDULED',  label: 'Interview Scheduled',icon: Clock,       color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'UNDER_REVIEW',         label: 'Under Review',       icon: Shield,      color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'DECISION_MADE',        label: 'Decision Made',      icon: Star,        color: 'text-emerald-600',bg: 'bg-emerald-50' },
];

// ── Countdown Timer ───────────────────────────────────────────────────────────
function CountdownTimer({ targetDate, targetTime, timezone }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calc = () => {
      const target = new Date(`${targetDate}T${targetTime}:00`);
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft({ expired: true }); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, expired: false });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [targetDate, targetTime]);

  if (!timeLeft) return null;
  if (timeLeft.expired) return (
    <div className="text-red-600 font-bold text-sm flex items-center gap-2">
      <AlertCircle size={16} /> Your interview window has passed
    </div>
  );

  const pad = n => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-3">
      {[{ v: timeLeft.h, u: 'hrs' }, { v: timeLeft.m, u: 'min' }, { v: timeLeft.s, u: 'sec' }].map(({ v, u }) => (
        <div key={u} className="text-center">
          <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">{pad(v)}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u}</div>
        </div>
      ))}
    </div>
  );
}

// ── Stat Chip ─────────────────────────────────────────────────────────────────
function Chip({ icon: Icon, label, value, color = 'text-slate-700', bg = 'bg-slate-50' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${bg} border border-white/60`}>
      <Icon size={18} className={color} />
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-sm font-extrabold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

// ── Score Tier Badge ──────────────────────────────────────────────────────────
const TIER_CONFIG = {
  'Exceptional':      { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🏆' },
  'Strong':           { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    emoji: '⭐' },
  'Good':             { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '✅' },
  'Needs Development':{ color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200',   emoji: '📈' },
};

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG['Good'];
  return (
    <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border inline-flex items-center gap-2 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      {cfg.emoji} {tier}
    </span>
  );
}

export default function CandidateHome() {
  const navigate = useNavigate();
  const candidateId = sessionStorage.getItem('candidateId');
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!candidateId) { navigate('/candidate-login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/portal`);
      if (res.ok) setPortal(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/candidate-login');
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading your portal…</p>
      </div>
    </div>
  );

  const app = portal?.application || {};
  const candidate = portal?.candidate || {};
  const booking = portal?.booking;
  const resume = portal?.resume || {};
  const attempts = portal?.attempts || [];
  const currentStageIdx = STAGES.findIndex(s => s.key === app.stage);

  const handleCTAAction = () => {
    if (!portal?.interview_id && !app.job_role) {
      // Not yet applied — go to apply form
      navigate('/candidate');
    } else if (app.stage === 'APPLIED' || app.stage === 'INTERVIEW_PENDING') {
      // Applied but no slot booked — go schedule
      navigate('/schedule-interview');
    } else if (app.stage === 'INTERVIEW_SCHEDULED') {
      // Slot booked — proceed to equipment test
      navigate('/equipment-test');
    } else {
      navigate('/candidate');
    }
  };

  const getCTALabel = () => {
    if (!app.job_role) return 'Apply for a Role →';
    if (app.stage === 'APPLIED' || app.stage === 'INTERVIEW_PENDING') return 'Schedule Your Interview →';
    if (app.stage === 'INTERVIEW_SCHEDULED') return 'Start Pre-Flight Check →';
    if (app.stage === 'UNDER_REVIEW') return 'Interview Submitted ✓';
    return 'View Portal';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 font-sans text-slate-900">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-md">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-extrabold text-slate-900">
            Spark-<span className="text-red-600">Hire</span>
            <span className="hidden sm:inline text-slate-400 text-[10px] ml-2 tracking-[0.2em] font-mono uppercase">Candidate Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors">
            <RotateCcw size={16} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors text-sm font-bold">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      <main className="pt-24 px-4 sm:px-8 pb-16 max-w-5xl mx-auto">
        {/* ── HERO GREETING ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👋</span>
            <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">Welcome back</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {candidate.name?.split(' ')[0] || 'Candidate'}
            <span className="text-red-600">.</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {app.job_role
              ? <>Your application for <span className="font-bold text-slate-700">{app.job_role}</span> is in progress.</>
              : <>Ready to begin your journey? Apply for a role below.</>
            }
          </p>
        </motion.div>

        {/* ── APPLICATION STATUS PIPELINE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_4px_30px_rgb(0,0,0,0.04)] mb-6">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp size={14} /> Application Pipeline
          </h2>
          <div className="flex items-center gap-0">
            {STAGES.map((stage, i) => {
              const isActive = i === currentStageIdx;
              const isDone = i < currentStageIdx;
              const Icon = stage.icon;
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-2 transition-all border-2 ${
                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                      isActive ? `${stage.bg} border-current ${stage.color} shadow-lg scale-110` :
                      'bg-slate-50 border-slate-200 text-slate-300'
                    }`}>
                      {isDone ? <CheckCircle size={18} /> : <Icon size={16} />}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider text-center leading-tight hidden sm:block ${
                      isActive ? stage.color : isDone ? 'text-emerald-600' : 'text-slate-300'
                    }`}>{stage.label}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded-full transition-colors ${
                      i < currentStageIdx ? 'bg-emerald-400' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ── INTERVIEW CARD ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Clock size={14} /> Interview
            </h2>

            {booking ? (
              <>
                <div className="bg-gradient-to-br from-red-50 to-red-100/40 border border-red-100 rounded-2xl p-5 mb-4">
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar size={12} /> Scheduled
                  </p>
                  <p className="text-2xl font-black text-slate-900">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <p className="text-red-600 font-extrabold text-lg mt-1">{booking.start_time} – {booking.end_time}</p>
                  <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1"><MapPin size={10} />{booking.timezone}</p>
                </div>
                <div className="mb-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Starts in</p>
                  <CountdownTimer targetDate={booking.date} targetTime={booking.start_time} timezone={booking.timezone} />
                </div>
                <button onClick={handleCTAAction}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5">
                  Begin Pre-Flight Check <ArrowRight size={16} />
                </button>
              </>
            ) : app.is_completed ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <p className="font-extrabold text-slate-900 text-lg">Interview Completed</p>
                <p className="text-slate-400 text-sm mt-2 font-medium">Your report is under review by the hiring team.</p>
                {app.score_tier && (
                  <div className="mt-4 flex justify-center">
                    <TierBadge tier={app.score_tier} />
                  </div>
                )}
              </div>
            ) : app.job_role ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <Calendar size={28} className="text-amber-500" />
                </div>
                <p className="font-extrabold text-slate-900">No Interview Scheduled</p>
                <p className="text-slate-400 text-sm mt-2 mb-5 font-medium">Pick a time that works best for you.</p>
                <button onClick={() => navigate('/schedule-interview')}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)]">
                  📅 Schedule Interview
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <FileText size={28} className="text-slate-400" />
                </div>
                <p className="font-extrabold text-slate-900">Not Applied Yet</p>
                <p className="text-slate-400 text-sm mt-2 mb-5 font-medium">Select a role to begin your application.</p>
                <button onClick={() => navigate('/candidate')}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)]">
                  Apply for a Role →
                </button>
              </div>
            )}
          </motion.div>

          {/* ── PROFILE CARD ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={14} /> Your Profile
            </h2>

            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                {candidate.name?.[0] || '?'}
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-lg leading-tight">{candidate.name}</p>
                <p className="text-slate-400 text-sm font-medium">{candidate.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {candidate.kyc_verified && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Shield size={8} /> KYC Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FileText size={12} /> Resume</span>
                {resume.uploaded
                  ? <span className="text-xs font-black text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> Uploaded</span>
                  : <span className="text-xs font-black text-slate-400">Not uploaded</span>
                }
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Star size={12} /> Applied Role</span>
                <span className="text-xs font-black text-slate-700">{app.job_role || 'None yet'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Video size={12} /> Attempts</span>
                <span className="text-xs font-black text-slate-700">{attempts.length}</span>
              </div>
              {app.score_tier && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={12} /> Performance</span>
                  <TierBadge tier={app.score_tier} />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── ATTEMPT HISTORY ── */}
        {attempts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)] mb-6">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <RotateCcw size={14} /> Attempt History
            </h2>
            <div className="space-y-3">
              {attempts.map((a) => (
                <div key={a.attempt_number} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${a.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      #{a.attempt_number}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{a.job_role || 'Interview'}</p>
                      <p className="text-xs text-slate-400">{a.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.score_tier && <TierBadge tier={a.score_tier} />}
                    {!a.is_completed && <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">Pending</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── QUICK ACTIONS ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Calendar, label: 'Schedule', action: () => navigate('/schedule-interview'), color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
            { icon: FileText, label: 'Apply / Update', action: () => navigate('/candidate'), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { icon: Video, label: 'Equipment Test', action: () => navigate('/equipment-test'), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
            { icon: Shield, label: 'KYC', action: () => navigate('/kyc-guidelines'), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          ].map(({ icon: Icon, label, action, color, bg, border }) => (
            <motion.button key={label} onClick={action} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border ${bg} ${border} transition-all hover:shadow-md`}>
              <Icon size={22} className={color} />
              <span className={`text-xs font-black uppercase tracking-wider ${color}`}>{label}</span>
            </motion.button>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
