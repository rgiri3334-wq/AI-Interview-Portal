import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, SkipForward, ArrowLeft, Volume2, ShieldAlert, CheckCircle 
} from 'lucide-react';
import Avatar3D from '../components/Avatar3D';
import { useAIVoice } from '../hooks/useAIVoice';

import PageWrapper from '../components/Layout/PageWrapper';
import { Cpu, Activity } from 'lucide-react';

export default function InterviewPrepKit() {
  const navigate = useNavigate();
  const jobRole = sessionStorage.getItem('job_role') || 'Candidate';
  const candidateName = sessionStorage.getItem('candidateName') || 'there';
  const firstName = candidateName.split(' ')[0];
  
  // 'disclaimer' -> 'video' -> 'end'
  const [phase, setPhase] = useState('disclaimer');
  const [currentCaption, setCurrentCaption] = useState('');
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [ping, setPing] = useState(24);
  const isPlayingRef = useRef(false);

  const { speak, stop, isSpeaking, isReady: voiceReady } = useAIVoice();

  useEffect(() => {
    const iv = setInterval(() => {
      setPing(20 + Math.floor(Math.random() * 12));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const SCRIPT = [
    `Hello ${firstName}, I am Sterling, your AI interviewer.`,
    `Please listen closely to these quick guidelines before your interview begins.`,
    `First, structure your answers using the STAR method: Situation, Task, Action, and Result.`,
    `Second, take a few seconds to pause and think before you answer. It shows maturity and structure.`,
    `Third, ensure you are in a quiet room with good lighting and a stable internet connection.`,
    `Finally, be ready to discuss your past experience and technical skills for the ${jobRole} role.`,
    `All the best for your interview!`
  ];

  const playSequence = async () => {
    if (!voiceReady) return;
    isPlayingRef.current = true;
    setPhase('video');

    for (let i = 0; i < SCRIPT.length; i++) {
      if (!isPlayingRef.current) break; // if skipped
      setCurrentCaption(SCRIPT[i]);
      setSentenceIndex(i);
      await speak(SCRIPT[i]);
    }

    if (isPlayingRef.current) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    isPlayingRef.current = false;
    stop();
    setPhase('end');
  };

  const skipVideo = () => {
    handleComplete();
  };

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      stop();
    };
  }, [stop]);

  return (
    <PageWrapper className="min-h-screen bg-slate-950 font-sans text-white relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-90" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600 rounded-full blur-[150px] opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center justify-center min-h-[500px]">
        <AnimatePresence mode="wait">
          
          {/* ── PHASE A: DISCLAIMER ── */}
          {phase === 'disclaimer' && (
            <motion.div key="disclaimer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white/10 backdrop-blur-2xl border border-white/20 p-10 rounded-3xl text-center max-w-lg shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                <ShieldAlert className="text-red-400" size={32} />
              </div>
              <h2 className="text-2xl font-black mb-4 tracking-tight">AI Interview Briefing</h2>
              <p className="text-slate-300 mb-8 leading-relaxed font-medium">
                Please watch this short 1-minute video attentively. It contains critical guidelines for your AI interview.
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={playSequence} disabled={!voiceReady}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(220,38,38,0.4)]">
                  <Play size={18} /> {voiceReady ? 'Start Briefing' : 'Loading Audio...'}
                </button>
                <button onClick={() => navigate('/candidate-home')}
                  className="w-full py-4 bg-transparent hover:bg-white/5 text-slate-300 font-bold rounded-xl transition-all">
                  Return to Portal
                </button>
              </div>
            </motion.div>
          )}

          {/* ── PHASE B: VIDEO PLAYER WITH PROCTORING HUD OVERLAY ── */}
          {phase === 'video' && (
            <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full max-w-3xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative aspect-video flex flex-col">
              
              {/* Header Telemetry Bar */}
              <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent z-30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <Volume2 size={12} className={isSpeaking ? "text-green-400" : "text-slate-400"} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      {isSpeaking ? 'AI is speaking' : 'Buffering...'}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    <Activity size={12} /> Ping: {ping}ms
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 px-3 py-1.5 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest">
                    <Cpu size={12} /> HUD ACTIVE
                  </div>
                  <button onClick={skipVideo} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                    Skip <SkipForward size={12} />
                  </button>
                </div>
              </div>

              {/* Bounding Box HUD Lines */}
              <div className="absolute inset-8 border border-dashed border-red-500/30 pointer-events-none z-20 rounded-2xl">
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-red-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-red-500" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-red-500" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-red-500" />
              </div>

              {/* Avatar Canvas */}
              <div className="flex-1 relative bg-slate-950">
                <Avatar3D 
                  isSpeaking={isSpeaking} 
                  hideOverlays={true} 
                  qIndex={sentenceIndex}
                  phase={sentenceIndex === SCRIPT.length - 1 ? 'goodbye' : 'interviewing'}
                />
              </div>

              {/* Captions Bar */}
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-30">
                <div className="text-center min-h-[60px] flex items-end justify-center">
                  <p className="text-xl md:text-2xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">
                    {currentCaption}
                  </p>
                </div>
              </div>

            </motion.div>
          )}

          {/* ── PHASE C: END SLIDE ── */}
          {phase === 'end' && (
            <motion.div key="end" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle className="text-green-400" size={48} />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black mb-4">All the best!</h1>
              <p className="text-xl text-slate-400 mb-10 font-medium">Thank you for watching the briefing.</p>
              
              <button onClick={() => navigate('/candidate-home')}
                className="px-10 py-4 bg-white hover:bg-slate-200 text-black font-black rounded-2xl flex items-center gap-3 transition-all mx-auto shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                <ArrowLeft size={18} /> Return to Portal
              </button>
              <p className="text-slate-500 mt-6 text-sm font-medium">Wait for your scheduled time on the dashboard.</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
