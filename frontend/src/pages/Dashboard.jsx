import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Users, CheckCircle, TrendingUp, Activity, Zap,
  ArrowRight, Clock, Star, Trophy, Brain, Target, RefreshCw,
  ChevronUp, ChevronDown, Minus, FileText, Medal, Shield, AlertTriangle, XCircle, CheckCircle2
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';

// ── Animated Counter ─────────────────────────────────────────────────────
function Counter({ target, suffix = '', decimals = 0 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 40;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(decimals ? parseFloat(start.toFixed(decimals)) : Math.floor(start));
    }, 30);
    return () => clearInterval(t);
  }, [target, decimals]);
  return <span>{val}{suffix}</span>;
}

// ── Decision Badge ────────────────────────────────────────────────────────
const DECISION_STYLE = {
  HIRED:        { bg: 'bg-emerald-50',  border: 'border-emerald-200',  color: 'text-emerald-700',  icon: '🏆' },
  SHORTLISTED:  { bg: 'bg-red-50',  border: 'border-red-200',  color: 'text-red-700',  icon: '⭐' },
  UNDER_REVIEW: { bg: 'bg-orange-50',  border: 'border-orange-200',  color: 'text-orange-700',  icon: '🔍' },
  REJECTED:     { bg: 'bg-slate-100',  border: 'border-slate-300',  color: 'text-slate-700',  icon: '❌' },
  PENDING:      { bg: 'bg-slate-50', border: 'border-slate-200', color: 'text-slate-500', icon: '⏳' },
  IN_PROGRESS:  { bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-600', icon: '📝' },
};

function DecisionBadge({ decision }) {
  const s = DECISION_STYLE[decision] || DECISION_STYLE.PENDING;
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${s.bg} border ${s.border} ${s.color} inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap`}>
      {s.icon} {decision?.replace('_', ' ') || 'PENDING'}
    </span>
  );
}

function DecisionDropdown({ candidate, onUpdate }) {
  const adminRole = sessionStorage.getItem('adminRole') || 'sub_admin';
  const currentDecision = candidate.hiring_decision || (candidate.interview_status === 'completed' ? 'UNDER_REVIEW' : 'IN_PROGRESS');
  
  if (adminRole !== 'master_admin') {
    return (
      <div className="flex flex-col gap-2">
        <DecisionBadge decision={currentDecision} />
        {candidate.ai_recommendation && (
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            AI: {candidate.ai_recommendation}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={currentDecision}
        onChange={(e) => onUpdate(candidate.id, e.target.value)}
        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm outline-none transition-colors cursor-pointer appearance-none ${
          DECISION_STYLE[currentDecision]?.bg || DECISION_STYLE.PENDING.bg
        } ${DECISION_STYLE[currentDecision]?.color || DECISION_STYLE.PENDING.color} ${
          DECISION_STYLE[currentDecision]?.border || DECISION_STYLE.PENDING.border
        }`}
      >
        <option value="IN_PROGRESS" disabled hidden>📝 IN PROGRESS</option>
        <option value="PENDING">⏳ PENDING</option>
        <option value="SHORTLISTED">⭐ SHORTLISTED</option>
        <option value="UNDER_REVIEW">🔍 UNDER REVIEW</option>
        <option value="REJECTED">❌ REJECTED</option>
      </select>
      {candidate.ai_recommendation && (
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          AI: {candidate.ai_recommendation}
        </span>
      )}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score, colorClass = 'bg-red-600' }) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  return (
    <div className="bg-slate-100 rounded-full h-1.5 w-full overflow-hidden shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, suffix = '', decimals = 0, colorHex, delay = 0, onClick }) => (
  <motion.div className="relative bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-slate-200 transition-all cursor-pointer group overflow-hidden"
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}>
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10 flex justify-between items-center mb-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
        <Icon size={22} className="text-slate-700 group-hover:text-red-600" />
      </div>
      <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1 border border-emerald-100">
        <TrendingUp size={12} strokeWidth={3} />
        <span className="text-[10px] font-black tracking-wider">UP</span>
      </div>
    </div>
    <div className="relative z-10 text-4xl font-black leading-none mb-1.5 tracking-tight text-slate-900 group-hover:text-red-600 transition-colors">
      <Counter target={typeof value === 'number' ? value : 0} suffix={suffix} decimals={decimals} />
    </div>
    <p className="relative z-10 text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
  </motion.div>
);

const RANK_COLORS = ['#dc2626', '#475569', '#b45309']; // Red, Slate, Bronze for podium

// ── Sprint 4: Integrity helpers ───────────────────────────────────────────
const INTEGRITY_BANDS = {
  CLEAN:      { min: 90, label: '✅ Clean',       color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', colBg: 'bg-emerald-50/60', colBorder: 'border-emerald-100', icon: CheckCircle2, iconColor: '#059669' },
  BORDERLINE: { min: 70, label: '🟡 Borderline',  color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   colBg: 'bg-amber-50/60',   colBorder: 'border-amber-100',   icon: Minus,         iconColor: '#D97706' },
  FLAGGED:    { min: 50, label: '🟠 Flagged',     color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  colBg: 'bg-orange-50/60',  colBorder: 'border-orange-100',  icon: AlertTriangle, iconColor: '#EA580C' },
  HIGH_RISK:  { min: 0,  label: '🔴 High Risk',   color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     colBg: 'bg-red-50/60',     colBorder: 'border-red-100',     icon: XCircle,       iconColor: '#DC2626' },
};

function getIntegrityBand(score) {
  if (score >= 90) return 'CLEAN';
  if (score >= 70) return 'BORDERLINE';
  if (score >= 50) return 'FLAGGED';
  return 'HIGH_RISK';
}

function IntegrityBadge({ score }) {
  const band = getIntegrityBand(score ?? 100);
  const cfg = INTEGRITY_BANDS[band];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.color} inline-flex items-center gap-1`}>
      <cfg.icon size={10} /> {score ?? 100}
    </span>
  );
}

// ── Sprint 4: Integrity Signal Modal ─────────────────────────────────────
function IntegritySignalModal({ candidate, onClose }) {
  if (!candidate) return null;
  const integrityScore = candidate.integrity_score ?? 100;
  const band = getIntegrityBand(integrityScore);
  const cfg = INTEGRITY_BANDS[band];
  const signalLog = candidate.integrity_data?.signal_log || [];
  const significant = signalLog.filter(s => s.deduction > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-lg font-black text-red-600 shadow-sm">
              {candidate.name?.[0]}
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-lg">{candidate.name}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-0.5">{candidate.job_role}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors font-bold shadow-sm border border-slate-200">✕</button>
        </div>

        <div className={`px-8 py-6 border-b border-slate-100 ${cfg.colBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Integrity Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-6xl font-black ${cfg.color} tracking-tighter`}>{integrityScore}</span>
                <span className="text-slate-400 text-sm font-bold">/100</span>
              </div>
              <p className={`text-sm font-bold mt-1 ${cfg.color} bg-white px-3 py-1 rounded-full border border-white inline-block shadow-sm`}>{cfg.label}</p>
            </div>
            <div className="text-right bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">Signal Breakdown</p>
              <div className="flex gap-6 text-xs">
                <div className="text-center"><p className="font-black text-slate-900 text-2xl">{signalLog.length}</p><p className="text-slate-500 font-bold uppercase tracking-widest mt-1 text-[10px]">Total</p></div>
                <div className="text-center"><p className="font-black text-red-600 text-2xl">{significant.length}</p><p className="text-red-500 font-bold uppercase tracking-widest mt-1 text-[10px]">Flagged</p></div>
                <div className="text-center"><p className="font-black text-emerald-600 text-2xl">{signalLog.length - significant.length}</p><p className="text-emerald-500 font-bold uppercase tracking-widest mt-1 text-[10px]">Clear</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 overflow-y-auto flex-1 bg-white">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Signal Audit Log</p>
          {signalLog.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No signals recorded — clean interview.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {signalLog.map((s, i) => (
                <div key={i} className={`flex items-start gap-4 px-5 py-4 rounded-2xl border text-sm shadow-sm ${
                  s.deduction > 0
                    ? 'bg-red-50 border-red-100'
                    : s.signal.endsWith('_cleared')
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={`mt-0.5 text-sm font-black px-2 py-1 rounded-lg ${
                    s.deduction > 0 ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {s.deduction > 0 ? `-${s.deduction}` : '0'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 text-sm">{s.signal.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{s.note}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 bg-white px-2 py-1 rounded-md border border-slate-200">{s.timestamp?.slice(11, 19)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] font-bold text-slate-500 text-center uppercase tracking-widest">
            ⚠ The algorithm proposes — <span className="text-red-600">you decide.</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sprint 4: Triage Candidate Card ──────────────────────────────────────
function TriageCard({ candidate, onClick }) {
  const score = candidate.integrity_score ?? 100;
  const band = getIntegrityBand(score);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onClick(candidate)}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-red-600 shrink-0 group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
          {candidate.name?.[0]}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate">{candidate.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mt-0.5">{candidate.job_role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
        <IntegrityBadge score={score} />
        <span className={`text-xl font-black tracking-tight ${candidate.global_score >= 75 ? 'text-emerald-600' : candidate.global_score >= 55 ? 'text-red-600' : 'text-slate-400'}`}>
          {Number(candidate.global_score || 0).toFixed(0)}
          <span className="text-xs font-bold text-slate-400">/100</span>
        </span>
      </div>
      {candidate.proctoring_warnings > 0 && (
        <p className="mt-3 text-[10px] text-orange-600 font-bold flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded border border-orange-100 w-fit">
          <AlertTriangle size={12} /> {candidate.proctoring_warnings} warnings
        </p>
      )}
    </motion.div>
  );
}

// ── Candidate List Modal ──────────────────────────────────────────────────
function CandidateListModal({ filter, leaderboard, onClose, onNavigate, onDecisionChange }) {
  if (!filter) return null;

  let filtered = leaderboard;
  let title = "Total Candidates";
  
  if (filter === 'INTERVIEWED') {
    filtered = leaderboard.filter(c => c.interview_status === 'completed' || c.global_score > 0);
    title = "Interviews Done";
  } else if (filter === 'PENDING') {
    filtered = leaderboard.filter(c => c.interview_status === 'completed' && (!c.hiring_decision || c.hiring_decision === 'PENDING' || c.hiring_decision === 'UNDER_REVIEW'));
    title = "Pending Review";
  } else if (filter === 'SHORTLISTED') {
    filtered = leaderboard.filter(c => c.hiring_decision === 'SHORTLISTED');
    title = "Shortlisted Candidates";
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="font-extrabold text-slate-900 text-xl tracking-tight">{title}</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors font-bold shadow-sm border border-slate-200">✕</button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 bg-white">
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
              <Users size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="font-extrabold text-slate-900 text-lg tracking-tight">No Candidates Found</p>
              <p className="text-sm font-medium text-slate-500 mt-2">No candidates match the current filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {['Candidate', 'Role', 'Resume', 'Global Score', 'Decision', 'Action'].map(h => (
                      <th key={h} className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-700 shrink-0 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors shadow-sm">
                            {c.name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 leading-tight">{c.name}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.job_role}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-black ${c.resume_score >= 70 ? 'text-emerald-600' : c.resume_score >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>{c.resume_score || 0}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-xl font-black tracking-tight ${c.global_score >= 75 ? 'text-emerald-600' : c.global_score >= 55 ? 'text-red-600' : 'text-slate-400'}`}>
                          {Number(c.global_score || 0).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <DecisionDropdown candidate={c} onUpdate={onDecisionChange} />
                      </td>
                      <td className="py-4 px-4">
                        <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                                  onClick={() => { onNavigate(`/report/${c.id}`); onClose(); }}>View Report</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [modalFilter, setModalFilter] = useState(null);
  const [triageCandidate, setTriageCandidate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, lb] = await Promise.allSettled([
        apiClient.getDashboardData(),
        apiClient.getLeaderboard(),
      ]);
      if (dash.status === 'fulfilled') setDashData(dash.value);
      else setDashData({
        total_candidates: 0, interviews_completed: 0,
        avg_technical_score: 0, avg_confidence: 0,
        recent_candidates: [],
      });
      if (lb.status === 'fulfilled') setLeaderboard(lb.value?.candidates || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecisionChange = async (candidateId, newDecision) => {
    try {
      await apiClient.updateHiringDecision(candidateId, newDecision);
      setLeaderboard(prev => prev.map(c => 
        c.id === candidateId ? { ...c, hiring_decision: newDecision } : c
      ));
    } catch (err) {
      console.error('Failed to update decision:', err);
      alert('Failed to update decision. Please try again.');
    }
  };

  const realTrendData = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return [{ day: 'No Data', avg: 0 }];
    const groups = {};
    leaderboard.forEach(c => {
      if (!c || !c.created_at) return;
      let dateObj;
      try {
        dateObj = new Date(c.created_at);
        if (isNaN(dateObj.getTime())) return;
      } catch(e) { return; }

      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = { sum: 0, count: 0, timestamp: dateObj.getTime() };
      
      const score = Number(c.global_score) || Number(c.technical_score) || Number(c.resume_score) || 0;
      if (score > 0) {
        groups[dateStr].sum += score;
        groups[dateStr].count += 1;
      }
    });

    const sorted = Object.keys(groups).map(k => {
      let avgVal = groups[k].count > 0 ? Math.round(groups[k].sum / groups[k].count) : 0;
      if (isNaN(avgVal)) avgVal = 0;
      return { day: k, avg: avgVal, timestamp: groups[k].timestamp };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    if (sorted.length === 1) {
      return [{ day: 'Start', avg: sorted[0].avg }, { day: sorted[0].day, avg: sorted[0].avg }, { day: 'Latest', avg: sorted[0].avg }];
    }
    return sorted.length > 0 ? sorted : [{ day: 'No Data', avg: 0 }];
  }, [leaderboard]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#fafafa] font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading CRM Data...</p>
          </div>
        </main>
      </div>
    );
  }

  const d = dashData || {};
  const pendingReview = leaderboard.filter(c => c?.interview_status === 'completed' && (!c?.hiring_decision || c?.hiring_decision === 'PENDING' || c?.hiring_decision === 'UNDER_REVIEW')).length;
  const shortlisted = leaderboard.filter(c => c?.hiring_decision === 'SHORTLISTED').length;

  const avg = (key) => {
    if (!leaderboard || !leaderboard.length) return 0;
    const sum = leaderboard.reduce((s, c) => s + (Number(c?.[key]) || 0), 0);
    const result = Math.round(sum / leaderboard.length);
    return isNaN(result) ? 0 : result;
  };

  const radarData = [
    { axis: 'Technical',       A: avg('technical_score') },
    { axis: 'Communication',   A: avg('communication_score') },
    { axis: 'Confidence',      A: avg('confidence_score') },
    { axis: 'Problem Solving', A: avg('problem_solving_score') },
    { axis: 'Role Alignment',  A: avg('role_alignment_score') },
    { axis: 'Professionalism', A: avg('professionalism_score') },
    { axis: 'Learning',        A: avg('learning_potential_score') },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'triage', label: 'Integrity Triage', icon: Shield },
  ];

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans text-slate-900 relative overflow-hidden">
      {/* Ambient Red/White Blurs */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-white to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-60 pointer-events-none" />

      <Sidebar />
      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-10">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(220,38,38,0.3)]">
                <Brain size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">AI Recruiter <span className="text-red-600">CRM</span></h1>
                <p className="text-slate-500 mt-1 font-bold text-sm uppercase tracking-widest">{leaderboard.length} Candidates Tracked</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors text-slate-700 shadow-sm" onClick={load}>
                <RefreshCw size={18} /> Sync
              </button>
              <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] hover:-translate-y-0.5" onClick={() => navigate('/candidate')}>
                New Candidate <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Segmented Control */}
          <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-max backdrop-blur-xl border border-slate-200 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors z-10 ${
                    isActive ? 'text-red-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="dashboard-active-tab"
                      className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-2">
                    <Icon size={16} className={isActive ? "text-red-500" : ""} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── OVERVIEW TAB ── */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={Users} label="Total Candidates" value={d.total_candidates || 0} colorHex="#475569" delay={0} onClick={() => setModalFilter('ALL')} />
                  <StatCard icon={CheckCircle} label="Interviews Done" value={d.interviews_completed || 0} colorHex="#ef4444" delay={0.05} onClick={() => setModalFilter('INTERVIEWED')} />
                  <StatCard icon={Clock} label="Pending Review" value={pendingReview} colorHex="#d97706" delay={0.10} onClick={() => setModalFilter('PENDING')} />
                  <StatCard icon={Target} label="Shortlisted" value={shortlisted} colorHex="#991b1b" delay={0.15} onClick={() => setModalFilter('SHORTLISTED')} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Radar */}
                  <motion.div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <h3 className="text-xl font-extrabold mb-6 text-slate-900 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mr-4 border border-red-100">
                        <Zap size={20} />
                      </div>
                      Average Profile
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData} outerRadius="60%">
                        <PolarGrid stroke="#f1f5f9" />
                        <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 'bold' }} />
                        <Radar name="Score" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Area Chart */}
                  <motion.div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <h3 className="text-xl font-extrabold mb-6 text-slate-900 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mr-4 border border-red-100">
                        <TrendingUp size={20} />
                      </div>
                      Performance Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={realTrendData} margin={{ left: -20 }}>
                        <defs>
                          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[50, 100]} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontWeight: 'bold', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)' }} itemStyle={{ color: '#ef4444' }} />
                        <Area type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={4} fill="url(#gradRed)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>

                <motion.div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200">
                        <Clock size={20} />
                      </div>
                      Recent Registrations
                    </h3>
                    <button className="text-[10px] font-black text-red-600 hover:text-white hover:bg-red-600 bg-red-50 px-4 py-2 rounded-lg transition-colors uppercase tracking-widest border border-red-100" onClick={() => setActiveTab('leaderboard')}>
                      View Leaderboard
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          {['Candidate', 'Job Role', 'Email', 'Registered', 'Action'].map(h => (
                            <th key={h} className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(d.recent_candidates || []).map((c, i) => (
                          <motion.tr key={i} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 text-red-600 border border-slate-200 flex items-center justify-center text-sm font-black shadow-sm group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
                                  {c.name?.[0] || '?'}
                                </div>
                                <span className="font-extrabold text-sm text-slate-900">{c.name}</span>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.job_role}</span>
                            </td>
                            <td className="py-5 px-4 text-sm text-slate-500 font-medium">{c.email}</td>
                            <td className="py-5 px-4 text-xs text-slate-400 font-bold uppercase tracking-wider">
                              {c.created_at && !isNaN(new Date(c.created_at).getTime()) ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-5 px-4">
                              <button className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-sm"
                                onClick={() => navigate('/report')}>View Report</button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* ── LEADERBOARD TAB ── */}
            {activeTab === 'leaderboard' && (
              <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                {leaderboard.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    {[leaderboard[1], leaderboard[0], leaderboard[2]].map((c, i) => {
                      if (!c) return null;
                      const podiumRank = i === 0 ? 2 : i === 1 ? 1 : 3;
                      return (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          className={`bg-white border rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden ${podiumRank === 1 ? 'border-red-500 shadow-[0_8px_40px_rgba(220,38,38,0.2)] md:-translate-y-4' : 'border-slate-100'}`}
                        >
                          {podiumRank === 1 && <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 to-red-600" />}
                          <div className={`text-4xl mb-6 ${podiumRank === 1 ? 'text-6xl drop-shadow-md' : ''}`}>
                            {podiumRank === 1 ? '🏆' : podiumRank === 2 ? '🥈' : '🥉'}
                          </div>
                          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 bg-slate-50 border-2 flex items-center justify-center text-2xl font-black text-slate-900 shadow-sm" style={{ borderColor: RANK_COLORS[podiumRank - 1] }}>
                            {c.name?.[0]}
                          </div>
                          <p className="font-black text-xl mb-1 text-slate-900 tracking-tight">{c.name}</p>
                          <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-widest">{c.job_role}</p>
                          
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                            <div className="text-4xl font-black tracking-tighter" style={{ color: RANK_COLORS[podiumRank - 1] }}>
                              {Number(c.global_score || 0).toFixed(1)}
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Global Score</p>
                          </div>
                          <DecisionDropdown candidate={c} onUpdate={handleDecisionChange} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <motion.div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mr-4 border border-red-100">
                        <Trophy size={20} />
                      </div>
                      Full Rankings — {leaderboard.length} Candidates
                    </h3>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
                      <Trophy size={56} className="text-slate-300 mx-auto mb-4" />
                      <p className="font-extrabold text-slate-900 text-lg">No candidates yet</p>
                      <p className="text-sm font-medium text-slate-500 mt-2">Register candidates and complete interviews to see rankings.</p>
                      <button className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-bold transition-all shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] uppercase tracking-wider"
                        onClick={() => navigate('/candidate')}>
                        Add First Candidate
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            {['Rank', 'Candidate', 'Role', 'Resume', 'Global Score', 'Technical', 'Decision', 'Action'].map(h => (
                              <th key={h} className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {leaderboard.map((c, i) => (
                            <motion.tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="py-5 px-4 font-black text-xl" style={{ color: i === 0 ? '#dc2626' : i === 1 ? '#475569' : i === 2 ? '#b45309' : '#94a3b8' }}>
                                {i < 3 ? ['🥇','🥈','🥉'][i] : `#${c.rank || i + 1}`}
                              </td>
                              <td className="py-5 px-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-700 shrink-0 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                                    {c.name?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-slate-900 leading-tight">{c.name}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">{c.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-4">
                                <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.job_role}</span>
                              </td>
                              <td className="py-5 px-4 min-w-[120px]">
                                <div className="flex justify-between mb-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Resume</span>
                                  <span className={`text-xs font-black ${c.resume_score >= 70 ? 'text-emerald-600' : c.resume_score >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>{c.resume_score || 0}</span>
                                </div>
                                <ScoreBar score={c.resume_score} colorClass={c.resume_score >= 70 ? 'bg-emerald-500' : c.resume_score >= 50 ? 'bg-amber-400' : 'bg-slate-300'} />
                              </td>
                              <td className="py-5 px-4">
                                <span className={`text-2xl font-black tracking-tight ${c.global_score >= 75 ? 'text-emerald-600' : c.global_score >= 55 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {Number(c.global_score || 0).toFixed(1)}
                                </span>
                              </td>
                              <td className="py-5 px-4 min-w-[120px]">
                                <div className="flex justify-between mb-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tech</span>
                                  <span className="text-xs font-black text-red-600">{c.technical_score || 0}</span>
                                </div>
                                <ScoreBar score={c.technical_score} colorClass="bg-red-600" />
                              </td>
                              <td className="py-5 px-4">
                                <DecisionDropdown candidate={c} onUpdate={handleDecisionChange} />
                              </td>
                              <td className="py-5 px-4">
                                <button className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl text-xs font-bold text-slate-700 transition-colors uppercase tracking-wider"
                                  onClick={() => { navigate(`/report/${c.id}`); }}>Report</button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ── TRIAGE TAB ── */}
            {activeTab === 'triage' && (
              <motion.div key="triage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
                      <Shield size={20} />
                    </div>
                    Integrity Triage Matrix
                  </h2>
                  <p className="text-sm font-medium text-slate-500 ml-14">
                    Candidates automatically bucketed by their integrity score. The algorithm flags — <strong className="text-red-600">you decide.</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {Object.entries(INTEGRITY_BANDS).map(([bandKey, cfg]) => {
                    const bandCandidates = leaderboard.filter(c => getIntegrityBand(c.integrity_score ?? 100) === bandKey);
                    const BandIcon = cfg.icon;
                    return (
                      <div key={bandKey} className={`rounded-3xl border ${cfg.colBorder} ${cfg.colBg} p-6 min-h-[300px] flex flex-col shadow-sm`}>
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <BandIcon size={18} color={cfg.iconColor} />
                            <span className={`text-xs font-black uppercase tracking-widest ${cfg.color}`}>
                              {bandKey.replace('_', ' ')}
                            </span>
                          </div>
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-white shadow-sm border border-slate-100 ${cfg.color}`}>
                            {bandCandidates.length}
                          </span>
                        </div>

                        <div className="flex flex-col gap-4 flex-1">
                          {bandCandidates.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No candidates</p>
                            </div>
                          ) : (
                            bandCandidates.map(c => <TriageCard key={c.id} candidate={c} onClick={setTriageCandidate} />)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {triageCandidate && <IntegritySignalModal candidate={triageCandidate} onClose={() => setTriageCandidate(null)} />}
        {modalFilter && <CandidateListModal filter={modalFilter} leaderboard={leaderboard} onClose={() => setModalFilter(null)} onNavigate={navigate} onDecisionChange={handleDecisionChange} />}
      </AnimatePresence>
    </div>
  );
}
