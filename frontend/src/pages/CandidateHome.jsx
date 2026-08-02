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
import PageWrapper from '../components/Layout/PageWrapper';
import RobotAssistant from '../components/robot/RobotAssistant';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Stage pipeline config ─────────────────────────────────────────────────────
const STAGES = [
  { key: 'REGISTERED', label: 'Registered', icon: User, activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'APPLIED', label: 'Applied', icon: FileText, activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'INTERVIEW_PENDING', label: 'Schedule Interview', icon: Calendar, activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled', icon: Clock, activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'UNDER_REVIEW', label: 'Under Review', icon: Shield, activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'DECISION_MADE', label: 'Decision Made', icon: Star, activeColor: 'text-white bg-red-600 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]', doneColor: 'text-red-600 bg-red-50 border-red-200' },
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
      <div className="animate-pulse bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center justify-center h-full">
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
    <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full h-full">
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
  'Exceptional': { color: 'text-white', bg: 'bg-red-600', border: 'border-red-700', emoji: '🏆' },
  'Strong': { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100', emoji: '⭐' },
  'Good': { color: 'text-red-600', bg: 'bg-white', border: 'border-red-100', emoji: '✅' },
  'Needs Development': { color: 'text-slate-500', bg: 'bg-white', border: 'border-slate-100', emoji: '📈' },
};

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG['Good'];
  return (
    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${cfg.bg} ${cfg.border} ${cfg.color}`}>
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [introComplete, setIntroComplete] = useState(() => sessionStorage.getItem('robotIntroDone') === 'true');

  const handleIntroComplete = () => {
    sessionStorage.setItem('robotIntroDone', 'true');
    setIntroComplete(true);
  };

  const load = useCallback(async () => {
    if (!candidateId) { navigate('/candidate-login'); return; }
    setLoading(true);
    try {
      const token = sessionStorage.getItem('candidateToken');
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/portal`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPortal(data);
      }
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
    navigate('/profile-photo-guidelines');
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

  const handleCancelSlot = async () => {
    if (!portal?.booking?.booking_id || isCancelling) return;
    if (!window.confirm("Cancel this interview slot? You'll be able to book a new one afterwards.")) return;
    setIsCancelling(true);
    try {
      const token = sessionStorage.getItem('candidateToken');
      const res = await fetch(`${API_BASE}/api/bookings/${portal.booking.booking_id}/cancel`, {
        method: 'PATCH',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Could not cancel the slot. Please try again.');
        return;
      }
      await load();
    } catch (e) {
      console.error("Failed to cancel slot:", e);
      alert('Network error while cancelling. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading || isMarkingNoShow || isCancelling) return (
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
    <PageWrapper className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col lg:flex-row overflow-hidden relative">
      <RobotAssistant onIntroComplete={handleIntroComplete} skipIntro={introComplete} portalData={portal} />
      
      {/* Main Content Wrapper (Hidden during Intro) */}
      <motion.div 
        className="flex flex-col lg:flex-row w-full h-full relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        style={{ pointerEvents: introComplete ? 'auto' : 'none' }}
        transition={{ duration: 0.8 }}
      >
      {/* ── LEFT SIDEBAR: THE VERTICAL JOURNEY ── */}
      <aside className="w-full lg:w-96 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 lg:h-screen flex flex-col shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Brand Header */}
        <div className="p-8 pb-4 flex flex-col gap-8 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Sterling Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
              <span className="font-extrabold text-slate-900 text-xl tracking-tight hidden sm:block lg:block">
                Sterling<span className="text-red-600 font-light ml-1">E-Mobility</span>
              </span>
            </div>
            {/* Mobile-only logout */}
            <button onClick={handleLogout} className="lg:hidden text-slate-400 hover:text-red-600 p-2">
              <LogOut size={20} />
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                <Hash size={10} /> {candidate.id || 'PENDING'}
              </span>
              {candidate.kyc_verified && (
                <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                  <Shield size={10} /> VERIFIED
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-tight">
              {candidate.name || 'Candidate'}
              <span className="text-red-600">.</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm">
              {app.job_role ? `Pipeline active for ${app.job_role}` : 'Profile initiated. Prepare for assessment.'}
            </p>
          </div>
        </div>

        {/* Vertical Pipeline Timeline */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar relative hidden lg:block">
          <div className="absolute top-8 bottom-8 left-[3.25rem] w-0.5 bg-slate-100 z-0" />
          
          <div className="flex flex-col gap-6 relative z-10">
            {STAGES.map((stage, i) => {
              const isActive = i === currentStageIdx;
              const isDone = i < currentStageIdx;
              const Icon = stage.icon;
              
              return (
                <div key={stage.key} className={`flex items-start gap-4 transition-all duration-300 ${isActive ? 'opacity-100 scale-105 origin-left' : isDone ? 'opacity-70' : 'opacity-40'}`}>
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isDone ? stage.doneColor : isActive ? stage.activeColor : 'bg-slate-50 border border-slate-200 text-slate-400'
                  } ${isDone || isActive ? 'border shadow-sm' : ''}`}>
                    {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <div className="pt-2">
                    <span className={`text-xs font-black uppercase tracking-widest block leading-tight ${isActive ? 'text-red-600' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                        Current Phase
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </aside>

      {/* ── RIGHT MAIN AREA: BENTO BOX GRID ── */}
      <main className="flex-1 lg:h-screen lg:overflow-y-auto bg-slate-50/50 relative">
        
        {/* Background ambient light */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600 rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.03] pointer-events-none" />

        {/* Top Actions Nav (Desktop only) */}
        <div className="hidden lg:flex sticky top-0 z-30 items-center justify-end gap-3 p-6 bg-slate-50/80 backdrop-blur-md">
          <button onClick={load} className="text-slate-400 hover:text-red-600 transition-colors bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 hover:border-red-200">
            <RotateCcw size={16} />
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl shadow-sm text-slate-600 hover:text-red-600 font-black uppercase tracking-widest text-[10px] transition-all border border-slate-200 hover:border-red-200">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        {/* Bento Grid */}
        <div className="p-4 sm:p-6 lg:pt-0 max-w-5xl mx-auto space-y-6 pb-20">
          
          {/* Mobile-only pipeline quick view */}
          <div className="lg:hidden bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-2">
            {STAGES.map((stage, i) => {
              const isActive = i === currentStageIdx;
              const isDone = i < currentStageIdx;
              const Icon = stage.icon;
              return (
                 <div key={stage.key} className={`shrink-0 flex items-center gap-2 p-2 px-3 rounded-xl ${isActive ? 'bg-red-50 text-red-600 border border-red-100' : isDone ? 'text-slate-600' : 'text-slate-300'}`}>
                    {isDone ? <CheckCircle size={14} /> : <Icon size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{stage.label}</span>
                 </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* MAIN ACTION TILE (Spans 2 cols on XL) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="xl:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-10 flex flex-col hover:border-red-100 transition-colors relative overflow-hidden group"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/0 via-red-50/0 to-red-50/0 group-hover:to-red-50/50 transition-all duration-700 pointer-events-none" />

              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                <Zap size={14} className="text-red-600" /> Action Center
              </h2>

              {booking ? (
                <div className="flex flex-col flex-1 relative z-10">
                  <div className="flex flex-col md:flex-row items-stretch justify-between gap-6 mb-6">
                    <div className="flex-1 bg-slate-50 border border-slate-100 p-6 rounded-3xl flex flex-col justify-center">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Calendar size={12} /> Scheduled Slot
                      </p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight mb-1">
                        {formatISTDayDate(booking.date)}
                      </p>
                      <p className="text-red-600 font-extrabold text-lg">{booking.start_time} – {booking.end_time}</p>
                      <p className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-1"><MapPin size={12} />{booking.timezone}</p>
                    </div>
                    <div className="md:w-48 shrink-0 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Time Remaining</p>
                      <CountdownTimer
                        targetDate={booking.date}
                        targetTime={booking.start_time}
                        onStartReady={() => setIsInterviewReady(true)}
                        onMissed={handleNoShow}
                      />
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button onClick={handleStartInterview} disabled={!isInterviewReady}
                      className="sm:col-span-2 py-4 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-3">
                      {isInterviewReady ? "START INTERVIEW" : "WAITING FOR SLOT"}
                      <ArrowRight size={18} />
                    </button>
                    <button onClick={handleCancelSlot} disabled={isCancelling}
                      className="py-4 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 hover:bg-red-50 text-slate-500 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {isCancelling ? "Cancelling…" : "Reschedule"}
                    </button>
                  </div>
                </div>
              ) : app.is_completed ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4 relative z-10">
                  <div className="w-24 h-24 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 border border-red-100 shadow-inner">
                    <CheckCircle size={48} />
                  </div>
                  <p className="font-black text-slate-800 text-2xl uppercase tracking-tighter mb-2">Interview Completed</p>
                  <p className="text-slate-500 text-sm font-medium max-w-sm mb-6">Your data has been transmitted securely. The recruitment team is reviewing your profile.</p>
                  {app.score_tier && <TierBadge tier={app.score_tier} />}
                </div>
              ) : (candidate.experience_level && app.job_role) ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4 relative z-10">
                  <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mb-6 border border-slate-100">
                    <Calendar size={48} />
                  </div>
                  <p className="font-black text-slate-800 text-2xl uppercase tracking-tighter mb-2">No Active Slot</p>
                  <p className="text-slate-500 text-sm font-medium mb-8">Secure your preferred interview window immediately.</p>
                  <button onClick={() => navigate('/schedule-interview')}
                    className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-red-600/20">
                    SCHEDULE INTERVIEW
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4 relative z-10">
                  <div className="w-24 h-24 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 border border-red-100">
                    <FileText size={48} />
                  </div>
                  <p className="font-black text-slate-800 text-2xl uppercase tracking-tighter mb-2">Registration Pending</p>
                  <p className="text-slate-500 text-sm font-medium mb-8">Complete your application to unlock interview slots.</p>
                  <button onClick={() => navigate('/candidate')}
                    className="w-full sm:w-auto px-12 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-red-600/20">
                    COMPLETE REGISTRATION
                  </button>
                </div>
              )}
            </motion.div>

            {/* PROFILE TILE (Spans 1 col on XL) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-slate-400" /> Identity
                </h2>
                <button onClick={() => navigate('/candidate')} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors border border-slate-100 hover:border-red-100">
                  <Edit3 size={14} />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Role</span>
                  <span className="text-sm font-black text-slate-800 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-block">
                    {app.job_role || 'UNASSIGNED'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Resume Status</span>
                  {resume.uploaded
                    ? <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl inline-flex items-center gap-1 uppercase tracking-widest"><CheckCircle size={12} /> SECURED</span>
                    : <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl inline-block uppercase tracking-widest">MISSING</span>
                  }
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Contact Email</span>
                  <span className="text-xs font-bold text-slate-600 block truncate">{candidate.email}</span>
                </div>
                {app.score_tier && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Rating</span>
                    <TierBadge tier={app.score_tier} />
                  </div>
                )}
              </div>
            </motion.div>
            
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {/* QUICK TOOLS TILES */}
             <motion.button 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                onClick={() => navigate('/schedule-interview')} 
                className="group p-6 sm:p-8 bg-white rounded-[2rem] border border-slate-100 hover:border-red-200 transition-all flex flex-row items-center justify-start gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] text-left hover:shadow-lg"
              >
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-red-50 group-hover:scale-110 transition-all border border-transparent group-hover:border-red-100">
                  <Calendar size={22} className="text-slate-400 group-hover:text-red-600 transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Manage Schedule</h3>
                  <p className="text-xs font-medium text-slate-500">View or modify your current interview bookings.</p>
                </div>
              </motion.button>
              
              <motion.button 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                onClick={() => navigate('/prep-kit')} 
                className="group p-6 sm:p-8 bg-white rounded-[2rem] border border-slate-100 hover:border-red-200 transition-all flex flex-row items-center justify-start gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] text-left hover:shadow-lg"
              >
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-red-50 group-hover:scale-110 transition-all border border-transparent group-hover:border-red-100">
                  <Video size={22} className="text-slate-400 group-hover:text-red-600 transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">Interview Prep Kit</h3>
                  <p className="text-xs font-medium text-slate-500">Test your equipment and view the guidelines.</p>
                </div>
              </motion.button>
          </div>

          {/* ATTEMPT HISTORY TILE */}
          {attempts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8"
            >
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <RotateCcw size={14} className="text-slate-400" /> Telemetry Logs
              </h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {attempts.map((a) => (
                  <div key={a.attempt_number} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black ${a.is_completed ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'bg-white text-slate-400 border border-slate-200'}`}>
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

        </div>
      </main>
      </motion.div>
    </PageWrapper>
  );
}
