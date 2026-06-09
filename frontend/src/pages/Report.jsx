import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, Brain, Smile, Volume2, MessageSquare, Search,
  TrendingUp, TrendingDown, Download, RotateCcw, Award, CheckCircle, AlertCircle, ShieldAlert
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import sterlingLogo from '../assets/sterling_logo.png';

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
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pdfRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

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
  const eqScore = iv.behavioral_score || 0;
  const confScore = iv.confidence_score || 0;
  const commScore = iv.communication_score || 0;
  const overall = iv.overall_score ? Math.round(iv.overall_score) : Math.max(0, Math.round((normalizedTech + eqScore + confScore + commScore) / 4));

  const grade = overall >= 90 ? 'S' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'F';
  const gradeColor = overall >= 80 ? '#10B981' : overall >= 60 ? '#DC2626' : '#991B1B';

  const handleExport = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(pdfRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#F8FAFC',
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions based on actual canvas aspect ratio
        const pdfWidth = 297; // Landscape A4 width
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // Dynamic PDF sizing for landscape
        const pdf = new jsPDF('l', 'mm', [Math.max(pdfHeight, 210), pdfWidth]);
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Sterling_Dossier_${c.name.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF", err);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  
    return (
      <div className="p-8">


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
            <button onClick={handleExport} disabled={isExporting} className={`px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md uppercase tracking-wider ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={16} />} 
              {isExporting ? 'Exporting PDF...' : 'Export Dossier'}
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

      
        {/* HIDDEN PDF TEMPLATE - ONLY VISIBLE TO HTML2CANVAS */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={pdfRef} style={{ width: '1500px', minHeight: '840px', backgroundColor: '#F8FAFC', color: '#0F172A', padding: '40px', boxSizing: 'border-box', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', gap: '50px' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               {/* Left Header */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #E2E8F0', paddingBottom: '15px', marginBottom: '15px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                   <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}>
                      <img src={sterlingLogo} alt="Logo" style={{ width: '100%' }} />
                   </div>
                   <h1 style={{ fontSize: '26px', fontWeight: '900', margin: 0, lineHeight: '1.1', color: '#0F172A', textTransform: 'uppercase' }}>STERLING<br/><span style={{ fontSize: '20px', color: '#64748B' }}>E-MOBILITY</span></h1>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#64748B', letterSpacing: '2px' }}>CONFIDENTIAL</p>
                   <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0F172A', textTransform: 'uppercase' }}>ENTERPRISE AI DOSSIER</p>
                 </div>
               </div>

               <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A', marginBottom: '25px', letterSpacing: '1px' }}>GENERATED ON {new Date().toLocaleDateString()} <span style={{ color: '#64748B' }}>[cite: 1]</span></p>

               {/* Candidate Details */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                  <div>
                     <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold', color: '#0F172A', letterSpacing: '1px' }}>TARGET CANDIDATE:</p>
                     <h2 style={{ margin: '0 0 10px 0', fontSize: '38px', fontWeight: '900', color: '#0F172A' }}>{c.name} <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 'bold' }}>[cite: 1]</span></h2>
                     <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0F172A' }}>CONTACT: <span style={{ fontWeight: 'normal', color: '#475569' }}>{c.email}</span></p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>{c.job_role}</p>
                  </div>
               </div>

               {/* Grades Row */}
               <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
                  {/* Grade Badge */}
                  <div style={{ width: '160px', height: '180px', border: '8px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <h1 style={{ fontSize: '80px', fontWeight: '900', color: '#0F172A', margin: 0, lineHeight: 1 }}>{grade}</h1>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                     <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '900', color: '#0F172A', letterSpacing: '1px' }}>FINAL GRADE</h3>
                     <p style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#64748B', fontWeight: 'bold' }}>[cite: 1]</p>
                     
                     <div style={{ borderTop: '2px solid #0F172A', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                           <span style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A' }}>AI Verdict</span>
                           <span style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A' }}>{overall}/100</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                           <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>[cite: 1]</span>
                           <div style={{ flex: 1, background: '#F1F5F9', padding: '10px', textAlign: 'center', fontSize: '20px', fontWeight: '900', color: '#DC2626', letterSpacing: '2px' }}>
                              {iv.hiring_decision || 'PENDING'}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Intelligence Metrics */}
               <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: '0 0 15px 0', letterSpacing: '1px' }}>INTELLIGENCE METRICS</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Technical Mastery', val: normalizedTech },
                    { label: 'Problem Solving', val: iv.problem_solving_score || 0 },
                    { label: 'Confidence Index', val: confScore },
                    { label: 'Learning Potential', val: iv.learning_potential_score || 0 },
                    { label: 'empty', val: null },
                    { label: 'Role Alignment', val: 'title' },
                    { label: 'Professionalism', val: iv.professionalism_score || 0 },
                    { label: 'Learning Potential', val: iv.learning_potential_score || 0 },
                    { label: 'Emotional Intell..', val: eqScore },
                    { label: 'Behavioral Fit', val: iv.behavioral_score || 0 },
                    { label: 'Communication', val: commScore },
                  ].map((m, i) => {
                    if (m.label === 'empty') return <div key={i} style={{ height: '10px' }}></div>;
                    if (m.val === 'title') return <h3 key={i} style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', margin: '15px 0 5px 0', letterSpacing: '1px' }}>{m.label.toUpperCase()}</h3>;
                    
                    return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                       <div style={{ width: '220px', background: '#0F172A', color: 'white', padding: '6px 15px', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px', borderTopRightRadius: '20px', borderBottomRightRadius: '20px' }}>
                         {m.label.toUpperCase()}
                       </div>
                       <div style={{ flex: 1, background: '#E2E8F0', height: '28px', marginLeft: '10px' }}>
                          <div style={{ width: `${m.val}%`, background: '#DC2626', height: '100%' }}></div>
                       </div>
                       <div style={{ width: '50px', textAlign: 'right', fontSize: '18px', fontWeight: '900', color: '#0F172A' }}>{m.val}</div>
                    </div>
                  )})}
               </div>

               <div style={{ flex: 1 }}></div>
               {/* Footer Left */}
               <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #CBD5E1', paddingTop: '10px', marginTop: '30px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>STERLING E-MOBILITY AI DOSSIER [cite: 4]</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>DOCUMENT ID: {iv.interview_id ? iv.interview_id.substring(0,8).toUpperCase() : 'N/A'} [cite: 4]</span>
               </div>
            </div>

            {/* CENTER DIVIDER */}
            <div style={{ width: '2px', background: '#E2E8F0', height: '100%' }}></div>

            {/* RIGHT COLUMN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               {/* Right Header */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #E2E8F0', paddingBottom: '15px', marginBottom: '30px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                   <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}>
                      <img src={sterlingLogo} alt="Logo" style={{ width: '100%' }} />
                   </div>
                   <h1 style={{ fontSize: '26px', fontWeight: '900', margin: 0, lineHeight: '1.1', color: '#0F172A', textTransform: 'uppercase' }}>STERLING<br/><span style={{ fontSize: '20px', color: '#64748B' }}>E-MOBILITY</span></h1>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#0F172A', letterSpacing: '2px' }}>GENERATED DATE:</p>
                   <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0F172A' }}>{new Date().toLocaleDateString()}</p>
                 </div>
               </div>

               {/* Exec Summary */}
               <div style={{ border: '3px solid #0F172A', borderRadius: '12px', padding: '25px', marginBottom: '20px', display: 'flex', gap: '20px', background: 'white' }}>
                  <div style={{ flex: 1 }}>
                     <h3 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: '900', color: '#0F172A' }}>EXECUTIVE SUMMARY <span style={{ fontSize: '14px', color: '#64748B' }}>[cite: 1, 2]</span></h3>
                     <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.5', color: '#0F172A' }}>{iv.summary || 'No summary available.'} <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>[cite: 2]</span></p>
                  </div>
                  <div style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ fontSize: '60px' }}>👍</div>
                  </div>
               </div>

               {/* Key Strengths */}
               <div style={{ border: '3px solid #0F172A', borderRadius: '12px', padding: '25px', marginBottom: '20px', display: 'flex', gap: '20px', background: 'white' }}>
                  <div style={{ flex: 1 }}>
                     <h3 style={{ margin: '0 0 15px 0', fontSize: '22px', fontWeight: '900', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-block', width: '24px', height: '24px', background: '#0F172A', color: 'white', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', fontSize: '16px' }}>✓</span>
                        KEY STRENGTHS
                     </h3>
                     <ul style={{ paddingLeft: '35px', margin: 0, fontSize: '18px', lineHeight: '1.6', color: '#0F172A' }}>
                       {(iv.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                     </ul>
                     <p style={{ margin: '10px 0 0 35px', fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>[cite: 3]</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderLeft: '2px solid #E2E8F0', paddingLeft: '20px' }}>
                     <span style={{ fontSize: '80px', fontWeight: '900', color: '#0F172A', lineHeight: 1 }}>{overall}</span>
                     <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>[cite: 4]</span>
                  </div>
               </div>

               {/* Critical Weaknesses */}
               <div style={{ border: '3px solid #0F172A', borderRadius: '12px', padding: '25px', marginBottom: '20px', display: 'flex', gap: '20px', background: 'white' }}>
                  <div style={{ flex: 1 }}>
                     <h3 style={{ margin: '0 0 15px 0', fontSize: '22px', fontWeight: '900', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ display: 'inline-block', width: '24px', height: '24px', background: '#0F172A', color: 'white', borderRadius: '50%', textAlign: 'center', lineHeight: '24px', fontSize: '16px' }}>✓</span>
                        CRITICAL WEAKNESSES
                     </h3>
                     <ul style={{ paddingLeft: '35px', margin: 0, fontSize: '18px', lineHeight: '1.6', color: '#0F172A' }}>
                       {(iv.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
                     </ul>
                     <p style={{ margin: '10px 0 0 35px', fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>[cite: 4]</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ width: '60px', height: '60px', background: '#0F172A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '40px', fontWeight: 'bold' }}>!</div>
                  </div>
               </div>

               {/* Proctoring Log */}
               <div style={{ border: '3px solid #0F172A', borderRadius: '12px', padding: '25px', display: 'flex', gap: '30px', alignItems: 'center', background: 'white' }}>
                  <div style={{ width: '80px', height: '80px', background: '#0F172A', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span style={{ fontSize: '35px' }}>🔒</span>
                  </div>
                  <div>
                     <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '900', color: '#0F172A' }}>PROCTORING LOG:</h3>
                     <p style={{ margin: '0 0 2px 0', fontSize: '18px', color: '#0F172A' }}>SECURITY WARNINGS {iv.proctoring_warnings || 0}/3</p>
                     <p style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#0F172A' }}>{iv.proctoring_warnings > 0 ? 'Violations detected. Review required.' : 'Session completely secure.'}</p>
                     <p style={{ margin: 0, fontSize: '14px', color: '#64748B', fontWeight: 'bold' }}>[cite: 3]</p>
                  </div>
               </div>

               <div style={{ flex: 1 }}></div>
               {/* Footer Right */}
               <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #CBD5E1', paddingTop: '10px', marginTop: '30px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>STERLING E-MOBILITY AI DOSSIER [cite: 4]</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>DOCUMENT ID: {iv.interview_id ? iv.interview_id.substring(0,8).toUpperCase() : 'N/A'} [cite: 4]</span>
               </div>
            </div>

          </div>
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
