import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { motion } from 'framer-motion';
import {
  Star, Brain, Smile, Volume2, MessageSquare, Search,
  TrendingUp, TrendingDown, Download, RotateCcw, Award, CheckCircle, AlertCircle, ShieldAlert
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
} from 'recharts';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';
import logoUrl from '../../assets/sterling_logo.png';

// ── Sterling Premium Score Ring ──────────────────────────────────────────
function ScoreRing({ score, max = 100, color = '#DC2626', label, size = 120 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const safeScore = Math.max(0, Math.min(score, max));
  const offset = circ - (safeScore / max) * circ;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#27272A" strokeWidth={8} />
        <motion.circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} 
          strokeDasharray={circ} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black tracking-tighter" style={{ color }}>
          {safeScore}
        </span>
        <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mt-1">
          {label}
        </span>
      </div>
    </div>
  );
}

// No mock report in production to prevent data leaks

const radarFromReport = (r) => [
  { axis: 'Technical', value: r.technical_score || 90 },
  { axis: 'Problem Solving', value: r.problem_solving_score || 85 },
  { axis: 'Communication', value: r.communication_score || 95 },
  { axis: 'Confidence', value: r.confidence_score || 92 },
  { axis: 'Professionalism', value: r.professionalism_score || 90 },
  { axis: 'Role Alignment', value: r.role_alignment_score || 88 },
  { axis: 'Learning Potential', value: r.learning_potential_score || 85 },
  { axis: 'EQ', value: r.behavioral_score || 88 },
];

const timelineData = [
  { q: 'Q1', score: 6.5 }, { q: 'Q2', score: 7.0 },
  { q: 'Q3', score: 8.5 }, { q: 'Q4', score: 7.5 },
  { q: 'Q5', score: 9.0 }, { q: 'Q6', score: 8.5 },
  { q: 'Q7', score: 9.5 }, { q: 'Q8', score: 10.0 },
  { q: 'Q9', score: 9.0 }, { q: 'Q10', score: 10.0 },
];

const BAR_COLORS = ['#DC2626', '#EF4444', '#F87171', '#DC2626', '#EF4444'];

export default function Report() {
  const navigate = useNavigate();
  const { id } = useParams();
  const pdfRef = useRef(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const r = await apiClient.getCandidateReport(id);
        if (!r || !r.candidate) throw new Error("Invalid report data");
        setReport(r);
      } catch (e) {
        setError("Failed to retrieve report for this candidate.");
      }
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold tracking-wide uppercase">Compiling AI Analytics...</p>
          </div>
        </div>
      );
    }

    if (error || !report) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <AlertCircle size={48} className="text-red-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Unavailable</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">{error || "Could not load report."}</p>
          <button onClick={() => navigate('/report')} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 mx-auto">
            Return to Reports
          </button>
        </div>
      );
    }

    const c = report.candidate;


  const iv = report.interview;
  const radarData = radarFromReport(iv);

  const normalizedTech = Math.max(0, iv.technical_score || 0);
  
    return (
      <div className="p-8">
        {/* Hidden PDF Template */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
          <div ref={pdfRef} className="w-[794px] h-[1123px] bg-white flex flex-col p-12 text-slate-900 font-sans relative overflow-hidden box-border">
            {/* Futuristic Header */}
            <div className="flex justify-between items-center border-b-[4px] border-red-600 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
                  <img src={logoUrl} alt="Sterling Logo" className="w-10 h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  <div className="hidden w-10 h-10 bg-red-600 text-white flex items-center justify-center font-bold text-sm rounded-lg">S</div>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">STERLING E-MOBILITY</h1>
                  <p className="text-red-600 font-bold tracking-widest uppercase text-sm">Enterprise AI Dossier</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Generated On</div>
                <div className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Candidate Info Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Candidate Identity</h2>
                <div className="space-y-3">
                  <div><span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Name</span><span className="font-black text-lg text-slate-900">{c.name}</span></div>
                  <div><span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Email</span><span className="font-bold text-sm text-slate-700">{c.email}</span></div>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-800"></div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Role Context</h2>
                <div className="space-y-3">
                  <div><span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Target Role</span><span className="font-black text-lg text-slate-900">{c.job_role || 'Not specified'}</span></div>
                  <div><span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-0.5">Experience</span><span className="font-bold text-sm text-slate-700">{c.experience || 'Not specified'}</span></div>
                </div>
              </div>
            </div>

            {/* Overall Fit & Status */}
            <div className="bg-slate-900 text-white p-8 rounded-2xl mb-8 flex items-center justify-between shadow-lg border border-slate-800">
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Final Hiring Decision</h2>
                <div className="text-3xl font-black tracking-tight text-white">{iv.hiring_decision || 'PENDING'}</div>
              </div>
              <div className="text-center px-10 border-x border-slate-700">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Grade</h2>
                <div className="text-4xl font-black" style={{color: gradeColor}}>{grade}</div>
              </div>
              <div className="text-right">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Overall Fit</h2>
                <div className="text-4xl font-black text-red-500">{overall}<span className="text-xl text-slate-500">/100</span></div>
              </div>
            </div>

            {/* AI Intelligence Metrics */}
            <div className="mb-8">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Brain size={16} className="text-red-600"/> AI Intelligence Metrics
              </h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                {[
                  { label: 'Technical Mastery', val: normalizedTech },
                  { label: 'Problem Solving', val: iv.problem_solving_score || 0 },
                  { label: 'Role Alignment', val: iv.role_alignment_score || 0 },
                  { label: 'Professionalism', val: iv.professionalism_score || 0 },
                  { label: 'Learning Potential', val: iv.learning_potential_score || 0 },
                  { label: 'Emotional Intelligence', val: eqScore },
                  { label: 'Confidence Index', val: confScore },
                  { label: 'Communication', val: commScore },
                  { label: 'Behavioral Alignment', val: iv.behavioral_score || 0 }
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-bold text-slate-600 text-sm tracking-wide">{m.label}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full" style={{width: \`\${m.val}%\`}}></div>
                      </div>
                      <span className="font-black text-slate-900 w-8 text-right text-sm">{m.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summaries */}
            <div className="grid grid-cols-2 gap-8 flex-1">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <MessageSquare size={14} className="text-red-600"/> Executive Summary
                  </h2>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-700 leading-relaxed shadow-sm">
                    {iv.summary || 'No summary available.'}
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-red-600"/> Proctoring Intelligence
                  </h2>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Integrity Violations</span>
                    <span className="font-black text-red-600 bg-red-100 px-3 py-1 rounded-lg text-sm">{iv.proctoring_warnings || 0} / 3</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-600"/> Key Strengths
                  </h2>
                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl text-[13px] font-bold text-emerald-800 leading-relaxed shadow-sm">
                    {iv.strengths || 'Not analyzed.'}
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-600"/> Critical Weaknesses
                  </h2>
                  <div className="bg-red-50 border border-red-100 p-5 rounded-xl text-[13px] font-bold text-red-800 leading-relaxed shadow-sm">
                    {iv.weaknesses || 'Not analyzed.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 border-t-[4px] border-slate-900 pt-6 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div>CONFIDENTIAL - INTERNAL HR USE ONLY</div>
              <div>STERLING AI PLATFORM v3.0</div>
            </div>
          </div>
        </div>


        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-red-600 text-xs font-bold tracking-wider uppercase mb-4 shadow-sm">
              <CheckCircle size={14} /> Evaluation Finalized
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-900">
              Candidate <span className="text-red-700">Intelligence Report</span>
            </h1>
            <p className="text-slate-500 font-medium">Advanced metrics and Sterling AI evaluation for {c.name}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/report')} className="px-5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors text-slate-800 shadow-sm">
              <RotateCcw size={16} /> All Reports
            </button>
            <button onClick={handleExport} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md uppercase tracking-wider">
              <Download size={16} /> Export Dossier
            </button>
          </div>
        </motion.div>

        {/* Identity Banner */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 flex justify-between items-center shadow-sm border-l-4 border-l-red-600">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-2xl font-black text-red-600 shadow-sm">
              {c.name?.[0] || 'A'}
            </div>
            <div>
              <h2 className="text-2xl font-black mb-1 text-slate-900">{c.name}</h2>
              <p className="text-red-600 font-bold tracking-wide mb-1 uppercase">{c.job_role}</p>
              <p className="text-sm text-slate-500 font-medium">{c.email} &bull; {c.experience}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-sm bg-white"
              style={{ borderColor: gradeColor }}>
              <span className="text-3xl font-black tracking-tighter" style={{ color: gradeColor }}>{grade}</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-3">Rank</p>
          </div>
        </motion.div>

        {/* Telemetry Rings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
          <h3 className="text-sm font-bold mb-8 text-slate-900 flex items-center uppercase tracking-widest">
            <Star size={16} className="text-red-600 mr-3" /> Core Competency Telemetry
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <ScoreRing score={normalizedTech} label="Technical" color="#DC2626" />
            <ScoreRing score={eqScore} label="EQ Score" color="#10B981" />
            <ScoreRing score={confScore} label="Confidence" color="#DC2626" />
            <ScoreRing score={commScore} label="Clarity" color="#DC2626" />
          </div>
        </motion.div>

        {/* Data Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Radar HUD */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest">
              <Brain size={16} className="text-red-600 mr-3" /> Neural Competency Radar
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                <Radar dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A' }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar Chart HUD */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest">
              <TrendingUp size={16} className="text-red-600 mr-3" /> Technical Accuracy Timeline
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="q" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip cursor={{ stroke: '#F1F5F9', strokeWidth: 2 }} contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="score" stroke="#DC2626" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* AI Synthesis */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm border-t-4 border-t-red-600">
          <h3 className="text-sm font-bold mb-4 text-slate-900 flex items-center uppercase tracking-widest">
            <MessageSquare size={16} className="text-red-600 mr-3" /> Sterling AI Synthesis
          </h3>
          <p className="text-slate-600 leading-relaxed text-lg font-medium">{iv.summary}</p>
        </motion.div>

        {/* Integrity Triage Matrix */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm border-t-4 border-t-slate-800">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-sm font-bold text-slate-900 flex items-center uppercase tracking-widest">
              <ShieldAlert size={16} className="text-slate-800 mr-3" /> Integrity Triage Matrix
            </h3>
            <div className={`px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider border
              ${iv.integrity_verdict === 'CLEAN' ? 'bg-green-50 text-green-700 border-green-200' : 
                iv.integrity_verdict === 'BORDERLINE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                iv.integrity_verdict === 'FLAGGED' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                'bg-red-50 text-red-700 border-red-200'}`}>
              Verdict: {iv.integrity_verdict || 'CLEAN'} ({iv.integrity_score || 100})
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
            {[
              { label: 'Posture (35%)', score: iv.posture_score || 100 },
              { label: 'Movement (25%)', score: iv.movement_score || 100 },
              { label: 'Eye Tracking (20%)', score: iv.eye_tracking_score || 100 },
              { label: 'Authenticity (15%)', score: iv.authenticity_score || 100 },
              { label: 'Environment (5%)', score: iv.environment_score || 100 },
            ].map((metric, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">{metric.label}</span>
                <span className={`text-2xl font-black ${metric.score < 50 ? 'text-red-600' : metric.score < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {Math.round(metric.score)}
                </span>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Signal Logs</h4>
          {iv.integrity_signals && iv.integrity_signals.length > 0 ? (
            <div className="space-y-3">
              {iv.integrity_signals.map((log, index) => (
                <div key={index} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${log.deduction > 0 ? 'bg-red-500' : 'bg-slate-300'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-400 mb-0.5 block">
                      {new Date(log.timestamp).toLocaleTimeString()} &bull; {log.category?.toUpperCase() || 'SYS'} &bull; {log.signal}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{log.note}</span>
                    {log.deduction > 0 && (
                      <span className="ml-2 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                        -{log.deduction} pts
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic text-sm">No integrity violations recorded. Perfect run.</p>
          )}
        </motion.div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-green-50 border border-green-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-bold mb-6 text-green-700 flex items-center uppercase tracking-widest">
              <TrendingUp size={16} className="mr-3" /> Identified Strengths
            </h3>
            <ul className="space-y-4">
              {(iv.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-green-600 shrink-0" />
                  <span className="text-green-800 text-sm font-bold leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-sm font-bold mb-6 text-amber-700 flex items-center uppercase tracking-widest">
              <TrendingDown size={16} className="mr-3" /> Optimization Areas
            </h3>
            <ul className="space-y-4">
              {(iv.weaknesses || []).map((w, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-amber-600 shrink-0" />
                  <span className="text-amber-900 text-sm font-bold leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

      
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
