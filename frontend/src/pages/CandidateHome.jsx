import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle, ArrowRight, User, FileText,
  Zap, Star, TrendingUp, Shield, Video, RotateCcw,
  LogOut, MapPin, Hash, Edit3
} from 'lucide-react';
import logoUrl from '../assets/sterling_logo.png';
import { formatISTDayDate } from '../utils/istTime';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Stage pipeline config ─────────────────────────────────────────────────────
const STAGES = [
  { key: 'REGISTERED',           label: 'Registered',         icon: User,        activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-slate-800 bg-white border-slate-200' },
  { key: 'APPLIED',              label: 'Applied',            icon: FileText,    activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-slate-800 bg-white border-slate-200' },
  { key: 'INTERVIEW_PENDING',    label: 'Schedule Interview', icon: Calendar,    activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-slate-800 bg-white border-slate-200' },
  { key: 'INTERVIEW_SCHEDULED',  label: 'Interview Scheduled',icon: Clock,       activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-slate-800 bg-white border-slate-200' },
  { key: 'UNDER_REVIEW',         label: 'Under Review',       icon: Shield,      activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-slate-800 bg-white border-slate-200' },
  { key: 'DECISION_MADE',        label: 'Decision Made',      icon: Star,        activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-slate-800 bg-white border-slate-200' },
];

// ── Countdown Timer (With 15-Min Expiration) ──────────────────────────────
function CountdownTimer({ targetDate, targetTime, onStartReady, onMissed }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasFiredMissed, setHasFiredMissed] = useState(false);

  useEffect(() => {
    const calc = () => {
      let parsedTime = targetTime;
      const ampmMatch = targetTime?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (ampmMatch) {
        let [_, h, m, ampm] = ampmMatch;
        h = parseInt(h, 10);
        if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
        if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
        parsedTime = `${String(h).padStart(2, '0')}:${m}`;
      }

      const target = new Date(`${targetDate}T${parsedTime}:00`);
      const now = new Date();
      const diff = target - now;

      if (diff <= -900000) {
        if (!hasFiredMissed) {
          setHasFiredMissed(true);
          if (onMissed) onMissed();
        }
        return;
      }

      if (diff <= 0) {
        if (onStartReady) onStartReady();
        const graceDiff = 900000 + diff; 
        const m = Math.floor((graceDiff % 3600000) / 60000);
        const s = Math.floor((graceDiff % 60000) / 1000);
        setTimeLeft({ m, s, h: 0, isGracePeriod: true });
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, isGracePeriod: false });
    };

    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [targetDate, targetTime, onStartReady, onMissed, hasFiredMissed]);

  if (!timeLeft) return null;

  const pad = n => String(n).padStart(2, '0');

  if (timeLeft.isGracePeriod) {
    return (
      <div className="animate-pulse bg-red-50 p-4 rounded-2xl border border-red-100">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span className="text-red-600 font-bold uppercase tracking-widest text-xs">Interview is Live</span>
        </div>
        <p className="text-sm font-bold text-slate-500 text-center">
          Closes in <span className="text-red-600 font-black">{pad(timeLeft.m)}:{pad(timeLeft.s)}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      {[{ v: timeLeft.h, u: 'hrs' }, { v: timeLeft.m, u: 'min' }, { v: timeLeft.s, u: 'sec' }].map(({ v, u }) => (
        <div key={u} className="text-center w-14">
          <div className="text-3xl font-black text-slate-800 tabular-nums leading-none tracking-tight">{pad(v)}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u}</div>
        </div>
      ))}
    </div>
  );
}

// ── Score Tier Badge ──────────────────────────────────────────────────────────
const TIER_CONFIG = {
  'Exceptional':      { color: 'text-white', bg: 'bg-slate-900', border: 'border-slate-800', emoji: '🏆' },
  'Strong':           { color: 'text-slate-800', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '⭐' },
  'Good':             { color: 'text-slate-800', bg: 'bg-blue-50', border: 'border-blue-200', emoji: '✅' },
  'Needs Development':{ color: 'text-slate-600', bg: 'bg-amber-50', border: 'border-amber-200', emoji: '📈' },
};

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG['Good'];
  return (
    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      {cfg.emoji} {tier}
    </span>
  );
}

// ── Animations ────────────────────────────────────────────────────────────────
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } } };

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CandidateHome() {
  const navigate = useNavigate();
  const candidateId = sessionStorage.getItem('candidateId');
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInterviewReady, setIsInterviewReady] = useState(false);
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);

  const load = useCallback(async () => {
    if (!candidateId) { navigate('/candidate-login'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/portal`);
      if (res.ok) setPortal(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [candidateId, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/candidate-login');
  };

  const handleStartInterview = () => {
    if (!isInterviewReady) return;
    navigate('/kyc-guidelines');
  };

  const handleNoShow = async () => {
    if (!portal?.booking?.booking_id || isMarkingNoShow) return;
    setIsMarkingNoShow(true);
    try {
      await fetch(`${API_BASE}/api/bookings/${portal.booking.booking_id}/noshow`, { method: 'PATCH' });
      await load();
    } catch (e) {
      console.error("Failed to mark no show:", e);
    } finally {
      setIsMarkingNoShow(false);
    }
  };

  if (loading || isMarkingNoShow) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Syncing Portal…</p>
      </div>
    </div>
  );

  const app = portal?.application || {};
  const candidate = portal?.candidate || {};
  const booking = portal?.booking;
  const resume = portal?.resume || {};
  const attempts = portal?.attempts || [];
  const currentStageIdx = STAGES.findIndex(s => s.key === app.stage);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-red-600 selection:text-white pb-20">
      
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Sterling Logo" className="w-9 h-9 object-contain" />
          <span className="font-extrabold text-slate-900 text-lg tracking-tight">
            Sterling<span className="text-red-600 font-light ml-1">E-Mobility</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={load} className="text-slate-400 hover:text-slate-700 transition-colors bg-white p-2 rounded-full shadow-sm">
            <RotateCcw size={16} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm text-red-500 hover:text-red-600 font-bold text-sm transition-colors border border-slate-100">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      {/* ── HERO HEADER (Gradient & Glass) ── */}
      <div className="bg-gradient-to-br from-red-700 via-red-600 to-slate-900 pt-32 pb-24 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-500 rounded-full mix-blend-screen filter blur-[100px] opacity-50 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50 to-transparent" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                  <Hash size={12} /> {candidate.candidate_id || 'ID PENDING'}
                </span>
                {candidate.kyc_verified && (
                  <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-100 text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-1">
                    <Shield size={12} /> VERIFIED
                  </span>
                )}
              </div>
              
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-tight drop-shadow-sm">
                {candidate.name?.split(' ')[0] || 'Candidate'}
                <span className="text-red-300">.</span>
              </h1>
              <p className="text-red-100/80 mt-3 font-medium text-lg max-w-xl">
                {app.job_role
                  ? <>Pipeline active for <span className="text-white font-bold">{app.job_role}</span></>
                  : <>Profile initiated. Prepare for assessment.</>
                }
              </p>
            </div>
            
            <div className="flex gap-3">
               <button onClick={() => navigate('/candidate')} className="px-5 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl text-white text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg">
                 <Edit3 size={16} /> Update Profile
               </button>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-4 sm:px-8 max-w-5xl mx-auto -mt-16 relative z-20">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* ── APPLICATION STATUS PIPELINE ── */}
          <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
              <TrendingUp size={16} className="text-red-600" /> Assessment Pipeline
            </h2>
            <div className="flex items-center gap-0">
              {STAGES.map((stage, i) => {
                const isActive = i === currentStageIdx;
                const isDone = i < currentStageIdx;
                const Icon = stage.icon;
                return (
                  <React.Fragment key={stage.key}>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all ${
                        isDone ? stage.doneColor :
                        isActive ? stage.activeColor :
                        'bg-slate-50 border border-slate-200 text-slate-400'
                      } ${isDone || isActive ? 'border' : ''}`}>
                        {isDone ? <CheckCircle size={20} /> : <Icon size={20} />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight hidden sm:block ${
                        isActive ? 'text-red-600' : isDone ? 'text-slate-800' : 'text-slate-400'
                      }`}>{stage.label}</span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={`h-1 flex-1 mx-2 rounded-full transition-colors ${
                        i < currentStageIdx ? 'bg-slate-800' : 'bg-slate-100'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ── INTERVIEW ACTION CARD ── */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} className="text-red-600" /> Action Required
              </h2>

              {booking ? (
                <div className="flex flex-col flex-1">
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 mb-6">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Calendar size={12} /> Scheduled Slot
                    </p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mb-1">
                      {formatISTDayDate(booking.date)}
                    </p>
                    <p className="text-red-600 font-extrabold text-lg">{booking.start_time} – {booking.end_time}</p>
                    <p className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1"><MapPin size={12} />{booking.timezone}</p>
                  </div>
                  
                  <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Time Remaining</p>
                    <CountdownTimer 
                      targetDate={booking.date} 
                      targetTime={booking.start_time} 
                      onStartReady={() => setIsInterviewReady(true)}
                      onMissed={handleNoShow}
                    />
                  </div>
                  
                  <div className="mt-auto">
                    <button onClick={handleStartInterview} disabled={!isInterviewReady}
                      className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg flex items-center justify-center gap-3">
                      {isInterviewReady ? "START INTERVIEW" : "WAITING FOR SLOT"} 
                      <ArrowRight size={18} />
                    </button>
                    {isInterviewReady && (
                       <p className="text-center text-xs font-bold text-red-600 mt-3 animate-pulse">
                          ⚠️ You have 15 minutes to join!
                       </p>
                    )}
                  </div>
                </div>
              ) : app.is_completed ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle size={40} />
                  </div>
                  <p className="font-black text-slate-800 text-xl uppercase tracking-tighter mb-2">Interview Completed</p>
                  <p className="text-slate-500 text-sm font-medium mb-6">Your data has been transmitted securely for review.</p>
                  {app.score_tier && <TierBadge tier={app.score_tier} />}
                </div>
              ) : app.job_role ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                    <Calendar size={40} />
                  </div>
                  <p className="font-black text-slate-800 text-xl uppercase tracking-tighter mb-2">No Active Slot</p>
                  <p className="text-slate-500 text-sm font-medium mb-8">Secure your preferred interview window immediately.</p>
                  <button onClick={() => navigate('/schedule-interview')}
                    className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg">
                    SCHEDULE INTERVIEW
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6 border border-red-100">
                    <FileText size={40} />
                  </div>
                  <p className="font-black text-slate-800 text-xl uppercase tracking-tighter mb-2">Registration Pending</p>
                  <p className="text-slate-500 text-sm font-medium mb-8">Lock in a job role and submit your details.</p>
                  <button onClick={() => navigate('/candidate')}
                    className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm transition-all shadow-[0_4px_15px_rgba(220,38,38,0.3)]">
                    COMPLETE PROFILE
                  </button>
                </div>
              )}
            </motion.div>

            {/* ── METRICS & DETAILS CARD ── */}
            <div className="space-y-6">
               <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <User size={16} className="text-red-600" /> Technical Profile
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Role</span>
                    <span className="text-sm font-black text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{app.job_role || 'UNASSIGNED'}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resume Status</span>
                    {resume.uploaded
                      ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1 uppercase tracking-widest"><CheckCircle size={12} /> SECURED</span>
                      : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MISSING</span>
                    }
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Email</span>
                    <span className="text-xs font-bold text-slate-600 truncate max-w-[150px] sm:max-w-[200px]">{candidate.email}</span>
                  </div>
                  {app.score_tier && (
                    <div className="flex justify-between items-center py-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rating</span>
                      <TierBadge tier={app.score_tier} />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ── QUICK TOOLS ── */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                 <button onClick={() => navigate('/schedule-interview')} className="group p-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-white hover:border-red-200 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                   <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                     <Calendar size={20} className="text-slate-600 group-hover:text-red-600 transition-colors" />
                   </div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Manage Schedule</span>
                 </button>
                 <button onClick={() => navigate('/prep-kit')} className="group p-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-white hover:border-red-200 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                   <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                     <Video size={20} className="text-red-600" />
                   </div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Launch Prep Kit</span>
                 </button>
              </motion.div>
            </div>
          </div>

          {/* ── ATTEMPT HISTORY ── */}
          {attempts.length > 0 && (
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <RotateCcw size={16} className="text-red-600" /> Telemetry Logs
              </h2>
              <div className="space-y-3">
                {attempts.map((a) => (
                  <div key={a.attempt_number} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${
                        a.is_completed ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'
                      }`}>
                        #{a.attempt_number}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{a.job_role || 'Assessment'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{a.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {a.score_tier ? <TierBadge tier={a.score_tier} /> : 
                       (!a.is_completed && <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">ABORTED</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </motion.div>
      </main>
    </div>
  );
}
