import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Mic, Skull, AlertTriangle, Send, Video, MicOff, Maximize, Activity
} from 'lucide-react';
import { API_BASE } from '../../config/api';

export default function LiveIntervention({ showToast }) {
  const [activeSession, setActiveSession] = useState(null); // Mock state for if a candidate is live
  const [overrideQuestion, setOverrideQuestion] = useState("");
  const [killReason, setKillReason] = useState("");

  // Simulated live fetch
  const fetchLiveSession = () => {
    // In a real app, this would poll the backend for any interview with status='in_progress'
    setActiveSession({
      id: "SESSION_" + Date.now().toString().slice(-6),
      candidateName: "Alex Mercer",
      role: "Senior AI Engineer",
      duration: "14:23",
      currentPhase: "Technical Deep Dive",
      pulseRate: "Active"
    });
    showToast("Live session detected!");
  };

  const handlePushQuestion = () => {
    if (!overrideQuestion.trim()) return;
    showToast(`Override question pushed to AI: "${overrideQuestion}"`, "success");
    setOverrideQuestion("");
  };

  const handleKillSwitch = () => {
    if (!killReason.trim()) return showToast("Must provide a reason for termination.", "error");
    if (window.confirm("Are you sure you want to instantly terminate this interview?")) {
      showToast(`Interview terminated. Reason: ${killReason}`, "error");
      setActiveSession(null);
      setKillReason("");
    }
  };

  if (!activeSession) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[1000px] mx-auto text-center space-y-6 pt-20">
        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mx-auto shadow-inner relative overflow-hidden">
           <div className="absolute inset-0 border-4 border-transparent border-t-slate-300 rounded-full animate-spin" />
           <Radio size={48} className="text-slate-300 relative z-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">No Active Interviews</h2>
          <p className="text-slate-500 font-medium mt-2">The Live Intervention module activates automatically when a candidate joins the lobby.</p>
        </div>
        <button onClick={fetchLiveSession} className="px-6 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-bold text-sm text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors">
          Simulate Live Candidate (Dev Mode)
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Live Stream Panel (Mock) */}
      <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col min-h-[600px]">
        <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
          <div className="px-3 py-1 bg-red-600 rounded-lg text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Radio size={12} /> Live
          </div>
          <span className="text-white font-mono text-xs bg-black/50 backdrop-blur px-3 py-1 rounded-lg">{activeSession.duration}</span>
        </div>

        {/* Video feed mock */}
        <div className="flex-1 bg-black rounded-2xl relative overflow-hidden mt-2 border border-slate-800 flex items-center justify-center group">
          <Video size={48} className="text-slate-700 opacity-50" />
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-4 py-2 rounded-xl border border-white/10">
            <h4 className="text-white font-bold text-sm">{activeSession.candidateName}</h4>
            <p className="text-slate-400 text-xs">{activeSession.role}</p>
          </div>
          <button className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20">
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* Intervention Controls */}
      <div className="space-y-6">
        
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2 tracking-tight">
             <Activity size={18} className="text-blue-500"/>
             Session Telemetry
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Session ID</p>
              <p className="text-sm font-mono font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">{activeSession.id}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current AI Phase</p>
              <p className="text-sm font-bold text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">{activeSession.currentPhase}</p>
            </div>
          </div>
        </div>

        {/* Override Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-[60px] opacity-20 pointer-events-none" />
          <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2 relative z-10">
            <Mic size={18} className="text-indigo-400"/>
            Push-to-Talk Override
          </h3>
          <p className="text-xs text-indigo-200 mb-4 relative z-10">Force the AI to ask a specific question immediately.</p>
          
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
              className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Send size={16} /> Push to Agent
            </button>
          </div>
        </div>

        {/* Kill Switch Card */}
        <div className="bg-red-50 rounded-3xl p-6 border border-red-200">
          <h3 className="text-lg font-extrabold text-red-900 mb-4 flex items-center gap-2 tracking-tight">
            <AlertTriangle size={18} className="text-red-600"/>
            Emergency Kill Switch
          </h3>
          <p className="text-xs text-red-700 mb-4 font-medium">Instantly terminate the interview and destroy the connection. Use only if cheating is detected.</p>
          
          <input 
            type="text"
            value={killReason}
            onChange={e => setKillReason(e.target.value)}
            placeholder="Reason for termination..."
            className="w-full bg-white border border-red-200 rounded-xl px-4 py-3 text-sm font-bold text-red-900 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all mb-3 placeholder-red-300"
          />
          
          <button 
            onClick={handleKillSwitch}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl transition-all shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <Skull size={18} /> Terminate
          </button>
        </div>

      </div>
    </motion.div>
  );
}
