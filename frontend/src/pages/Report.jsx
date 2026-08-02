import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Brain, Smile, Volume2, MessageSquare, Search,
  TrendingUp, TrendingDown, Download, RotateCcw, RefreshCcw, Award, CheckCircle, AlertCircle, ShieldAlert,
  FileText, Clock, Camera, Fingerprint, ChevronRight, Check, Play, Pause, VolumeX, Maximize, Github, Linkedin, Globe, Phone, Mail, MapPin, DollarSign, Briefcase
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import Sidebar from '../components/Layout/Sidebar';
import PageWrapper from '../components/Layout/PageWrapper';
import { apiClient } from '../api/apiClient';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import sterlingLogo from '../assets/sterling_logo.png';
import { formatIST } from '../utils/istTime';

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function sanitizeHighlightHtml(html) {
  if (!html) return '';
  if (typeof window === 'undefined' || !window.DOMParser) return escapeText(html);
  try {
    const doc = new window.DOMParser().parseFromString(String(html), 'text/html');
    const walk = (node) => {
      let out = '';
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          out += escapeText(child.textContent);
        } else if (child.nodeType === 1) {
          if (child.tagName === 'SPAN') {
            const cls = (child.getAttribute('class') || '').replace(/"/g, '');
            out += `<span class="${escapeText(cls)}">${walk(child)}</span>`;
          } else {
            out += walk(child);
          }
        }
      });
      return out;
    };
    return walk(doc.body);
  } catch (e) { console.error(e);
    return escapeText(html);
  }
}

// ── Sterling Premium Score Ring ──────────────────────────────────────────
function ScoreRing({ score, max = 100, color = '#DC2626', label, size = 140 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const safeScore = Math.max(0, Math.min(score, max));
  const offset = circ - (safeScore / max) * circ;

  return (
    <div className="flex flex-col items-center justify-center relative group">
      <div className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-700" style={{ backgroundColor: color }}></div>
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#F1F5F9" strokeWidth={12} />
        <motion.circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={12}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }} 
          strokeDasharray={circ} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none z-20">
        <span className="text-4xl font-black tracking-tighter" style={{ color }}>
          {safeScore}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mt-1">
          {label}
        </span>
      </div>
    </div>
  );
}

const radarFromReport = (r) => [
  { axis: 'Technical', value: r.technical_score ?? 0 },
  { axis: 'Problem Solving', value: r.problem_solving_score ?? 0 },
  { axis: 'Communication', value: r.communication_score ?? 0 },
  { axis: 'Confidence', value: r.confidence_score ?? 0 },
  { axis: 'Professional', value: r.professionalism_score ?? 0 },
  { axis: 'Role Alignment', value: r.role_alignment_score ?? 0 },
  { axis: 'Learning', value: r.learning_potential_score ?? 0 },
  { axis: 'EQ', value: r.behavioral_score ?? 0 },
];

const getTimelineData = (r) => {
  const scores = Array.isArray(r?.per_question_scores) ? r.per_question_scores : [];
  if (scores.length === 0) {
    return Array.from({ length: 10 }, (_, i) => ({ q: `Q${i + 1}`, score: 0 }));
  }
  return scores.map((s, i) => ({ q: `Q${i + 1}`, score: Number(s) || 0 }));
};

// Custom Video Player Component
function CustomVideoPlayer({ recordingUrl, durationSeconds }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };
  
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(p || 0);
  };
  
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedValue = x / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = clickedValue * videoRef.current.duration;
    }
  };
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  if (!recordingUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 border border-slate-200 rounded-2xl p-8 text-slate-400">
        <Camera size={48} className="mb-4 opacity-50" />
        <p className="font-bold uppercase tracking-widest text-xs">No Recording Available</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={recordingUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />
      
      {/* Big Play Button Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={togglePlay}>
          <div className="w-20 h-20 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] transform transition-transform hover:scale-110">
            <Play size={36} className="ml-2" />
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-12 pb-4 px-6 transition-opacity duration-300 ${isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Scrubber */}
        <div className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer overflow-hidden relative group-hover/scrubber" onClick={handleSeek}>
          <div className="h-full bg-red-600 relative" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/scrubber:opacity-100"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-red-500 transition-colors">
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button onClick={toggleMute} className="hover:text-red-500 transition-colors">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="text-xs font-bold font-mono">
              {videoRef.current ? Math.floor(videoRef.current.currentTime / 60) : 0}:
              {videoRef.current ? Math.floor(videoRef.current.currentTime % 60).toString().padStart(2, '0') : '00'}
              {' / '}
              {durationSeconds ? Math.floor(durationSeconds / 60) : 0}:
              {durationSeconds ? Math.floor(durationSeconds % 60).toString().padStart(2, '0') : '00'}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a href={recordingUrl} download className="hover:text-red-500 transition-colors" title="Download Recording">
              <Download size={20} />
            </a>
            <button onClick={toggleFullscreen} className="hover:text-red-500 transition-colors">
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Report() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);
  const [decision, setDecision] = useState(null);
  const [savingDecision, setSavingDecision] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [decisionMsg, setDecisionMsg] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const r = await apiClient.getCandidateReport(id);
        if (!r || !r.candidate) throw new Error("Invalid report data");
        setReport(r);
      } catch (e) { console.error(e);
        setError("Failed to retrieve report for this candidate.");
      }
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-red-600 font-bold tracking-widest uppercase text-sm">Compiling Neural Telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-screen bg-slate-50">
        <AlertCircle size={64} className="text-red-500 mb-6 mx-auto" />
        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Report Unavailable</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto font-medium">{error || "Could not load report."}</p>
        <button onClick={() => navigate('/report')} className="px-8 py-3 bg-red-600 text-white font-bold tracking-widest uppercase rounded-xl hover:bg-red-700 mx-auto shadow-lg shadow-red-600/30 transition-all">
          Return to Reports
        </button>
      </div>
    );
  }

  const c = report.candidate;
  const iv = report.interview;
  const resume = report.resume;
  const auditLogs = report.audit_logs || [];
  const transcript = iv.transcript || [];

  const radarData = radarFromReport(iv);
  const timelineData = getTimelineData(iv);

  const normalizedTech = Math.max(0, iv.technical_score || 0);
  const eqScore = iv.behavioral_score || 0;
  const confScore = iv.confidence_score || 0;
  const commScore = iv.communication_score || 0;
  const overall = iv.overall_score ? Math.round(iv.overall_score) : Math.max(0, Math.round((normalizedTech + eqScore + confScore + commScore) / 4));

  const grade = overall >= 90 ? 'S' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'F';
  const gradeColor = overall >= 80 ? '#10B981' : overall >= 60 ? '#DC2626' : '#991B1B';

  const currentDecision = decision ?? iv.hiring_decision ?? 'PENDING';
  const applyDecision = async (value) => {
    setSavingDecision(true); setDecisionMsg('');
    try {
      await apiClient.updateHiringDecision(iv.interview_id, value);
      setDecision(value);
      setDecisionMsg('Decision saved.');
    } catch (e) { console.error(e);
      setDecisionMsg('Could not save decision. Please retry.');
    } finally { setSavingDecision(false); }
  };
  const emailDecision = async () => {
    setSavingDecision(true); setDecisionMsg('');
    try {
      await apiClient.sendDecisionEmail(c.id);
      setDecisionMsg('Decision email sent to candidate.');
    } catch (e) { console.error(e);
      setDecisionMsg('Could not send email.');
    } finally { setSavingDecision(false); }
  };

  const redFlags = [];
  if (iv.termination_reason === 'PROCTORING_ACT') redFlags.push('Interview terminated by proctoring');
  if (iv.hiring_decision === 'ADMIN_TERMINATED') redFlags.push('Interview terminated by administrator');
  if ((iv.proctoring_warnings || 0) > 0) redFlags.push(`${iv.proctoring_warnings} proctoring warning(s)`);
  if ((iv.integrity_score ?? 100) < 70) redFlags.push(`Integrity ${iv.integrity_score ?? 100}/100 (${iv.integrity_verdict || 'FLAGGED'})`);
  if (Array.isArray(iv.integrity_signals) && iv.integrity_signals.length > 0) redFlags.push(`${iv.integrity_signals.length} integrity signal(s)`);
  if (c.kyc_verified === false) redFlags.push('KYC not verified');

  const trustScore = iv.integrity_score ?? 100;
  const trustColor = trustScore >= 90 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : trustScore >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    setTimeout(async () => {
      try {
        window.scrollTo(0, 0);
        const pdf = new jsPDF({ format: 'a4', compress: true });
        const pdfWidth = 210;
        const pageHeight = 297;
        const tabIds = ['export-tab-overview', 'export-tab-integrity', 'export-tab-resume', 'export-tab-transcript', 'export-tab-audit'];
        let isFirstPage = true;
        for (const tabId of tabIds) {
          const tabElement = document.getElementById(tabId);
          if (!tabElement) continue;
          const canvas = await html2canvas(tabElement, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: '#FAFAFA',
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        }
        pdf.save(`Sterling_Report_${c.name.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF", err);
      } finally {
        setIsExporting(false);
      }
    }, 1500);
  };

  const tabs = [
    { id: 'overview', label: 'Command Center', icon: Star },
    { id: 'integrity', label: 'AI Integrity & Media', icon: ShieldAlert },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'transcript', label: 'Q&A Interrogation', icon: MessageSquare },
    { id: 'audit', label: 'Audit Trail', icon: Clock },
  ];

  return (
    <PageWrapper className={`flex ${isExporting ? 'h-auto overflow-visible' : 'h-screen overflow-hidden'} bg-slate-50 font-sans`}>
      <Sidebar />
      <div className={`flex-1 flex flex-col ${isExporting ? 'h-auto overflow-visible' : 'h-screen overflow-y-auto'}`} ref={exportRef}>
        
        {/* Header Bar */}
        <div className="bg-white border-b border-slate-200 p-6 sticky top-0 z-50 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 flex items-center justify-center p-1">
              <img src={sterlingLogo} alt="Sterling" className="w-full h-full object-contain filter drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Sterling <span className="text-red-600">Dossier</span></h1>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em]">{c.id} // {c.job_role || 'Candidate'}</p>
            </div>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.location.reload()} disabled={isExporting} className="text-slate-400 hover:text-slate-900 transition-colors p-2">
              <RefreshCcw size={20} />
            </button>
            <button onClick={handleExport} disabled={isExporting} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-extrabold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] disabled:opacity-50 hover:-translate-y-0.5">
              {isExporting ? <RotateCcw className="animate-spin" size={16} /> : <Download size={16} />}
              {isExporting ? 'Compiling...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 sticky top-[96px] z-40 px-10 flex gap-8 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-5 border-b-[3px] transition-all font-black text-[10px] uppercase tracking-[0.15em] ${
                  isActive ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="p-10 pb-32 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            
            {/* 1. COMMAND CENTER (OVERVIEW) */}
            {(isExporting || activeTab === 'overview') && (
              <motion.div key="overview" id="export-tab-overview" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ ease: 'easeOut', duration: 0.4 }}>
                
                {/* Hero Profile Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                  {/* Identity Card */}
                  <div className="col-span-1 lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
                    {/* Glowing Accent */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    
                    <div className="relative shrink-0">
                      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10 bg-slate-100">
                        {c.selfie_url ? <img src={c.selfie_url} alt="Profile" className="w-full h-full object-cover" /> : <Smile size={64} className="text-slate-300 m-auto h-full" />}
                      </div>
                      {/* Animated Tier Badge attached to profile */}
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-4 py-1.5 border border-slate-200 shadow-xl z-20 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: gradeColor }}></div>
                        <span className="font-black text-xs tracking-widest text-slate-900">TIER {grade}</span>
                      </div>
                    </div>

                    <div className="flex-1 relative z-10 text-center md:text-left">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{c.name}</h2>
                      <p className="text-sm text-red-600 font-extrabold uppercase tracking-widest mb-6">{c.job_role || 'Candidate'} • Attempt {iv.attempt_number || 1}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-500 mb-6">
                        {c.email && <div className="flex items-center justify-center md:justify-start gap-2"><Mail size={14} className="text-slate-400"/> {c.email}</div>}
                        {c.phone && <div className="flex items-center justify-center md:justify-start gap-2"><Phone size={14} className="text-slate-400"/> {c.phone}</div>}
                        {c.work_mode && <div className="flex items-center justify-center md:justify-start gap-2"><MapPin size={14} className="text-slate-400"/> {c.work_mode}</div>}
                        {c.experience_level && <div className="flex items-center justify-center md:justify-start gap-2"><Briefcase size={14} className="text-slate-400"/> {c.experience_level}</div>}
                      </div>

                      {/* Social Links */}
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        {c.linkedin && (
                          <a href={c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all">
                            <Linkedin size={18} />
                          </a>
                        )}
                        {c.github && (
                          <a href={c.github.startsWith('http') ? c.github : `https://${c.github}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-100 transition-all">
                            <Github size={18} />
                          </a>
                        )}
                        {c.portfolio && (
                          <a href={c.portfolio.startsWith('http') ? c.portfolio : `https://${c.portfolio}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all">
                            <Globe size={18} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trust Score & Decision */}
                  <div className="col-span-1 lg:col-span-5 flex flex-col gap-8">
                    <div className={`rounded-3xl border p-6 flex items-center gap-6 shadow-sm transition-all ${trustColor}`}>
                      <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/50 border border-inherit flex items-center justify-center backdrop-blur-sm">
                        <ShieldAlert size={32} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Proctoring Trust Score</h3>
                        <div className="text-3xl font-black tracking-tighter">{trustScore}<span className="text-lg opacity-50">/100</span></div>
                        <p className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-80">{redFlags.length ? redFlags[0] : 'CLEAN SESSION DETECTED'}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col justify-center">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Hiring Decision</h3>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {[
                          { v: 'HIRED', label: 'Hire', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white' },
                          { v: 'SHORTLISTED', label: 'Shortlist', cls: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white' },
                          { v: 'ON_HOLD', label: 'Hold', cls: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white' },
                          { v: 'REJECTED', label: 'Reject', cls: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white' },
                        ].map(b => (
                          <button key={b.v} disabled={savingDecision} onClick={() => applyDecision(b.v)}
                            className={`flex-1 px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${b.cls} ${currentDecision === b.v ? 'ring-2 ring-offset-2 ring-slate-800 scale-105 shadow-md' : 'opacity-70'}`}>
                            {b.label}
                          </button>
                        ))}
                      </div>
                      <button disabled={savingDecision} onClick={emailDecision}
                        className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        <MessageSquare size={16} /> Send Email Notice
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Rings & Radar Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                  <div className="col-span-1 lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40">
                    <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Star size={18} className="text-red-600" /> Core Competency Telemetry
                      </h3>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global AI Rating: {overall}/100</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-y-12 gap-x-4 px-4">
                      <ScoreRing score={normalizedTech} label="Technical" color="#DC2626" />
                      <ScoreRing score={eqScore} label="Behavioral" color="#0EA5E9" />
                      <ScoreRing score={confScore} label="Confidence" color="#10B981" />
                      <ScoreRing score={commScore} label="Communication" color="#F59E0B" />
                    </div>
                  </div>
                  <div className="col-span-1 lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40 flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-4 text-center">Neural Radar</h3>
                    <div className="flex-1 min-h-[250px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#F1F5F9" strokeWidth={2} />
                          <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }} />
                          <Radar name="Candidate" dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} strokeWidth={3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI Synthesis & Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <Brain className="absolute -bottom-10 -right-10 text-slate-800/50" size={200} />
                    
                    <h3 className="text-sm font-black mb-6 text-red-500 flex items-center uppercase tracking-[0.2em] relative z-10">
                      <SparklesIcon /> Executive Synthesis
                    </h3>
                    <p className="text-slate-300 leading-loose relative z-10 text-sm font-medium">{iv.summary}</p>
                    
                    <div className="mt-10 grid grid-cols-2 gap-8 relative z-10">
                      <div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-700/50 pb-2">Key Strengths</h4>
                        <ul className="space-y-3">
                          {(iv.strengths && iv.strengths.length > 0 ? iv.strengths : ['No distinct strengths recorded']).map((s,i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"><Check size={14} className="mt-0.5 text-emerald-500 shrink-0"/> {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-700/50 pb-2">Development Areas</h4>
                        <ul className="space-y-3">
                          {(iv.weaknesses && iv.weaknesses.length > 0 ? iv.weaknesses : ['No major weaknesses recorded']).map((w,i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"><TrendingDown size={14} className="mt-0.5 text-amber-500 shrink-0"/> {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40 flex flex-col justify-center items-center text-center">
                    <h3 className="text-sm font-black mb-8 text-slate-400 uppercase tracking-[0.2em]">Final AI Recommendation</h3>
                    <div className={`p-10 rounded-full border-[6px] flex flex-col items-center justify-center w-64 h-64 shadow-2xl transition-all hover:scale-105 ${iv.hiring_recommendation === 'HIRE' || iv.hiring_recommendation === 'STRONG_HIRE' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-emerald-500/20' : iv.hiring_recommendation === 'NO_HIRE' ? 'bg-red-50 border-red-500 text-red-600 shadow-red-500/20' : 'bg-amber-50 border-amber-400 text-amber-600 shadow-amber-500/20'}`}>
                      <p className="text-3xl font-black mb-2 tracking-tight leading-none">{iv.hiring_recommendation ? iv.hiring_recommendation.replace('_', ' ') : 'PENDING'}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 max-w-xs leading-relaxed">Based on holistic evaluation of technical accuracy, behavioral traits, and integrity data.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. AI INTEGRITY & MEDIA TAB */}
            {(isExporting || activeTab === 'integrity') && (
              <motion.div key="integrity" id="export-tab-integrity" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ ease: 'easeOut', duration: 0.4 }}>
                
                {/* Custom Video Player Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-10 mb-8 shadow-xl shadow-slate-200/40">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                      <Camera size={18} className="text-red-600" /> Session Recording
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                      Duration: {iv.duration_seconds ? Math.floor(iv.duration_seconds / 60) + 'm ' + (iv.duration_seconds % 60) + 's' : 'N/A'}
                    </span>
                  </div>
                  <div className="max-w-4xl mx-auto">
                    <CustomVideoPlayer recordingUrl={iv.recording_url} durationSeconds={iv.duration_seconds} />
                  </div>
                </div>

                {/* Integrity Triage */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                      <ShieldAlert size={18} className="text-red-600" /> Behavioral Integrity Matrix
                    </h3>
                    <div className="space-y-8">
                      <TriageBar label="Posture Stability" score={iv.posture_score || 100} />
                      <TriageBar label="Movement Entropy" score={iv.movement_score || 100} />
                      <TriageBar label="Eye Tracking Focus" score={iv.eye_tracking_score || 100} />
                      <TriageBar label="Authenticity Check" score={iv.authenticity_score || 100} />
                      <TriageBar label="Environment Status" score={iv.environment_score || 100} />
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40 flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                      <AlertCircle size={18} className="text-red-600" /> Proctoring Log
                    </h3>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 overflow-y-auto max-h-[400px]">
                      {iv.proctoring_logs && iv.proctoring_logs.length > 0 ? (
                        <ul className="space-y-4">
                          {iv.proctoring_logs.map((log, i) => (
                            <li key={i} className="flex gap-4 items-start">
                              <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm whitespace-nowrap mt-0.5">{log.timestamp}</span>
                              <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg shadow-sm leading-relaxed">{log.event}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                          <CheckCircle size={48} className="mb-4 text-emerald-500" />
                          <p className="text-xs font-black uppercase tracking-widest">Zero Violations Detected</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. RESUME INTELLIGENCE TAB */}
            {(isExporting || activeTab === 'resume') && (
              <motion.div key="resume" id="export-tab-resume" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ ease: 'easeOut', duration: 0.4 }}>
                {!resume ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-24 shadow-xl shadow-slate-200/40 text-center flex flex-col items-center">
                    <FileText size={80} className="text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">No Resume Attached</h3>
                    <p className="text-slate-500 font-medium max-w-sm">The candidate bypassed the resume upload step during onboarding.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Metrics Sidebar */}
                    <div className="col-span-1 lg:col-span-4 space-y-8">
                      <div className="bg-slate-900 rounded-3xl p-10 text-white shadow-2xl shadow-slate-900/30 text-center relative overflow-hidden border border-slate-800">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                        <Award size={48} className="text-amber-400 mx-auto mb-6 relative z-10" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 relative z-10">AI Resume Match</h3>
                        <div className="text-7xl font-black mb-4 tracking-tighter relative z-10">{resume.resume_score ? Math.round(resume.resume_score) : 'N/A'}</div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10">Relevance to JD</p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 border-b border-slate-100 pb-3">Detected Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {(resume.skills_detected || []).map((skill, i) => (
                            <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-700 text-xs font-black rounded-lg border border-slate-200 shadow-sm hover:border-red-300 transition-colors cursor-default">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/40 text-center">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-slate-100 pb-3">Years of Experience</h3>
                         <div className="text-5xl font-black text-slate-900">{resume.experience_years}</div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-1 lg:col-span-8 space-y-8">
                       <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40">
                        <h3 className="text-sm font-black mb-8 text-slate-900 flex items-center uppercase tracking-[0.2em] border-b border-slate-100 pb-4">
                          Education Summary
                        </h3>
                        {Array.isArray(resume.education_summary) ? (
                          <ul className="space-y-4">
                            {resume.education_summary.map((edu, i) => (
                              <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-3"><Check size={16} className="mt-0.5 text-red-500 shrink-0"/> {edu}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700 leading-loose whitespace-pre-wrap">{resume.education_summary || 'No education data extracted.'}</p>
                        )}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40">
                        <h3 className="text-sm font-black mb-8 text-slate-900 flex items-center uppercase tracking-[0.2em] border-b border-slate-100 pb-4">
                          Projects & Experience
                        </h3>
                         {Array.isArray(resume.projects_summary) ? (
                          <ul className="space-y-5">
                            {resume.projects_summary.map((proj, i) => (
                              <li key={i} className="text-sm text-slate-700 font-medium leading-relaxed flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <FileText size={16} className="mt-0.5 text-red-500 shrink-0"/> {proj}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700 leading-loose whitespace-pre-wrap">{resume.projects_summary || 'No project data extracted.'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. INTERVIEW TRANSCRIPT TAB */}
            {(isExporting || activeTab === 'transcript') && (
              <motion.div key="transcript" id="export-tab-transcript" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ ease: 'easeOut', duration: 0.4 }}>
                <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40 mb-8">
                  <h3 className="text-sm font-black mb-8 text-slate-900 flex items-center uppercase tracking-[0.2em] border-b border-slate-100 pb-4">
                    <TrendingUp size={18} className="text-red-600 mr-3" /> Technical Accuracy Trajectory
                  </h3>
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="q" tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} dx={-10} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                          cursor={{ stroke: '#DC2626', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#DC2626" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, fill: '#DC2626', stroke: '#fff', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40">
                   <h3 className="text-sm font-black mb-8 text-slate-900 flex items-center uppercase tracking-[0.2em] border-b border-slate-100 pb-4">
                    <MessageSquare size={18} className="text-red-600 mr-3" /> Full QA Interrogation Log
                  </h3>
                  <div className="space-y-8">
                    {transcript && transcript.length > 0 ? transcript.map((qa, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-8 relative overflow-hidden group hover:border-red-200 transition-colors shadow-sm hover:shadow-md">
                        {/* Red Side Accent */}
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-red-500 transition-colors"></div>
                        
                        <div className="mb-6 flex items-start justify-between gap-4 pl-2">
                          <div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-2 block bg-red-50 inline-block px-3 py-1 rounded-full border border-red-100">Phase 0{idx + 1}</span>
                            <p className="text-slate-900 font-black text-lg leading-tight mt-2">{qa.question}</p>
                          </div>
                          <div className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 ${
                            (qa.score ?? 0) >= 7 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : (qa.score ?? 0) >= 4 ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            <span className="text-xl font-black">{(Number(qa.score) || 0).toFixed(1)}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-0.5">/10</span>
                          </div>
                        </div>

                        <div className="mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-inner pl-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Volume2 size={14}/> Transcript</span>
                           {qa.answer ? (
                             <p className="text-slate-700 text-sm leading-loose font-medium" dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(qa.answer) }} />
                           ) : (
                             <p className="text-slate-400 text-sm leading-relaxed italic">Candidate remained silent.</p>
                           )}
                        </div>

                        <div className="flex flex-wrap gap-6 pl-2">
                          {qa.positive_keywords && qa.positive_keywords.length > 0 && (
                            <div className="flex-1 min-w-[200px]">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] block mb-2 border-b border-emerald-100 pb-1">Hit Targets</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {qa.positive_keywords.map((kw, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {qa.negative_keywords && qa.negative_keywords.length > 0 && (
                            <div className="flex-1 min-w-[200px]">
                              <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] block mb-2 border-b border-red-100 pb-1">Missed Targets</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {qa.negative_keywords.map((kw, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-white text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wider rounded-md shadow-sm line-through opacity-70">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12">
                         <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                         <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">No interrogation data logged.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. AUDIT TRAIL TAB */}
            {(isExporting || activeTab === 'audit') && (
              <motion.div key="audit" id="export-tab-audit" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ ease: 'easeOut', duration: 0.4 }}>
                <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/40 min-h-[60vh]">
                  <h3 className="text-sm font-black mb-10 text-slate-900 flex items-center uppercase tracking-[0.2em] border-b border-slate-100 pb-4">
                    <Clock size={18} className="text-red-600 mr-3" /> System Event Ledger
                  </h3>
                  
                  <div className="relative pl-8 border-l-2 border-slate-100 space-y-10 ml-4">
                    {auditLogs && auditLogs.length > 0 ? auditLogs.map((log, idx) => {
                      let color = 'bg-slate-500 shadow-slate-500/40';
                      if (log.type === 'SECURITY') color = 'bg-red-500 shadow-red-500/40';
                      if (log.type === 'ADMIN') color = 'bg-blue-500 shadow-blue-500/40';
                      if (log.type === 'SYSTEM') color = 'bg-emerald-500 shadow-emerald-500/40';

                      return (
                        <div key={idx} className="relative group">
                          <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-md ${color} group-hover:scale-125 transition-transform`}></div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm group-hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-mono text-slate-400 block mb-2 bg-white px-2 py-1 rounded inline-block border border-slate-200">
                             {formatIST(log.timestamp)}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{log.action}</h4>
                            <p className="text-sm text-slate-600 mt-2 font-medium leading-relaxed">{log.details}</p>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Clock size={48} className="opacity-20 mb-4" />
                        <p className="font-bold tracking-widest uppercase text-xs">Ledger Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}

function SparklesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0 -1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"></path>
    </svg>
  );
}

function TriageBar({ label, score }) {
  const getSeverity = (s) => {
    if (s >= 90) return { color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'Optimal' };
    if (s >= 70) return { color: 'bg-amber-500', bg: 'bg-amber-50', text: 'Minor Deviation' };
    return { color: 'bg-red-500', bg: 'bg-red-50', text: 'High Risk' };
  };
  const { color, bg, text } = getSeverity(score);
  
  return (
    <div className={`p-4 rounded-xl border border-slate-100 ${bg}`}>
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-900">{score}/100 - <span className={color.replace('bg-', 'text-')}>{text}</span></span>
      </div>
      <div className="h-2.5 w-full bg-white/50 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full ${color}`} />
      </div>
    </div>
  );
}

 
console.log(typeof Search !== "undefined" ? Search : "");

 
console.log(typeof Fingerprint !== "undefined" ? Fingerprint : "");

 
console.log(typeof ChevronRight !== "undefined" ? ChevronRight : "");

 
console.log(typeof DollarSign !== "undefined" ? DollarSign : "");

// eslint-disable-next-line
console.log(typeof decisionMsg !== "undefined" ? decisionMsg : "");
