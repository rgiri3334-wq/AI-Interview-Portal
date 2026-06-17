import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, CheckCircle, ArrowRight, User, FileText,
  Zap, AlertCircle, Star, TrendingUp, Shield, Video, RotateCcw,
  LogOut, MapPin, Hash, Edit3
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Stage pipeline config (Black/White/Red theme) ─────────────────────────
const STAGES = [
  { key: 'REGISTERED',           label: 'Registered',         icon: User,        activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-black bg-white border-black' },
  { key: 'APPLIED',              label: 'Applied',            icon: FileText,    activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-black bg-white border-black' },
  { key: 'INTERVIEW_PENDING',    label: 'Schedule Interview', icon: Calendar,    activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-black bg-white border-black' },
  { key: 'INTERVIEW_SCHEDULED',  label: 'Interview Scheduled',icon: Clock,       activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-black bg-white border-black' },
  { key: 'UNDER_REVIEW',         label: 'Under Review',       icon: Shield,      activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-black bg-white border-black' },
  { key: 'DECISION_MADE',        label: 'Decision Made',      icon: Star,        activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-black bg-white border-black' },
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

      // EXPIRE LOGIC: 15 minutes = 900,000 ms
      // If diff is less than -900,000, it means 15 minutes have passed since the start time.
      if (diff <= -900000) {
        if (!hasFiredMissed) {
          setHasFiredMissed(true);
          if (onMissed) onMissed();
        }
        return;
      }

      // START LOGIC: If diff <= 0 (but not yet -15 mins), the interview is ready to start
      if (diff <= 0) {
        if (onStartReady) onStartReady();
        // Calculate remaining grace period (15 mins - negative diff)
        const graceDiff = 900000 + diff; // e.g., 900000 + (-60000) = 840000 ms left to join
        const m = Math.floor((graceDiff % 3600000) / 60000);
        const s = Math.floor((graceDiff % 60000) / 1000);
        setTimeLeft({ m, s, h: 0, isGracePeriod: true });
        return;
      }

      // NORMAL COUNTDOWN
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
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span className="text-red-600 font-bold uppercase tracking-widest text-xs">Interview is Live</span>
        </div>
        <p className="text-sm font-bold text-slate-500">
          Closes in <span className="text-slate-900 font-black">{pad(timeLeft.m)}:{pad(timeLeft.s)}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {[{ v: timeLeft.h, u: 'hrs' }, { v: timeLeft.m, u: 'min' }, { v: timeLeft.s, u: 'sec' }].map(({ v, u }) => (
        <div key={u} className="text-center">
          <div className="text-3xl font-black text-black tabular-nums leading-none tracking-tight">{pad(v)}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{u}</div>
        </div>
      ))}
    </div>
  );
}

// ── Score Tier Badge ──────────────────────────────────────────────────────────
const TIER_CONFIG = {
  'Exceptional':      { color: 'text-white', bg: 'bg-black', border: 'border-black', emoji: '🏆' },
  'Strong':           { color: 'text-black', bg: 'bg-slate-100', border: 'border-slate-300', emoji: '⭐' },
  'Good':             { color: 'text-black', bg: 'bg-slate-100', border: 'border-slate-200', emoji: '✅' },
  'Needs Development':{ color: 'text-slate-500', bg: 'bg-white', border: 'border-slate-200', emoji: '📈' },
};

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG['Good'];
  return (
    <span className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      {cfg.emoji} {tier}
    </span>
  );
}

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
      // Hit the backend noshow endpoint to cancel slot and fire email
      await fetch(`${API_BASE}/api/bookings/${portal.booking.booking_id}/noshow`, {
        method: 'PATCH'
      });
      // Reload portal to reflect missed interview
      await load();
    } catch (e) {
      console.error("Failed to mark no show:", e);
    } finally {
      setIsMarkingNoShow(false);
    }
  };

  if (loading || isMarkingNoShow) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-bold uppercase tracking-widest text-xs">Syncing Portal…</p>
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-red-600 selection:text-white">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">
            Spark-<span className="text-red-600">Hire</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={load} className="text-slate-400 hover:text-white transition-colors">
            <RotateCcw size={18} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400 font-bold text-sm transition-colors">
            <LogOut size={16} /> SIGN OUT
          </button>
        </div>
      </nav>

      {/* ── HERO HEADER (STRIKING DARK / RED) ── */}
      <div className="bg-[#0a0a0a] pt-32 pb-20 px-4 sm:px-8 relative overflow-hidden border-b border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-red-600/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-red-600/10 border border-red-600/20 text-red-500 text-xs font-black uppercase tracking-widest rounded-md flex items-center gap-2">
                  <Hash size={12} /> {candidate.candidate_id || 'ID PENDING'}
                </span>
                {candidate.kyc_verified && (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black uppercase tracking-widest rounded-md flex items-center gap-1">
                    <Shield size={12} /> VERIFIED
                  </span>
                )}
              </div>
              
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-tight">
                {candidate.name?.split(' ')[0] || 'Candidate'}
                <span className="text-red-600">.</span>
              </h1>
              <p className="text-slate-400 mt-3 font-medium text-lg max-w-xl">
                {app.job_role
                  ? <>Pipeline active for <span className="text-white font-bold">{app.job_role}</span></>
                  : <>Profile initiated. Prepare for assessment.</>
                }
              </p>
            </div>
            
            <div className="flex gap-3">
               <button onClick={() => navigate('/candidate')} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                 <Edit3 size={16} /> Update Profile
               </button>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-4 sm:px-8 py-12 max-w-5xl mx-auto -mt-10 relative z-20">
        
        {/* ── APPLICATION STATUS PIPELINE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white border-2 border-black p-6 sm:p-8 mb-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xs font-black text-black uppercase tracking-widest mb-8 flex items-center gap-2">
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
                    <div className={`w-12 h-12 flex items-center justify-center mb-3 transition-all ${
                      isDone ? stage.doneColor :
                      isActive ? stage.activeColor :
                      'bg-slate-100 border-2 border-slate-200 text-slate-300'
                    } ${isDone || isActive ? 'border-2' : ''}`}>
                      {isDone ? <CheckCircle size={20} /> : <Icon size={20} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight hidden sm:block ${
                      isActive ? 'text-red-600' : isDone ? 'text-black' : 'text-slate-300'
                    }`}>{stage.label}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 transition-colors ${
                      i < currentStageIdx ? 'bg-black' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* ── INTERVIEW ACTION CARD ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col">
            <h2 className="text-xs font-black text-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock size={16} className="text-red-600" /> Action Required
            </h2>

            {booking ? (
              <div className="flex flex-col flex-1">
                <div className="bg-slate-50 border border-slate-200 p-6 mb-6">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar size={12} /> Scheduled Slot
                  </p>
                  <p className="text-2xl font-black text-black tracking-tight mb-1">
                    {new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-red-600 font-extrabold text-lg">{booking.start_time} – {booking.end_time}</p>
                  <p className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1"><MapPin size={12} />{booking.timezone}</p>
                </div>
                
                <div className="mb-8">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Time Remaining</p>
                  <CountdownTimer 
                    targetDate={booking.date} 
                    targetTime={booking.start_time} 
                    onStartReady={() => setIsInterviewReady(true)}
                    onMissed={handleNoShow}
                  />
                </div>
                
                <div className="mt-auto">
                  <button onClick={handleStartInterview} disabled={!isInterviewReady}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3">
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
                <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={40} />
                </div>
                <p className="font-black text-black text-xl uppercase tracking-tighter mb-2">Interview Completed</p>
                <p className="text-slate-500 text-sm font-medium mb-6">Your data has been transmitted securely for review.</p>
                {app.score_tier && <TierBadge tier={app.score_tier} />}
              </div>
            ) : app.job_role ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div className="w-20 h-20 bg-slate-100 text-black border-2 border-black rounded-full flex items-center justify-center mb-6">
                  <Calendar size={40} />
                </div>
                <p className="font-black text-black text-xl uppercase tracking-tighter mb-2">No Active Slot</p>
                <p className="text-slate-500 text-sm font-medium mb-8">Secure your preferred interview window immediately.</p>
                <button onClick={() => navigate('/schedule-interview')}
                  className="w-full py-4 bg-black hover:bg-slate-800 text-white font-black uppercase tracking-widest text-sm transition-all">
                  SCHEDULE INTERVIEW
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <div className="w-20 h-20 bg-slate-100 text-slate-400 border-2 border-slate-200 rounded-full flex items-center justify-center mb-6">
                  <FileText size={40} />
                </div>
                <p className="font-black text-slate-400 text-xl uppercase tracking-tighter mb-2">Registration Pending</p>
                <p className="text-slate-500 text-sm font-medium mb-8">Lock in a job role and submit your details.</p>
                <button onClick={() => navigate('/candidate')}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                  COMPLETE PROFILE
                </button>
              </div>
            )}
          </motion.div>

          {/* ── METRICS & DETAILS CARD ── */}
          <div className="space-y-8">
             <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xs font-black text-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <User size={16} className="text-red-600" /> Technical Profile
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Role</span>
                  <span className="text-sm font-black text-black">{app.job_role || 'UNASSIGNED'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resume Status</span>
                  {resume.uploaded
                    ? <span className="text-xs font-black text-white bg-black px-2 py-1 flex items-center gap-1"><CheckCircle size={12} /> SECURED</span>
                    : <span className="text-xs font-black text-slate-400">MISSING</span>
                  }
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contact Email</span>
                  <span className="text-xs font-bold text-black truncate max-w-[150px] sm:max-w-[200px]">{candidate.email}</span>
                </div>
                {app.score_tier && (
                  <div className="flex justify-between items-center py-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rating</span>
                    <TierBadge tier={app.score_tier} />
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── QUICK TOOLS ── */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-4">
               <button onClick={() => navigate('/schedule-interview')} className="group p-6 bg-black hover:bg-red-600 text-white transition-colors border-2 border-black hover:border-red-600 flex flex-col items-center justify-center gap-3 text-center">
                 <Calendar size={24} className="group-hover:scale-110 transition-transform" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Manage Schedule</span>
               </button>
               <button onClick={() => navigate('/prep-kit')} className="group p-6 bg-white hover:bg-slate-100 border-2 border-black text-black transition-colors flex flex-col items-center justify-center gap-3 text-center">
                 <Video size={24} className="text-red-600 group-hover:scale-110 transition-transform" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Launch Prep Kit</span>
               </button>
            </motion.div>
          </div>
        </div>

        {/* ── ATTEMPT HISTORY ── */}
        {attempts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xs font-black text-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <RotateCcw size={16} className="text-red-600" /> Telemetry Logs
            </h2>
            <div className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <div key={a.attempt_number} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center text-sm font-black border-2 ${
                      a.is_completed ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      #{a.attempt_number}
                    </div>
                    <div>
                      <p className="text-sm font-black text-black">{a.job_role || 'Assessment'}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{a.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {a.score_tier ? <TierBadge tier={a.score_tier} /> : 
                     (!a.is_completed && <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-1 uppercase tracking-widest">ABORTED</span>)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
