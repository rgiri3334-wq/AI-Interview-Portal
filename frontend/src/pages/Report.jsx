import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Brain, Smile, Volume2, MessageSquare, Search,
  TrendingUp, TrendingDown, Download, RotateCcw, RefreshCcw, Award, CheckCircle, AlertCircle, ShieldAlert,
  FileText, Clock, Camera, Fingerprint, ChevronRight, Check
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
import { formatIST } from '../utils/istTime';

// SECURITY (#4): The AI's `evaluated_answer` embeds the candidate's RAW answer
// wrapped in highlight <span>s. Rendering it via dangerouslySetInnerHTML without
// sanitizing is a stored-XSS vector. This whitelist sanitizer keeps ONLY
// `<span class="...">` tags (the highlights) and escapes everything else to text,
// neutralizing scripts, event handlers, <img onerror>, etc.
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
        if (child.nodeType === 3) {                    // text node
          out += escapeText(child.textContent);
        } else if (child.nodeType === 1) {             // element
          if (child.tagName === 'SPAN') {              // only spans survive
            const cls = (child.getAttribute('class') || '').replace(/"/g, '');
            out += `<span class="${escapeText(cls)}">${walk(child)}</span>`;
          } else {
            out += walk(child);                        // unknown tag → inner text only
          }
        }
      });
      return out;
    };
    return walk(doc.body);
  } catch (e) {
    return escapeText(html);
  }
}

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
  // Use REAL per-question scores from the backend. No fabricated values — if there
  // are no stored scores, the chart shows flat zeros.
  const scores = Array.isArray(r?.per_question_scores) ? r.per_question_scores : [];
  if (scores.length === 0) {
    return Array.from({ length: 10 }, (_, i) => ({ q: `Q${i + 1}`, score: 0 }));
  }
  return scores.map((s, i) => ({ q: `Q${i + 1}`, score: Number(s) || 0 }));
};

// Interview recording card. By default it plays a looping "highlights" reel of
// 4 random 5-second clips (20s total) pulled from across the full recording.
// A "Watch Full Video" toggle at the bottom switches to the full player with
// native controls (and back to highlights).
function RecordingCard({ recordingUrl, durationSeconds }) {
  const videoRef = useRef(null);
  const [showFull, setShowFull] = useState(false);
  const clipsRef = useRef([]);
  const idxRef = useRef(0);
  const CLIP_LEN = 5;   // seconds per highlight clip
  const NUM_CLIPS = 4;  // 4 clips x 5s = 20s reel

  const pickClips = (duration) => {
    if (!duration || duration <= CLIP_LEN) return [0];
    const maxStart = Math.max(0, duration - CLIP_LEN);
    // 4 random start points spread across the video, sorted for natural flow.
    return Array.from({ length: NUM_CLIPS }, () => Math.random() * maxStart).sort((a, b) => a - b);
  };

  const startHighlights = () => {
    const v = videoRef.current;
    if (!v) return;
    clipsRef.current = pickClips(v.duration);
    idxRef.current = 0;
    try { v.currentTime = clipsRef.current[0] || 0; } catch (_) {}
    v.play().catch(() => {});
  };

  const handleTimeUpdate = () => {
    if (showFull) return;
    const v = videoRef.current;
    if (!v || !clipsRef.current.length) return;
    const start = clipsRef.current[idxRef.current] ?? 0;
    if (v.currentTime - start >= CLIP_LEN || v.currentTime >= (v.duration - 0.25)) {
      idxRef.current += 1;
      if (idxRef.current >= clipsRef.current.length) {
        clipsRef.current = pickClips(v.duration); // re-randomize each loop
        idxRef.current = 0;
      }
      try { v.currentTime = clipsRef.current[idxRef.current] || 0; } catch (_) {}
      v.play().catch(() => {});
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !recordingUrl) return;
    if (showFull) {
      v.pause();
      try { v.currentTime = 0; } catch (_) {}
    } else if (v.readyState >= 1) {
      startHighlights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFull]);

  return (
    <>
      <div className="aspect-video bg-black relative flex-1">
        {recordingUrl ? (
          <>
            <video
              ref={videoRef}
              src={recordingUrl}
              autoPlay={!showFull}
              muted={!showFull}
              controls={showFull}
              playsInline
              preload="metadata"
              onLoadedMetadata={() => { if (!showFull) startHighlights(); }}
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-contain bg-black"
            >
              Your browser cannot play this recording.
            </video>
            {!showFull && (
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 pointer-events-none">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Highlights · 4 × 5s
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm italic px-4 text-center">
            No recording available for this attempt.
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Duration</p>
          <p className="text-sm font-bold text-slate-900">{durationSeconds ? Math.floor(durationSeconds / 60) + 'm ' + (durationSeconds % 60) + 's' : 'N/A'}</p>
        </div>
        {recordingUrl && (
          <button
            onClick={() => setShowFull(s => !s)}
            className="text-red-600 hover:text-red-800 font-bold text-xs uppercase flex items-center gap-1"
          >
            {showFull ? 'Show Highlights' : 'Watch Full Video'} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </>
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
  // Feature 4: admin decision workflow
  const [decision, setDecision] = useState(null);
  const [savingDecision, setSavingDecision] = useState(false);
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
      } catch (e) {
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
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold tracking-wide uppercase">Compiling AI Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-screen bg-slate-50">
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

  // ── Feature 4: decision workflow ──────────────────────────────────────────
  const currentDecision = decision ?? iv.hiring_decision ?? 'PENDING';
  const applyDecision = async (value) => {
    setSavingDecision(true); setDecisionMsg('');
    try {
      await apiClient.updateHiringDecision(iv.interview_id, value);
      setDecision(value);
      setDecisionMsg('Decision saved.');
    } catch (e) {
      setDecisionMsg('Could not save decision. Please retry.');
    } finally { setSavingDecision(false); }
  };
  const emailDecision = async () => {
    setSavingDecision(true); setDecisionMsg('');
    try {
      await apiClient.sendDecisionEmail(c.id);
      setDecisionMsg('Decision email sent to candidate.');
    } catch (e) {
      setDecisionMsg('Could not send email.');
    } finally { setSavingDecision(false); }
  };

  // ── Feature 3: consolidated red flags (real data, no fabrication) ─────────
  const redFlags = [];
  if (iv.termination_reason === 'PROCTORING_ACT') redFlags.push('Interview terminated by proctoring');
  if ((iv.proctoring_warnings || 0) > 0) redFlags.push(`${iv.proctoring_warnings} proctoring warning(s)`);
  if ((iv.integrity_score ?? 100) < 70) redFlags.push(`Integrity ${iv.integrity_score ?? 100}/100 (${iv.integrity_verdict || 'FLAGGED'})`);
  if (Array.isArray(iv.integrity_signals) && iv.integrity_signals.length > 0) redFlags.push(`${iv.integrity_signals.length} integrity signal(s)`);
  if (c.kyc_verified === false) redFlags.push('KYC not verified');

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    
    // Give React time to un-hide all tabs, render the Recharts, and layout images
    setTimeout(async () => {
      try {
        // Reset scroll position to prevent html2canvas from clipping the top
        window.scrollTo(0, 0);
        
        const pdf = new jsPDF({ format: 'a4', compress: true });
        const pdfWidth = 210;
        const pageHeight = 297;
        
        const tabIds = ['export-tab-overview', 'export-tab-kyc', 'export-tab-resume', 'export-tab-transcript', 'export-tab-audit'];
        let isFirstPage = true;

        for (const tabId of tabIds) {
          const tabElement = document.getElementById(tabId);
          if (!tabElement) continue;

          const canvas = await html2canvas(tabElement, {
            scale: 1.5, // Reduced from 2 to 1.5 to save huge amounts of space while maintaining excellent quality
            useCORS: true,
            logging: false,
            backgroundColor: '#FFFFFF',
          });
          
          // Switch to JPEG format with 0.85 quality compression (Massive space saving over PNG)
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;

          // If a single tab is exceptionally long (like the transcript), split it across multiple pages
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        }
        
        pdf.save(`Sterling_Dossier_${c.name.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF", err);
      } finally {
        setIsExporting(false);
      }
    }, 1500);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Star },
    { id: 'kyc', label: 'Identity & Security', icon: Fingerprint },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'transcript', label: 'Interview Transcript', icon: MessageSquare },
    { id: 'audit', label: 'Audit Trail', icon: Clock },
  ];

  return (
    <div className={`flex ${isExporting ? 'h-auto overflow-visible' : 'h-screen overflow-hidden'} bg-slate-50`}>
      <Sidebar />
      <div className={`flex-1 flex flex-col ${isExporting ? 'h-auto overflow-visible' : 'h-screen overflow-y-auto'}`} ref={exportRef}>
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-6 sticky top-0 z-50 shadow-xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-2">
              <img src={sterlingLogo} alt="Sterling" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-widest text-white">Sterling Ultimate Dossier</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{c.name} • {c.job_role || 'Candidate'}</p>
            </div>
          </div>
          <button onClick={handleExport} disabled={isExporting} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50">
            {isExporting ? <RotateCcw className="animate-spin" size={16} /> : <Download size={16} />}
            {isExporting ? 'Compiling...' : 'Export PDF'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 sticky top-[96px] z-40 px-8 flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors font-bold text-xs uppercase tracking-widest ${
                  isActive ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="p-8 pb-24">
          <AnimatePresence mode="wait">
            
            {/* 1. OVERVIEW TAB */}
            {(isExporting || activeTab === 'overview') && (
              <motion.div key="overview" id="export-tab-overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* Feature 3 + 4: Red Flags + Hiring Decision */}
                <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={`rounded-2xl p-6 border shadow-sm ${redFlags.length ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
                      <ShieldAlert size={16} className={redFlags.length ? 'text-red-600' : 'text-emerald-600'} />
                      {redFlags.length ? 'Red Flags' : 'No Red Flags'}
                    </h3>
                    {redFlags.length ? (
                      <ul className="space-y-2">
                        {redFlags.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-red-700 font-medium">
                            <AlertCircle size={14} className="shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-emerald-700 font-medium flex items-center gap-2"><CheckCircle size={14} /> Clean session — no integrity or proctoring concerns.</p>
                    )}
                  </div>

                  <div className="rounded-2xl p-6 border border-slate-200 bg-white shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4 text-slate-900">
                      <Award size={16} className="text-red-600" /> Hiring Decision
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">Current: <span className="font-bold text-slate-800">{currentDecision}</span></p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        { v: 'HIRED', label: 'Hire', cls: 'bg-emerald-600 hover:bg-emerald-700' },
                        { v: 'SHORTLISTED', label: 'Shortlist', cls: 'bg-blue-600 hover:bg-blue-700' },
                        { v: 'ON_HOLD', label: 'Hold', cls: 'bg-amber-500 hover:bg-amber-600' },
                        { v: 'REJECTED', label: 'Reject', cls: 'bg-red-600 hover:bg-red-700' },
                      ].map(b => (
                        <button key={b.v} disabled={savingDecision} onClick={() => applyDecision(b.v)}
                          className={`px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-50 transition ${b.cls} ${currentDecision === b.v ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}>
                          {b.label}
                        </button>
                      ))}
                    </div>
                    <button disabled={savingDecision} onClick={emailDecision}
                      className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1">
                      <MessageSquare size={14} /> Email decision to candidate
                    </button>
                    {decisionMsg && <p className="text-xs text-slate-500 mt-2">{decisionMsg}</p>}
                  </div>
                </div>
                {/* Identity Banner */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 overflow-hidden">
                      {c.selfie_url ? <img src={c.selfie_url} alt="Profile" className="w-full h-full object-cover" /> : <Smile size={32} />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{c.name}</h2>
                      <p className="text-sm text-slate-500 font-medium">{c.email} &bull; Attempt #{iv.attempt_number || 1}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-sm bg-white" style={{ borderColor: gradeColor }}>
                      <span className="text-3xl font-black tracking-tighter" style={{ color: gradeColor }}>{grade}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-3">Rank</p>
                  </div>
                </div>

                {/* Score Rings & Radar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-sm font-bold mb-8 text-slate-900 flex items-center uppercase tracking-widest">
                      <Star size={16} className="text-red-600 mr-3" /> Core Competency Telemetry
                    </h3>
                    <div className="flex flex-wrap justify-around gap-y-12">
                      <ScoreRing score={normalizedTech} label="Technical" color="#DC2626" />
                      <ScoreRing score={eqScore} label="Behavioral" color="#3B82F6" />
                      <ScoreRing score={confScore} label="Confidence" color="#10B981" />
                      <ScoreRing score={commScore} label="Communication" color="#F59E0B" />
                    </div>
                  </div>
                  <div className="col-span-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center">
                    <h3 className="text-sm font-bold w-full text-left mb-4 text-slate-900 uppercase tracking-widest">Neural Radar</h3>
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                          <PolarGrid stroke="#E2E8F0" />
                          <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 'bold' }} />
                          <Radar name="Candidate" dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* AI Synthesis & Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                    <Brain className="absolute -bottom-4 -right-4 text-slate-800 opacity-50" size={120} />
                    <h3 className="text-sm font-bold mb-4 text-red-500 flex items-center uppercase tracking-widest relative z-10">
                      <SparklesIcon /> AI Executive Synthesis
                    </h3>
                    <p className="text-slate-300 leading-relaxed relative z-10">{iv.summary}</p>
                    
                    <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                      <div>
                        <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-2">Key Strengths</h4>
                        <ul className="space-y-2">
                          {(iv.strengths && iv.strengths.length > 0 ? iv.strengths : ['No distinct strengths recorded']).map((s,i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><Check size={14} className="mt-0.5 text-green-500 shrink-0"/> {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Development Areas</h4>
                        <ul className="space-y-2">
                          {(iv.weaknesses && iv.weaknesses.length > 0 ? iv.weaknesses : ['No major weaknesses recorded']).map((w,i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><TrendingDown size={14} className="mt-0.5 text-amber-500 shrink-0"/> {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col justify-center">
                    <h3 className="text-sm font-bold mb-6 text-slate-900 uppercase tracking-widest">Hiring Recommendation</h3>
                    <div className={`p-6 rounded-xl border-l-4 ${iv.hiring_recommendation === 'HIRE' || iv.hiring_recommendation === 'STRONG_HIRE' ? 'bg-green-50 border-green-500 text-green-900' : iv.hiring_recommendation === 'NO_HIRE' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-amber-50 border-amber-500 text-amber-900'}`}>
                      <p className="text-2xl font-black mb-2">{iv.hiring_recommendation || 'PENDING'}</p>
                      <p className="text-sm opacity-80">Based on comprehensive analysis of technical accuracy, behavioral traits, and integrity checks.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. IDENTITY & SECURITY TAB */}
            {(isExporting || activeTab === 'kyc') && (
              <motion.div key="kyc" id="export-tab-kyc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {iv.hiring_decision === 'PROCTORING_ACT' && (
                  <div className="mb-8 bg-red-600 rounded-xl p-4 flex items-center gap-4 text-white shadow-lg border border-red-700">
                    <ShieldAlert size={32} className="shrink-0" />
                    <div>
                      <h4 className="font-bold text-lg">PROCTORING TERMINATION</h4>
                      <p className="text-red-100 text-sm">Session was terminated early due to severe integrity violations.</p>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-8 shadow-sm">
                  <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest">
                    <Fingerprint size={16} className="text-red-600 mr-3" /> Identity & Security Dossier
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Selfie */}
                    <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest">Candidate Selfie</span>
                        {c.kyc_verified ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded">
                            <CheckCircle size={12} /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                            <AlertCircle size={12} /> Unverified
                          </span>
                        )}
                      </div>
                      <div className="aspect-square bg-slate-200 relative overflow-hidden">
                        {c.selfie_url ? (
                          <img src={c.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 italic">No Selfie</div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">OCR Name Match</p>
                        <p className="text-sm font-bold text-slate-900">{c.aadhar_name || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Aadhar */}
                    <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <div className="p-4 bg-slate-800 text-white">
                        <span className="text-xs font-bold uppercase tracking-widest">Govt ID (Aadhar)</span>
                      </div>
                      <div className="aspect-[1.58/1] bg-slate-200 relative overflow-hidden flex-1">
                        {c.aadhar_image_url ? (
                          <img src={c.aadhar_image_url} alt="Aadhar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 italic">No ID Provided</div>
                        )}
                      </div>
                      <div className="p-4 bg-white border-t border-slate-200">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Extracted ID</p>
                        <p className="text-sm font-bold text-slate-900 tracking-widest">{c.aadhar_number_masked || 'XXXX XXXX 0000'}</p>
                      </div>
                    </div>

                    {/* Interview Recording — full video with native controls (play/seek/fullscreen) */}
                    <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50 md:col-span-1">
                      <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest">Interview Recording</span>
                        <span className="text-xs text-slate-300 flex items-center gap-1"><Camera size={12}/> Proctored</span>
                      </div>
                      <RecordingCard recordingUrl={iv.recording_url} durationSeconds={iv.duration_seconds} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Integrity Triage Matrix */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                    <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest">
                      <ShieldAlert size={16} className="text-red-600 mr-3" /> Integrity Triage Matrix
                    </h3>
                    <div className="space-y-6">
                      <TriageBar label="Posture Stability" score={iv.posture_score || 100} />
                      <TriageBar label="Movement Entropy" score={iv.movement_score || 100} />
                      <TriageBar label="Eye Tracking Focus" score={iv.eye_tracking_score || 100} />
                      <TriageBar label="Authenticity" score={iv.authenticity_score || 100} />
                      <TriageBar label="Environment Check" score={iv.environment_score || 100} />
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                     <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest">
                      <AlertCircle size={16} className="text-red-600 mr-3" /> Proctoring Events
                    </h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 h-[250px] overflow-y-auto">
                      {iv.proctoring_logs && iv.proctoring_logs.length > 0 ? (
                        <ul className="space-y-3">
                          {iv.proctoring_logs.map((log, i) => (
                            <li key={i} className="flex gap-3 text-sm items-center">
                              <span className="text-slate-400 whitespace-nowrap">{log.timestamp}</span>
                              <span className="text-red-700 font-bold bg-red-50 px-2 py-1 rounded border border-red-100">{log.event}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 italic">No abnormal events detected</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. RESUME INTELLIGENCE TAB */}
            {(isExporting || activeTab === 'resume') && (
              <motion.div key="resume" id="export-tab-resume" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {!resume ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center">
                    <FileText size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No Resume Found</h3>
                    <p className="text-slate-500">The candidate did not upload a resume for parsing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Metrics Sidebar */}
                    <div className="col-span-1 space-y-8">
                      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-lg text-center">
                        <Award size={48} className="text-yellow-400 mx-auto mb-4" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">AI Resume Match Score</h3>
                        <div className="text-6xl font-black mb-2">{resume.resume_score ? Math.round(resume.resume_score) : 'N/A'}</div>
                        <p className="text-sm text-slate-400">Match against required JD parameters</p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Detected Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {(resume.skills_detected || []).map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                         <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Experience</h3>
                         <div className="text-3xl font-black text-slate-900">{resume.experience_years} <span className="text-lg text-slate-500 font-medium">Years</span></div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-2 space-y-8">
                       <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest border-b pb-4">
                          Education Summary
                        </h3>
                        {Array.isArray(resume.education_summary) ? (
                          <ul className="space-y-4">
                            {resume.education_summary.map((edu, i) => (
                              <li key={i} className="text-sm text-slate-700 font-medium">{edu}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{resume.education_summary || 'No education data.'}</p>
                        )}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest border-b pb-4">
                          Projects & Experience
                        </h3>
                         {Array.isArray(resume.projects_summary) ? (
                          <ul className="space-y-4">
                            {resume.projects_summary.map((proj, i) => (
                              <li key={i} className="text-sm text-slate-700 font-medium">{proj}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{resume.projects_summary || 'No project data.'}</p>
                        )}
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest border-b pb-4">
                          Raw Extracted Text
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-64 overflow-y-auto">
                           <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">{resume.extracted_text}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. INTERVIEW TRANSCRIPT TAB */}
            {(isExporting || activeTab === 'transcript') && (
              <motion.div key="transcript" id="export-tab-transcript" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-8">
                  <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest">
                    <TrendingUp size={16} className="text-red-600 mr-3" /> Technical Accuracy Trajectory
                  </h3>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="q" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="score" stroke="#DC2626" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                   <h3 className="text-sm font-bold mb-6 text-slate-900 flex items-center uppercase tracking-widest border-b pb-4">
                    <MessageSquare size={16} className="text-red-600 mr-3" /> Full QA Transcript
                  </h3>
                  <div className="space-y-8">
                    {transcript && transcript.length > 0 ? transcript.map((qa, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-6 relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 rounded-l-xl"></div>
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1 block">Question {idx + 1}</span>
                            <p className="text-slate-800 font-semibold">{qa.question}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-black ${
                            (qa.score ?? 0) >= 7 ? 'bg-green-100 text-green-700'
                            : (qa.score ?? 0) >= 4 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>{(Number(qa.score) || 0).toFixed(1)}/10</span>
                        </div>
                        <div className="mb-4 bg-white p-4 rounded border border-slate-200">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Candidate Response</span>
                           {qa.answer ? (
                             <p className="text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(qa.answer) }} />
                           ) : (
                             <p className="text-slate-700 text-sm leading-relaxed italic text-slate-400">No response recorded</p>
                           )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {qa.positive_keywords && qa.positive_keywords.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest block mb-1">Matched Keywords</span>
                              <div className="flex gap-1 flex-wrap">
                                {qa.positive_keywords.map((kw, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-sm">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {qa.negative_keywords && qa.negative_keywords.length > 0 && (
                            <div>
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block mb-1">Missing Keywords</span>
                              <div className="flex gap-1 flex-wrap">
                                {qa.negative_keywords.map((kw, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-sm">{kw}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-500 italic">No transcript data available for this session.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. AUDIT TRAIL TAB */}
            {(isExporting || activeTab === 'audit') && (
              <motion.div key="audit" id="export-tab-audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm min-h-[60vh]">
                  <h3 className="text-sm font-bold mb-8 text-slate-900 flex items-center uppercase tracking-widest border-b pb-4">
                    <Clock size={16} className="text-red-600 mr-3" /> System Audit Timeline
                  </h3>
                  
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                    {auditLogs && auditLogs.length > 0 ? auditLogs.map((log, idx) => {
                      let color = 'bg-slate-500';
                      if (log.type === 'SECURITY') color = 'bg-red-500';
                      if (log.type === 'ADMIN') color = 'bg-blue-500';
                      if (log.type === 'SYSTEM') color = 'bg-emerald-500';

                      return (
                        <div key={idx} className="relative">
                          <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ${color}`}></div>
                          <div>
                            <span className="text-xs font-bold text-slate-400 block mb-1">
                             {formatIST(log.timestamp)} • {log.type}
                            </span>
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{log.action}</h4>
                            <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-slate-500 italic">No audit events recorded.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
      <path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0 -1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"></path>
    </svg>
  );
}

function TriageBar({ label, score }) {
  const getSeverity = (s) => {
    if (s >= 90) return { color: 'bg-green-500', text: 'Optimal' };
    if (s >= 70) return { color: 'bg-amber-500', text: 'Minor Deviation' };
    return { color: 'bg-red-500', text: 'High Risk' };
  };
  const { color, text } = getSeverity(score);
  
  return (
    <div>
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">{score}/100 - {text}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1 }} className={`h-full ${color}`} />
      </div>
    </div>
  );
}
