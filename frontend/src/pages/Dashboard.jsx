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
  HIRED:        { bg: 'bg-green-50',  border: 'border-green-200',  color: 'text-green-700',  icon: '🏆' },
  SHORTLISTED:  { bg: 'bg-red-50',  border: 'border-red-200',  color: 'text-red-700',  icon: '✅' },
  UNDER_REVIEW: { bg: 'bg-amber-50',  border: 'border-amber-200',  color: 'text-amber-700',  icon: '🔍' },
  REJECTED:     { bg: 'bg-slate-100',  border: 'border-slate-300',  color: 'text-slate-700',  icon: '❌' },
  PENDING:      { bg: 'bg-slate-50', border: 'border-slate-200', color: 'text-slate-500', icon: '⏳' },
};

function DecisionBadge({ decision }) {
  const s = DECISION_STYLE[decision] || DECISION_STYLE.PENDING;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${s.bg} border ${s.border} ${s.color} inline-flex items-center gap-1.5 tracking-wide`}>
      {s.icon} {decision?.replace('_', ' ') || 'PENDING'}
    </span>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score, colorClass = 'bg-red-600' }) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  return (
    <div className="bg-slate-100 rounded-full h-1 w-full overflow-hidden">
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
  <motion.div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-red-300 group"
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}>
    <div className="flex justify-between items-center mb-4">
      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
        <Icon size={20} color={colorHex} />
      </div>
      <TrendingUp size={14} className="text-green-600" />
    </div>
    <div className="text-4xl font-black leading-none mb-1.5 tracking-tight text-slate-900">
      <Counter target={typeof value === 'number' ? value : 0} suffix={suffix} decimals={decimals} />
    </div>
    <p className="text-slate-500 text-sm font-medium tracking-wide">{label}</p>
  </motion.div>
);

const RANK_COLORS = ['#EAB308', '#94A3B8', '#D97706'];

// ── Sprint 4: Integrity helpers ───────────────────────────────────────────
const INTEGRITY_BANDS = {
  CLEAN:      { min: 90, label: '✅ Clean',       color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', colBg: 'bg-emerald-50/60', colBorder: 'border-emerald-200', icon: CheckCircle2, iconColor: '#059669' },
  BORDERLINE: { min: 70, label: '🟡 Borderline',  color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   colBg: 'bg-amber-50/60',   colBorder: 'border-amber-200',   icon: Minus,         iconColor: '#D97706' },
  FLAGGED:    { min: 50, label: '🟠 Flagged',     color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  colBg: 'bg-orange-50/60',  colBorder: 'border-orange-200',  icon: AlertTriangle, iconColor: '#EA580C' },
  HIGH_RISK:  { min: 0,  label: '🔴 High Risk',   color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     colBg: 'bg-red-50/60',     colBorder: 'border-red-200',     icon: XCircle,       iconColor: '#DC2626' },
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
              {candidate.name?.[0]}
            </div>
            <div>
              <p className="font-bold text-slate-900">{candidate.name}</p>
              <p className="text-xs text-slate-500">{candidate.job_role}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors font-bold">✕</button>
        </div>

        {/* Integrity Score Hero */}
        <div className={`px-6 py-5 border-b border-slate-100 ${cfg.colBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Integrity Score</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-black ${cfg.color}`}>{integrityScore}</span>
                <span className="text-slate-400 text-sm font-medium">/100</span>
              </div>
              <p className={`text-sm font-bold mt-1 ${cfg.color}`}>{cfg.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-2">Signal breakdown</p>
              <div className="flex gap-3 text-xs">
                <div className="text-center"><p className="font-black text-slate-900 text-lg">{signalLog.length}</p><p className="text-slate-500">Total</p></div>
                <div className="text-center"><p className="font-black text-red-600 text-lg">{significant.length}</p><p className="text-slate-500">Flagged</p></div>
                <div className="text-center"><p className="font-black text-emerald-600 text-lg">{signalLog.length - significant.length}</p><p className="text-slate-500">Clear</p></div>
              </div>
            </div>
          </div>
          {/* Score bar */}
          <div className="mt-4">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${integrityScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  band === 'CLEAN' ? 'bg-emerald-500' :
                  band === 'BORDERLINE' ? 'bg-amber-500' :
                  band === 'FLAGGED' ? 'bg-orange-500' : 'bg-red-500'
                }`}
              />
            </div>
          </div>
          <p className={`mt-3 text-xs font-medium ${cfg.color} bg-white/70 rounded-lg px-3 py-2 border ${cfg.border}`}>
            {band === 'CLEAN' && 'No integrity concerns detected. Candidate may proceed to next round.'}
            {band === 'BORDERLINE' && 'Minor flags detected. Human review recommended before advancing.'}
            {band === 'FLAGGED' && 'Multiple signals detected. Human review REQUIRED before advancing.'}
            {band === 'HIGH_RISK' && 'Strong evidence of dishonesty. Recruiter must review all signals and make the final decision.'}
          </p>
        </div>

        {/* Signal Audit Log */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Signal Audit Log</p>
          {signalLog.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No signals recorded — clean interview.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {signalLog.map((s, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                  s.deduction > 0
                    ? 'bg-red-50 border-red-200'
                    : s.signal.endsWith('_cleared')
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`mt-0.5 text-xs font-black px-1.5 py-0.5 rounded ${
                    s.deduction > 0 ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {s.deduction > 0 ? `-${s.deduction}` : '0'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-xs">{s.signal.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{s.timestamp?.slice(11, 19)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — Human Override Note */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            ⚠ The algorithm proposes — <strong>you decide.</strong> A high-risk score is not an automatic rejection.
            Use your judgment and the signal log above to make the final call.
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
  const cfg = INTEGRITY_BANDS[band];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015 }}
      onClick={() => onClick(candidate)}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
          {candidate.name?.[0]}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate">{candidate.name}</p>
          <p className="text-[10px] text-slate-500 truncate">{candidate.job_role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <IntegrityBadge score={score} />
        <span className={`text-lg font-black ${candidate.global_score >= 75 ? 'text-emerald-600' : candidate.global_score >= 55 ? 'text-red-600' : 'text-slate-400'}`}>
          {Number(candidate.global_score || 0).toFixed(0)}
          <span className="text-xs font-normal text-slate-400">/100</span>
        </span>
      </div>
      {candidate.proctoring_warnings > 0 && (
        <p className="mt-2 text-[10px] text-orange-600 font-semibold flex items-center gap-1">
          <AlertTriangle size={10} /> {candidate.proctoring_warnings} proctoring warning{candidate.proctoring_warnings > 1 ? 's' : ''}
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-400 text-right">Click to view signal log →</p>
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
  const [triageCandidate, setTriageCandidate] = useState(null); // Sprint 4

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

  // Dynamically compute real trend data from the leaderboard history
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
      
      if (!groups[dateStr]) {
        groups[dateStr] = { sum: 0, count: 0, timestamp: dateObj.getTime() };
      }
      const score = Number(c.global_score) || Number(c.technical_score) || Number(c.resume_score) || 0;
      if (score > 0) {
        groups[dateStr].sum += score;
        groups[dateStr].count += 1;
      }
    });

    const sorted = Object.keys(groups).map(k => {
      let avgVal = groups[k].count > 0 ? Math.round(groups[k].sum / groups[k].count) : 0;
      if (isNaN(avgVal)) avgVal = 0;
      return {
        day: k,
        avg: avgVal,
        timestamp: groups[k].timestamp
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    // Smooth the chart if there's only 1 data point
    if (sorted.length === 1) {
      return [
        { day: 'Start', avg: 0 },
        { day: sorted[0].day, avg: sorted[0].avg },
        { day: 'Latest', avg: sorted[0].avg }
      ];
    }
    return sorted.length > 0 ? sorted : [{ day: 'No Data', avg: 0 }];
  }, [leaderboard]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium tracking-wide">Loading Recruiter CRM…</p>
          </div>
        </main>
      </div>
    );
  }

  const d = dashData || {};
  const hired = leaderboard.filter(c => c?.hiring_decision === 'HIRED').length;
  const shortlisted = leaderboard.filter(c => c?.hiring_decision === 'SHORTLISTED').length;

  const avg = (key) => {
    if (!leaderboard || !leaderboard.length) return 0;
    const sum = leaderboard.reduce((s, c) => s + (Number(c?.[key]) || 0), 0);
    const result = Math.round(sum / leaderboard.length);
    return isNaN(result) ? 0 : result;
  };

  const radarData = [
    { axis: 'Technical',       A: avg('technical_score') * 10 },
    { axis: 'Communication',   A: avg('communication_score') },
    { axis: 'Confidence',      A: avg('confidence_score') },
    { axis: 'Problem Solving', A: avg('problem_solving_score') },
    { axis: 'Role Alignment',  A: avg('role_alignment_score') },
    { axis: 'Professionalism', A: avg('professionalism_score') },
    { axis: 'Learning',        A: avg('learning_potential_score') },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold mb-1 tracking-tight text-slate-900">
                AI Recruiter <span className="text-red-700">CRM</span>
              </h1>
              <p className="text-slate-500 text-sm">
                Automated hiring pipeline · {leaderboard.length} candidates tracked
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors text-slate-700 shadow-sm" onClick={load}>
                <RefreshCw size={16} /> Refresh
              </button>
              <button className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 uppercase tracking-wider" onClick={() => navigate('/candidate')}>
                New Candidate <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-8 border-b border-slate-200 pb-0">
            {[
              { key: 'overview',    label: '📊 Overview',              icon: BarChart3 },
              { key: 'leaderboard', label: '🏆 Candidate Leaderboard', icon: Trophy },
              { key: 'triage',      label: '🛡️ Integrity Triage',     icon: Shield },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.key ? 'border-red-600 text-red-600 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── OVERVIEW TAB ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard icon={Users} label="Total Candidates" value={d.total_candidates || 0} colorHex="#475569" delay={0} 
                  onClick={() => setModalFilter('ALL')} />
                <StatCard icon={CheckCircle} label="Interviews Done" value={d.interviews_completed || 0} colorHex="#16A34A" delay={0.07} 
                  onClick={() => setModalFilter('INTERVIEWED')} />
                <StatCard icon={Trophy} label="Offers Extended" value={hired} colorHex="#EAB308" delay={0.14} 
                  onClick={() => setModalFilter('HIRED')} />
                <StatCard icon={Target} label="Shortlisted" value={shortlisted} colorHex="#DC2626" delay={0.21} 
                  onClick={() => setModalFilter('SHORTLISTED')} />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Radar */}
                <motion.div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center">
                    <Zap size={16} className="text-red-500 mr-2" />
                    Average Candidate Profile
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} />
                      <Radar name="Score" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Weekly Trend */}
                <motion.div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center">
                    <BarChart3 size={16} className="text-red-500 mr-2" />
                    Weekly Performance Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={realTrendData}>
                      <defs>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[50, 100]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px', color: '#0F172A' }} itemStyle={{ color: '#ef4444' }} />
                      <Area type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={3} fill="url(#gradBlue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* Recent Candidates */}
              <motion.div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <Clock size={16} className="text-red-600 mr-2" />
                    Recent Registrations
                  </h3>
                  <button className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                    onClick={() => setActiveTab('leaderboard')}>View All →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        {['Name', 'Job Role', 'Email', 'Registered', 'Action'].map(h => (
                          <th key={h} className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(d.recent_candidates || []).map((c, i) => (
                        <motion.tr key={i}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.05 }}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                                {c.name?.[0] || '?'}
                              </div>
                              <span className="font-bold text-sm text-slate-900">{c.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-red-50 border border-red-100 rounded text-xs font-bold text-red-700 tracking-wide">{c.job_role}</span>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-600">{c.email}</td>
                          <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                            {c.created_at && !isNaN(new Date(c.created_at).getTime()) ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 transition-colors shadow-sm"
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
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Top 3 podium */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-end">
                  {[leaderboard[1], leaderboard[0], leaderboard[2]].map((c, i) => {
                    if (!c) return null;
                    const podiumRank = i === 0 ? 2 : i === 1 ? 1 : 3;
                    return (
                      <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`bg-white border rounded-2xl p-6 text-center shadow-sm relative overflow-hidden ${podiumRank === 1 ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-slate-200'}`}
                      >
                        {podiumRank === 1 && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />}
                        <div className={`text-4xl mb-4 ${podiumRank === 1 ? 'text-5xl' : ''}`}>
                          {podiumRank === 1 ? '🥇' : podiumRank === 2 ? '🥈' : '🥉'}
                        </div>
                        <div className="w-14 h-14 rounded-full mx-auto mb-4 bg-slate-50 border-2 flex items-center justify-center text-xl font-black text-slate-900 shadow-sm" style={{ borderColor: RANK_COLORS[podiumRank - 1] }}>
                          {c.name?.[0]}
                        </div>
                        <p className="font-extrabold text-lg mb-1 text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500 mb-4 tracking-wide">{c.job_role}</p>
                        <div className="text-3xl font-black mb-1" style={{ color: RANK_COLORS[podiumRank - 1] }}>
                          {Number(c.global_score || 0).toFixed(1)}
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Global Score</p>
                        <DecisionBadge decision={c.hiring_decision || 'PENDING'} />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Full Leaderboard Table */}
              <motion.div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center">
                    <Trophy size={16} className="text-amber-500 mr-2" />
                    Full Rankings — {leaderboard.length} Candidates
                  </h3>
                  <div className="flex gap-2 items-center">
                    <span className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded cursor-pointer">{hired} Hired</span>
                    <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded cursor-pointer">{shortlisted} Shortlisted</span>
                  </div>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-16">
                    <Trophy size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="font-bold text-slate-500">No candidates yet</p>
                    <p className="text-sm text-slate-400 mt-2">Register candidates and complete interviews to see rankings</p>
                    <button className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all shadow-md uppercase tracking-wider"
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
                            <th key={h} className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((c, i) => (
                          <motion.tr key={c.id}
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors">

                            {/* Rank */}
                            <td className="py-4 px-4 font-black text-lg" style={{ color: i === 0 ? '#EAB308' : i === 1 ? '#94A3B8' : i === 2 ? '#D97706' : '#64748B' }}>
                              {i < 3 ? ['🥇','🥈','🥉'][i] : `#${c.rank || i + 1}`}
                            </td>

                            {/* Name */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                                  {c.name?.[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-slate-900 leading-tight">{c.name}</p>
                                  <p className="text-xs text-slate-500">{c.email}</p>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-4 px-4">
                              <span className="px-2 py-1 bg-red-50 border border-red-100 rounded text-[10px] font-bold text-red-700 uppercase tracking-wide">{c.job_role}</span>
                            </td>

                            {/* Resume Score */}
                            <td className="py-4 px-4 min-w-[100px]">
                              <div>
                                <div className="flex justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Resume</span>
                                  <span className={`text-[11px] font-bold ${c.resume_score >= 70 ? 'text-green-600' : c.resume_score >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>
                                    {c.resume_score || 0}
                                  </span>
                                </div>
                                <ScoreBar score={c.resume_score} colorClass={c.resume_score >= 70 ? 'bg-green-500' : c.resume_score >= 50 ? 'bg-amber-400' : 'bg-slate-500'} />
                              </div>
                            </td>

                            {/* Global Score */}
                            <td className="py-4 px-4">
                              <span className={`text-xl font-black ${c.global_score >= 75 ? 'text-green-600' : c.global_score >= 55 ? 'text-red-600' : 'text-slate-500'}`}>
                                {Number(c.global_score || 0).toFixed(1)}
                              </span>
                            </td>

                            {/* Technical */}
                            <td className="py-4 px-4 min-w-[100px]">
                              <div>
                                <div className="flex justify-between mb-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tech</span>
                                  <span className="text-[11px] font-bold text-red-600">{c.technical_score || 0}</span>
                                </div>
                                <ScoreBar score={c.technical_score} colorClass="bg-red-600" />
                              </div>
                            </td>

                            {/* Decision */}
                            <td className="py-4 px-4">
                              <DecisionBadge decision={c.hiring_decision || (c.interview_status === 'completed' ? 'UNDER_REVIEW' : 'PENDING')} />
                            </td>

                            {/* Action */}
                            <td className="py-4 px-4">
                              <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded text-[11px] font-bold text-slate-700 transition-colors uppercase tracking-wider"
                                onClick={() => {
                                  localStorage.setItem('candidate_id', c.id);
                                  navigate('/report');
                                }}>Report</button>
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

          {/* ── TRIAGE MATRIX TAB — Sprint 4 ── */}
          {activeTab === 'triage' && (
            <motion.div key="triage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                  <Shield size={20} className="text-red-600" /> Integrity Triage Matrix
                </h2>
                <p className="text-sm text-slate-500">
                  Candidates automatically bucketed by their integrity score. Click any card to view the full signal audit log.
                  The algorithm flags — <strong>you decide.</strong>
                </p>
              </div>

              {/* 4-Column Kanban */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {Object.entries(INTEGRITY_BANDS).map(([bandKey, cfg]) => {
                  const bandCandidates = leaderboard.filter(c => getIntegrityBand(c.integrity_score ?? 100) === bandKey);
                  const BandIcon = cfg.icon;
                  return (
                    <div key={bandKey} className={`rounded-2xl border-2 ${cfg.colBorder} ${cfg.colBg} p-4 min-h-[280px] flex flex-col`}>
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <BandIcon size={16} color={cfg.iconColor} />
                          <span className={`text-xs font-extrabold uppercase tracking-widest ${cfg.color}`}>
                            {bandKey.replace('_', ' ')}
                          </span>
                        </div>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${cfg.bg} border ${cfg.border} ${cfg.color}`}>
                          {bandCandidates.length}
                        </span>
                      </div>

                      {/* Score Range Label */}
                      <p className="text-[10px] text-slate-400 mb-3 font-medium">
                        {bandKey === 'CLEAN'      && 'Score ≥ 90 — Proceed to next round'}
                        {bandKey === 'BORDERLINE' && 'Score 70–89 — Review recommended'}
                        {bandKey === 'FLAGGED'    && 'Score 50–69 — Review required'}
                        {bandKey === 'HIGH_RISK'  && 'Score < 50 — Strong evidence'}
                      </p>

                      {/* Cards */}
                      <div className="flex flex-col gap-3 flex-1">
                        {bandCandidates.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <p className="text-xs text-slate-400 font-medium">No candidates</p>
                          </div>
                        ) : (
                          bandCandidates.map(c => (
                            <TriageCard key={c.id} candidate={c} onClick={setTriageCandidate} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary bar */}
              <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pool Summary</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(INTEGRITY_BANDS).map(([bandKey, cfg]) => {
                    const count = leaderboard.filter(c => getIntegrityBand(c.integrity_score ?? 100) === bandKey).length;
                    const pct = leaderboard.length ? Math.round((count / leaderboard.length) * 100) : 0;
                    return (
                      <div key={bandKey} className={`rounded-xl p-4 border ${cfg.border} ${cfg.bg} text-center`}>
                        <p className={`text-3xl font-black ${cfg.color}`}>{count}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${cfg.color}`}>{bandKey.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{pct}% of pool</p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-slate-400 text-center">
                  ℹ Candidates with no completed interview default to <strong>CLEAN</strong> (integrity score = 100).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Integrity Signal Modal — Sprint 4 ── */}
      <AnimatePresence>
        {triageCandidate && (
          <IntegritySignalModal
            candidate={triageCandidate}
            onClose={() => setTriageCandidate(null)}
          />
        )}
      </AnimatePresence>

      {/* ── CUSTOM MODAL WINDOW FOR STAT CARDS ── */}
      <AnimatePresence>
        {modalFilter && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6"
            onClick={() => setModalFilter(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users size={20} className="text-red-600" />
                  {modalFilter === 'ALL' ? 'All Registered Candidates' : 
                   modalFilter === 'INTERVIEWED' ? 'Interviewed Candidates' : 
                   modalFilter === 'HIRED' ? 'Extended Offers' : 'Shortlisted Candidates'}
                </h2>
                <button onClick={() => setModalFilter(null)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors">
                  <span className="font-bold text-sm">✕</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {['Candidate', 'Role', 'Resume', 'Global Score', 'Technical', 'Decision', 'Action'].map(h => (
                        <th key={h} className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 bg-white sticky top-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.filter(c => 
                      modalFilter === 'ALL' ? true : 
                      modalFilter === 'INTERVIEWED' ? c.interview_status === 'completed' || c.hiring_decision !== 'PENDING' : 
                      c.hiring_decision === modalFilter
                    ).map((c, i) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                              {c.name?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900 leading-tight">{c.name}</p>
                              <p className="text-xs text-slate-500">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 bg-red-50 border border-red-100 rounded text-[10px] font-bold text-red-700 uppercase tracking-wide">{c.job_role}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-[11px] font-bold ${c.resume_score >= 70 ? 'text-green-600' : c.resume_score >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>
                            {c.resume_score || 0}/100
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-lg font-black ${c.global_score >= 75 ? 'text-green-600' : c.global_score >= 55 ? 'text-red-600' : 'text-slate-500'}`}>
                            {Number(c.global_score || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[11px] font-bold text-red-600">{c.technical_score || 0}/100</span>
                        </td>
                        <td className="py-4 px-4">
                          <DecisionBadge decision={c.hiring_decision || (c.interview_status === 'completed' ? 'UNDER_REVIEW' : 'PENDING')} />
                        </td>
                        <td className="py-4 px-4">
                          <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded text-[11px] font-bold text-slate-700 transition-colors uppercase tracking-wider"
                            onClick={() => {
                              localStorage.setItem('candidate_id', c.id);
                              navigate('/report');
                            }}>Report</button>
                        </td>
                      </tr>
                    ))}
                    {leaderboard.filter(c => 
                      modalFilter === 'ALL' ? true : 
                      modalFilter === 'INTERVIEWED' ? c.interview_status === 'completed' || c.hiring_decision !== 'PENDING' : 
                      c.hiring_decision === modalFilter
                    ).length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-500 font-medium">
                          No candidates found in this category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
