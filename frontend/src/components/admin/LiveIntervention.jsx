import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Mic, Skull, AlertTriangle, Send, Video, Maximize, Activity,
  ArrowLeft, User, Clock, Zap, Brain, MessageCircle, Shield, RefreshCw,
  ChevronRight, Briefcase, Sparkles, Signal, Radar
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { API_BASE, customFetch } from '../../config/api';

// ── Initials Avatar Fallback ─────────────────────────────────────────────────
const InitialsAvatar = ({ name, size = 64 }) => {
  const initials = (name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      className="bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-black rounded-full shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
};

// ── Live Duration Timer ──────────────────────────────────────────────────────
const LiveTimer = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!startedAt) return;
    const update = () => {
      try {
        const start = new Date(startedAt);
        const now = new Date();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        setElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } catch { setElapsed('--:--'); }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <span className="font-mono">{elapsed}</span>;
};

// ── Progress Ring ────────────────────────────────────────────────────────────
const ProgressRing = ({ progress, size = 40, strokeWidth = 3 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-100" />
      <circle cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-red-500 transition-all duration-500" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
};

// ── Candidate Card ───────────────────────────────────────────────────────────
const CandidateCard = ({ session, onClick }) => {
  const progress = Math.min(100, (session.question_index / 10) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(220,38,38,0.12)] hover:border-red-200 transition-all cursor-pointer relative overflow-hidden"
    >
      {/* Live Pulse Strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 animate-pulse" />

      <div className="p-5">
        {/* Header: Photo + Name + Live Badge */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative shrink-0">
            {session.selfie_url ? (
              <img 
                src={session.selfie_url} 
                alt={session.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div style={{ display: session.selfie_url ? 'none' : 'flex' }}>
              <InitialsAvatar name={session.name} size={56} />
            </div>
            {/* Green live dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-extrabold text-slate-900 truncate">{session.name}</h3>
              <div className="px-2 py-0.5 bg-red-600 rounded-md text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
                <Radio size={8} /> LIVE
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 truncate">{session.email}</p>
          </div>
        </div>

        {/* Role & Experience */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Briefcase size={13} className="text-red-400 shrink-0" />
            <span className="text-xs font-bold text-slate-700 truncate">{session.job_role || 'Role TBD'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-amber-500 shrink-0" />
            <span className="text-xs font-medium text-slate-500 truncate">{session.experience || 'Experience N/A'}</span>
          </div>
        </div>

        {/* Skills Tags */}
        {session.key_skills && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {session.key_skills.split(',').slice(0, 3).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-500 truncate max-w-[100px]">
                {skill.trim()}
              </span>
            ))}
            {session.key_skills.split(',').length > 3 && (
              <span className="px-2 py-0.5 bg-red-50 border border-red-100 rounded-md text-[10px] font-bold text-red-400">
                +{session.key_skills.split(',').length - 3}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-slate-100 mb-4" />

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock size={12} className="text-blue-500" />
            </div>
            <p className="text-sm font-black text-slate-800">
              <LiveTimer startedAt={session.started_at} />
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Brain size={12} className="text-purple-500" />
            </div>
            <p className="text-sm font-black text-slate-800">{session.question_index}/10</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Questions</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Signal size={12} className="text-emerald-500" />
            </div>
            <p className="text-sm font-black text-slate-800">L{session.difficulty_index}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase">{session.current_phase}</span>
            <span className="text-[9px] font-bold text-red-500">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* View Button */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-red-600 group-hover:text-red-700 transition-colors pt-1">
          <span>View Live Telemetry</span>
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};


// ── Main Component ───────────────────────────────────────────────────────────
export default function LiveIntervention({ showToast }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overrideQuestion, setOverrideQuestion] = useState("");
  const [killReason, setKillReason] = useState("");
  const pollingRef = useRef(null);

  // ── Fetch live sessions ────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiClient.getLiveSessions();
      setSessions(Array.isArray(data) ? data : []);
      
      // If we have a selected session, update its data
      if (selectedSession) {
        const updated = (Array.isArray(data) ? data : []).find(
          s => s.candidate_id === selectedSession.candidate_id
        );
        if (updated) {
          setSelectedSession(updated);
        } else {
          // Session ended — go back to grid
          setSelectedSession(null);
          showToast("Interview session ended.", "success");
        }
      }
    } catch (err) {
      console.error("Failed to fetch live sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSession, showToast]);

  useEffect(() => {
    fetchSessions();
    pollingRef.current = setInterval(fetchSessions, 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchSessions]);

  // ── Intervention Handlers ──────────────────────────────────────────────
  const handlePushQuestion = () => {
    if (!overrideQuestion.trim()) return;
    showToast(`Override question pushed to AI: "${overrideQuestion}"`, "success");
    setOverrideQuestion("");
  };

  const handleKillSwitch = async () => {
    if (!killReason.trim()) return showToast("Must provide a reason for termination.", "error");
    if (window.confirm("Are you sure you want to instantly terminate this interview?")) {
      try {
        await apiClient.adminKillInterview({
          candidate_id: selectedSession.candidate_id,
          interview_id: selectedSession.interview_id,
          reason: killReason
        });
        showToast(`Interview terminated. Reason: ${killReason}`, "error");
        setSelectedSession(null);
        setKillReason("");
        fetchSessions(); // Refresh grid
      } catch (err) {
        console.error("Failed to terminate interview", err);
        showToast("Failed to terminate interview.", "error");
      }
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1200px] mx-auto flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Scanning for live sessions...</p>
        </div>
      </motion.div>
    );
  }

  // ── View 2: Selected Session Telemetry ─────────────────────────────────
  if (selectedSession) {
    const s = selectedSession;
    return (
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="max-w-[1400px] mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={() => setSelectedSession(null)}
          className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 transition-all shadow-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Live Sessions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Stream Panel */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col min-h-[550px]">
            <div className="absolute top-5 left-5 flex items-center gap-3 z-20">
              <div className="px-3 py-1 bg-red-600 rounded-lg text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                <Radio size={12} /> Live
              </div>
              <span className="text-white font-mono text-xs bg-black/50 backdrop-blur px-3 py-1 rounded-lg">
                <LiveTimer startedAt={s.started_at} />
              </span>
            </div>

            {/* Video feed placeholder */}
            <div className="flex-1 bg-black rounded-xl relative overflow-hidden mt-2 border border-slate-800 flex items-center justify-center group">
              <div className="flex flex-col items-center gap-4 opacity-50">
                <Video size={48} className="text-slate-700" />
                <p className="text-slate-600 text-xs font-bold">Video Feed — Coming Soon</p>
              </div>
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-4 py-2 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-sm">{s.name}</h4>
                <p className="text-slate-400 text-xs">{s.job_role}</p>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20">
                <Maximize size={16} />
              </button>
            </div>

            {/* Candidate Info Bar */}
            <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Experience</p>
                <p className="text-xs font-bold text-white">{s.experience || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Skills</p>
                <p className="text-xs font-bold text-white truncate">{s.key_skills || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Questions</p>
                <p className="text-xs font-bold text-white">{s.question_index} / 10</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Difficulty</p>
                <p className="text-xs font-bold text-white">Level {s.difficulty_index}</p>
              </div>
            </div>
          </div>

          {/* Intervention Controls */}
          <div className="space-y-5">
            
            {/* Status Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
              <h3 className="text-base font-extrabold text-slate-900 mb-5 flex items-center gap-2 tracking-tight">
                <Activity size={16} className="text-blue-500"/>
                Session Telemetry
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Candidate</p>
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {s.selfie_url ? (
                      <img src={s.selfie_url} alt="" className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" />
                    ) : (
                      <InitialsAvatar name={s.name} size={32} />
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{s.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Interview ID</p>
                  <p className="text-xs font-mono font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">{s.interview_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Current AI Phase</p>
                  <p className="text-xs font-bold text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">{s.current_phase}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100 text-center">
                    <p className="text-lg font-black text-emerald-700">{s.avg_technical}</p>
                    <p className="text-[8px] font-black uppercase tracking-wider text-emerald-500">Tech</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100 text-center">
                    <p className="text-lg font-black text-blue-700">{s.avg_communication}</p>
                    <p className="text-[8px] font-black uppercase tracking-wider text-blue-500">Comm</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2.5 border border-purple-100 text-center">
                    <p className="text-lg font-black text-purple-700">{s.avg_confidence}</p>
                    <p className="text-[8px] font-black uppercase tracking-wider text-purple-500">Conf</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Override Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-[60px] opacity-20 pointer-events-none" />
              <h3 className="text-base font-extrabold mb-3 flex items-center gap-2 relative z-10">
                <Mic size={16} className="text-indigo-400"/>
                Push-to-Talk Override
              </h3>
              <p className="text-[10px] text-indigo-200 mb-3 relative z-10">Force the AI to ask a specific question immediately.</p>
              
              <div className="relative z-10">
                <textarea 
                  rows={3}
                  value={overrideQuestion}
                  onChange={e => setOverrideQuestion(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all resize-none placeholder-indigo-300/50"
                  placeholder="e.g. Ask them about their gap year in 2022..."
                />
                <button 
                  onClick={handlePushQuestion}
                  disabled={!overrideQuestion.trim()}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  <Send size={14} /> Push to Agent
                </button>
              </div>
            </div>

            {/* Kill Switch Card */}
            <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
              <h3 className="text-base font-extrabold text-red-900 mb-3 flex items-center gap-2 tracking-tight">
                <AlertTriangle size={16} className="text-red-600"/>
                Emergency Kill Switch
              </h3>
              <p className="text-[10px] text-red-700 mb-3 font-medium">Instantly terminate the interview and destroy the connection.</p>
              
              <input 
                type="text"
                value={killReason}
                onChange={e => setKillReason(e.target.value)}
                placeholder="Reason for termination..."
                className="w-full bg-white border border-red-200 rounded-xl px-4 py-2.5 text-sm font-bold text-red-900 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all mb-2 placeholder-red-300"
              />
              
              <button 
                onClick={handleKillSwitch}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
              >
                <Skull size={16} /> Terminate
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    );
  }

  // ── View 1: Active Sessions Grid (default) ─────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
              <Radar className="text-red-600" size={20} />
            </div>
            Live Interview Monitor
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1 pl-[52px]">
            {sessions.length === 0 
              ? 'No active interviews detected' 
              : `${sessions.length} active session${sessions.length > 1 ? 's' : ''} detected`
            }
          </p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchSessions(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Empty State */}
      {sessions.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-16 text-center"
        >
          <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 relative shadow-inner">
            <div className="absolute inset-0 border-[3px] border-transparent border-t-red-400 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 border-[3px] border-transparent border-b-slate-300 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
            <Radar size={40} className="text-slate-300 relative z-10" />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
            No Active Interviews
          </h3>
          <p className="text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            The Live Monitor automatically detects candidates as they start their interviews. 
            Candidate cards will appear here in real-time with profile details and session progress.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Scanning every 5 seconds...
          </div>
        </motion.div>
      )}

      {/* Candidate Cards Grid */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {sessions.map(s => (
              <CandidateCard
                key={s.candidate_id}
                session={s}
                onClick={() => setSelectedSession(s)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
