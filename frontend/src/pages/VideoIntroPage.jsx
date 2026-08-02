/**
 * VideoIntroPage.jsx
 * Optional candidate video introduction recording stage.
 * Cyber-Industrial Dark Glassmorphism.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Square, RotateCcw, ArrowRight, X, Mic, Camera, CheckCircle } from 'lucide-react';
import PageWrapper from '../components/Layout/PageWrapper';

const MAX_SECONDS = 30;

export default function VideoIntroPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState('intro'); // intro | preview | recording | review | done
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [permError, setPermError] = useState('');

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play();
      setPhase('preview');
    } catch (e) {
      console.error('Camera preview error:', e);
      setPermError('Camera/mic access denied. Please allow permissions and try again.');
    }
  };

  const startCountdown = () => {
    setPhase('countdown');
    let c = 3;
    setCountdown(c);
    const iv = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        beginRecording();
      }
    }, 1000);
  };

  const beginRecording = () => {
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setPhase('review');
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
        videoRef.current.controls = true;
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setElapsed(0);
    setPhase('recording');

    let s = 0;
    const iv = setInterval(() => {
      s += 1;
      setElapsed(s);
      if (s >= MAX_SECONDS) {
        clearInterval(iv);
        stopRecording();
      }
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const retry = () => {
    setRecordedBlob(null);
    setElapsed(0);
    setPhase('intro');
    startPreview();
  };

  const proceed = () => {
    stopRecording();
    navigate('/prep-kit');
  };

  const skip = () => {
    stopRecording();
    navigate('/prep-kit');
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const pct = (elapsed / MAX_SECONDS) * 100;

  return (
    <PageWrapper className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30">
            <Video size={18} className="text-red-400" />
          </div>
          <div>
            <p className="font-extrabold text-white text-sm">Video Introduction</p>
            <p className="text-slate-400 text-xs font-mono">Optional · 30 Seconds Max</p>
          </div>
        </div>
        <button onClick={skip}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-bold transition-all text-slate-300 hover:text-white">
          Skip <ArrowRight size={14} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-2xl mx-auto w-full">
        {/* INTRO phase */}
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-950/80 border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
              <Video size={36} className="text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Record Introduction</h1>
            <p className="text-slate-300 text-sm font-medium mb-1 max-w-md mx-auto">
              Introduce yourself to the evaluation team in <strong className="text-white">30 seconds or less</strong>.
            </p>
            <p className="text-slate-400 text-xs mb-8 max-w-sm mx-auto">
              This step is optional and stored securely for recruiters.
            </p>
            {permError && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 mb-6 text-red-400 text-xs font-medium">
                {permError}
              </div>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              <motion.button onClick={startPreview} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all text-xs uppercase tracking-wider">
                <Camera size={18} /> Start Recording
              </motion.button>
              <motion.button onClick={skip} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-wider">
                <X size={14} /> Skip This Step
              </motion.button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5"><Mic size={12} className="text-red-500" /> Audio</span>
              <span className="flex items-center gap-1.5"><Camera size={12} className="text-red-500" /> Video</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-emerald-400" /> 30s Max</span>
            </div>
          </motion.div>
        )}

        {/* VIDEO element */}
        {(phase === 'preview' || phase === 'countdown' || phase === 'recording' || phase === 'review') && (
          <div className="w-full max-w-lg">
            <AnimatePresence>
              {phase === 'countdown' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-9xl font-black text-red-500 drop-shadow-[0_0_30px_rgba(225,29,72,0.6)] font-mono"
                  >
                    {countdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] aspect-video mb-5">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />

              {phase === 'recording' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-xs font-mono font-bold">REC {elapsed}s / {MAX_SECONDS}s</span>
                </div>
              )}

              {phase === 'review' && recordedBlob && (
                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono text-emerald-400 font-bold tracking-widest shadow-lg">
                  {(recordedBlob.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              )}
            </div>

            {phase === 'recording' && (
              <div className="w-full bg-slate-900 rounded-full h-2 mb-5 overflow-hidden border border-white/10">
                <motion.div
                  className={`h-full rounded-full transition-colors ${pct > 80 ? 'bg-red-500' : 'bg-emerald-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {phase === 'preview' && (
                <motion.button onClick={startCountdown} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30 text-xs uppercase tracking-wider">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" /> Start Recording
                </motion.button>
              )}

              {phase === 'recording' && (
                <motion.button onClick={stopRecording} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold rounded-xl flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Square size={16} /> Stop Recording
                </motion.button>
              )}

              {phase === 'review' && (
                <>
                  <motion.button onClick={retry} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold rounded-xl flex items-center gap-2 text-xs uppercase tracking-wider">
                    <RotateCcw size={14} /> Redo Take
                  </motion.button>
                  <motion.button onClick={proceed} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 text-xs uppercase tracking-wider">
                    <CheckCircle size={16} /> Use Take <ArrowRight size={14} />
                  </motion.button>
                </>
              )}
            </div>

            {phase === 'review' && (
              <p className="text-center text-slate-400 text-xs mt-4 font-mono">
                Click "Use Take" to confirm or "Redo Take" to record again.
              </p>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
