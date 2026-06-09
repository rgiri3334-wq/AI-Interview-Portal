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
          backgroundColor: '#020617', // Match the slate-950 background
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // A4 size is exactly 210 x 297 mm
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Sterling_Dossier_${c.name.replace(/\\s+/g, '_')}.pdf`);
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
          <div ref={pdfRef} style={{ width: '794px', height: '1123px', backgroundColor: '#FFFFFF', color: '#0F172A', padding: '35px', boxSizing: 'border-box', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Ultra-Premium Blueprint Background */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#F1F5F9 1px, transparent 1px), linear-gradient(90deg, #F1F5F9 1px, transparent 1px)', backgroundSize: '20px 20px', zIndex: 0, opacity: 0.6 }}></div>
            
            {/* Foreground Container to keep above background */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Header - Clean and Professional */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '2px dashed #CBD5E1', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <img src={sterlingLogo} alt="Sterling Logo" style={{ height: '55px' }} />
                  <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0F172A', margin: '0 0 2px 0', letterSpacing: '3px', textTransform: 'uppercase' }}>Sterling E-Mobility</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#DC2626', color: 'white', padding: '3px 8px', fontSize: '10px', fontWeight: '900', letterSpacing: '3px', textTransform: 'uppercase' }}>CONFIDENTIAL</span>
                      <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '900', letterSpacing: '4px', textTransform: 'uppercase' }}>Enterprise AI Dossier</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                   <div style={{ border: '2px solid #0F172A', padding: '8px 15px', display: 'inline-block', background: 'white' }}>
                     <p style={{ fontSize: '9px', color: '#DC2626', margin: '0 0 2px 0', letterSpacing: '2px', fontWeight: '900' }}>GENERATED ON</p>
                     <p style={{ fontSize: '16px', color: '#0F172A', margin: 0, fontWeight: '900' }}>{new Date().toLocaleDateString()}</p>
                   </div>
                </div>
              </div>

              {/* Candidate Info - Dark Mode HUD Pane */}
              <div style={{ position: 'relative', background: '#0F172A', color: 'white', padding: '20px 25px', display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1fr', gap: '20px', marginBottom: '30px' }}>
                 {/* Cyber corner accents */}
                 <div style={{ position: 'absolute', top: 0, left: 0, width: '12px', height: '12px', borderTop: '3px solid #DC2626', borderLeft: '3px solid #DC2626' }}></div>
                 <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderBottom: '3px solid #DC2626', borderRight: '3px solid #DC2626' }}></div>

                 <div>
                   <p style={{ fontSize: '9px', color: '#94A3B8', margin: '0 0 5px 0', letterSpacing: '2px', fontWeight: 'bold' }}>TARGET CANDIDATE</p>
                   <p style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: 'white' }}>{c.name}</p>
                 </div>
                 <div>
                   <p style={{ fontSize: '9px', color: '#94A3B8', margin: '0 0 5px 0', letterSpacing: '2px', fontWeight: 'bold' }}>ROLE ASSESSMENT</p>
                   <p style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: 'white' }}>{c.job_role}</p>
                 </div>
                 <div>
                   <p style={{ fontSize: '9px', color: '#94A3B8', margin: '0 0 5px 0', letterSpacing: '2px', fontWeight: 'bold' }}>CONTACT ID</p>
                   <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#CBD5E1' }}>{c.email}</p>
                 </div>
                 <div>
                   <p style={{ fontSize: '9px', color: '#94A3B8', margin: '0 0 5px 0', letterSpacing: '2px', fontWeight: 'bold' }}>EXPERIENCE / SKILLS</p>
                   <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#CBD5E1' }}>{c.experience || 'N/A'} &bull; {c.skills || 'N/A'}</p>
                 </div>
              </div>

              {/* Grades block - Deep Contrasts */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                 {/* Left Grade Block */}
                 <div style={{ flex: 1.5, display: 'flex', background: gradeColor, position: 'relative', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                    <div style={{ flex: 1, padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                       <p style={{ fontSize: '11px', margin: '0 0 5px 0', letterSpacing: '3px', fontWeight: '900', opacity: 0.9 }}>FINAL GRADE</p>
                       <p style={{ fontSize: '48px', margin: 0, fontWeight: '900', lineHeight: 1 }}>{grade}</p>
                    </div>
                    <div style={{ flex: 1, padding: '20px', background: 'rgba(0,0,0,0.15)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                       <p style={{ fontSize: '11px', margin: '0 0 5px 0', letterSpacing: '3px', fontWeight: '900', opacity: 0.9 }}>OVERALL FIT</p>
                       <p style={{ fontSize: '48px', margin: 0, fontWeight: '900', lineHeight: 1 }}>{overall}<span style={{fontSize: '20px', opacity: 0.8}}>/100</span></p>
                    </div>
                 </div>

                 {/* Right Hiring Status */}
                 <div style={{ flex: 1, border: `3px solid ${gradeColor}`, background: 'white', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-10px', background: 'white', padding: '0 10px', color: gradeColor, fontSize: '10px', fontWeight: '900', letterSpacing: '2px' }}>AI VERDICT</div>
                    <p style={{ fontSize: '28px', margin: 0, fontWeight: '900', color: gradeColor, textTransform: 'uppercase', letterSpacing: '2px' }}>{iv.hiring_decision || 'PENDING'}</p>
                 </div>
              </div>

              {/* AI Intelligence Metrics - Visual Progress Bars */}
              <div style={{ marginBottom: '30px', position: 'relative' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '14px', color: '#0F172A', margin: 0, letterSpacing: '4px', fontWeight: '900' }}>INTELLIGENCE METRICS</h2>
                    <div style={{ flex: 1, height: '2px', background: '#CBD5E1' }}></div>
                    <div style={{ width: '8px', height: '8px', background: '#DC2626', transform: 'rotate(45deg)' }}></div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  {[
                    { label: 'Technical Mastery', val: normalizedTech },
                    { label: 'Problem Solving', val: iv.problem_solving_score || 0 },
                    { label: 'Role Alignment', val: iv.role_alignment_score || 0 },
                    { label: 'Professionalism', val: iv.professionalism_score || 0 },
                    { label: 'Learning Potential', val: iv.learning_potential_score || 0 },
                    { label: 'Emotional Intell.', val: eqScore },
                    { label: 'Confidence Index', val: confScore },
                    { label: 'Communication', val: commScore },
                    { label: 'Behavioral Fit', val: iv.behavioral_score || 0 },
                  ].map((m, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                       <div style={{ flex: 1, marginRight: '15px' }}>
                         <p style={{ fontSize: '9px', color: '#64748B', margin: '0 0 4px 0', letterSpacing: '1px', fontWeight: 'bold', textTransform: 'uppercase' }}>{m.label}</p>
                         <div style={{ width: '100%', background: '#F1F5F9', height: '4px', marginTop: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                           <div style={{ width: `${m.val}%`, background: '#DC2626', height: '100%' }}></div>
                         </div>
                       </div>
                       <p style={{ fontSize: '16px', margin: '0 0 0 0', fontWeight: '900', color: '#0F172A' }}>{m.val}</p>
                    </div>
                  ))}
                 </div>
              </div>

              {/* Lower Section Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', flex: 1 }}>
                 {/* Left Column */}
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '12px', color: '#0F172A', margin: '0 0 10px 0', letterSpacing: '2px', fontWeight: '900', borderLeft: '4px solid #DC2626', paddingLeft: '10px' }}>EXECUTIVE SUMMARY</h3>
                    <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6', margin: '0 0 25px 0', textAlign: 'justify' }}>{iv.summary || 'No summary available.'}</p>
                    
                    <h3 style={{ fontSize: '12px', color: '#0F172A', margin: '0 0 10px 0', letterSpacing: '2px', fontWeight: '900', borderLeft: '4px solid #0F172A', paddingLeft: '10px' }}>PROCTORING LOG</h3>
                    <div style={{ background: iv.proctoring_warnings > 0 ? '#FEF2F2' : 'rgba(248, 250, 252, 0.8)', padding: '15px', border: iv.proctoring_warnings > 0 ? '1px solid #FECACA' : '1px solid #E2E8F0' }}>
                      <p style={{ fontSize: '11px', color: '#0F172A', margin: '0 0 5px 0', fontWeight: '900' }}>SECURITY WARNINGS: <span style={{ color: iv.proctoring_warnings > 0 ? '#EF4444' : '#10B981' }}>{iv.proctoring_warnings || 0}</span> / 3</p>
                      <p style={{ fontSize: '10px', color: '#64748B', margin: 0, fontWeight: 'bold' }}>{(iv.proctoring_logs && iv.proctoring_logs.length > 0) ? 'Violations detected. Manual review required.' : 'No violations detected. Session completely secure.'}</p>
                    </div>
                 </div>

                 {/* Right Column */}
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ background: 'rgba(240, 253, 244, 0.7)', border: '1px solid #BBF7D0', padding: '15px', marginBottom: '20px' }}>
                       <h3 style={{ fontSize: '11px', color: '#166534', margin: '0 0 10px 0', letterSpacing: '2px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#166534', borderRadius: '50%' }}></span>
                          KEY STRENGTHS
                       </h3>
                       <ul style={{ paddingLeft: '15px', margin: 0, color: '#166534', fontSize: '11px', lineHeight: '1.6', fontWeight: '600' }}>
                         {(iv.strengths || []).map((s, i) => <li key={i} style={{ marginBottom: '6px' }}>{s}</li>)}
                       </ul>
                    </div>

                    <div style={{ background: 'rgba(254, 242, 242, 0.7)', border: '1px solid #FECACA', padding: '15px' }}>
                       <h3 style={{ fontSize: '11px', color: '#991B1B', margin: '0 0 10px 0', letterSpacing: '2px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#991B1B', borderRadius: '50%' }}></span>
                          CRITICAL WEAKNESSES
                       </h3>
                       <ul style={{ paddingLeft: '15px', margin: 0, color: '#991B1B', fontSize: '11px', lineHeight: '1.6', fontWeight: '600' }}>
                         {(iv.weaknesses || []).map((w, i) => <li key={i} style={{ marginBottom: '6px' }}>{w}</li>)}
                       </ul>
                    </div>
                 </div>
              </div>

              {/* Spacer to guarantee footer is pushed to very bottom inside the 1123px height */}
              <div style={{ flex: 1 }}></div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid #0F172A', paddingTop: '15px', marginTop: '20px' }}>
                 <img src={sterlingLogo} alt="Sterling" style={{ height: '20px', filter: 'grayscale(100%) opacity(40%)' }} />
                 <p style={{ fontSize: '9px', color: '#94A3B8', letterSpacing: '3px', margin: 0, fontWeight: '900' }}>STERLING E-MOBILITY AI DOSSIER &copy; {new Date().getFullYear()}</p>
                 <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '8px', color: '#94A3B8', margin: 0, letterSpacing: '2px', fontWeight: 'bold' }}>DOCUMENT ID: {iv.interview_id ? iv.interview_id.substring(0,8).toUpperCase() : 'N/A'}</p>
                 </div>
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
