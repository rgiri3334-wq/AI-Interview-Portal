import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Square, RotateCcw, ArrowRight, X, Mic, Camera, CheckCircle } from 'lucide-react';

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

    // Auto-stop after MAX_SECONDS
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 font-sans text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-md">
            <Video size={18} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-sm">Video Introduction</p>
            <p className="text-slate-400 text-xs">Optional · 30 seconds max</p>
          </div>
        </div>
        <button onClick={skip}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-bold transition-colors text-slate-300 hover:text-white">
          Skip <ArrowRight size={14} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-2xl mx-auto w-full">
        {/* INTRO phase */}
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <Video size={44} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Record a Quick Introduction</h1>
            <p className="text-slate-400 text-lg font-medium mb-2 max-w-md mx-auto">
              Tell us who you are in <strong className="text-white">30 seconds or less</strong>.
            </p>
            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
              This is completely optional and only seen by the hiring team. It helps you stand out beyond your resume.
            </p>
            {permError && (
              <div className="bg-red-900/40 border border-red-700/50 rounded-xl p-4 mb-6 text-red-300 text-sm font-medium">
                {permError}
              </div>
            )}
            <div className="flex gap-4 justify-center flex-wrap">
              <motion.button onClick={startPreview} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center gap-3 shadow-[0_4px_20px_rgba(220,38,38,0.4)] transition-all">
                <Camera size={20} /> Start Recording
              </motion.button>
              <motion.button onClick={skip} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 font-bold rounded-2xl flex items-center gap-2 transition-all">
                <X size={16} /> Skip This Step
              </motion.button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><Mic size={12} /> Audio captured</span>
              <span className="flex items-center gap-1.5"><Camera size={12} /> Video recorded</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={12} /> Max 30 seconds</span>
            </div>
          </motion.div>
        )}

        {/* VIDEO element */}
        {(phase === 'preview' || phase === 'countdown' || phase === 'recording' || phase === 'review') && (
          <div className="w-full max-w-lg">
            {/* Countdown overlay */}
            <AnimatePresence>
              {phase === 'countdown' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-9xl font-black text-white drop-shadow-2xl"
                  >
                    {countdown}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl aspect-video mb-5">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />

              {/* Recording indicator */}
              {phase === 'recording' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white text-xs font-black">REC {elapsed}s / {MAX_SECONDS}s</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {phase === 'recording' && (
              <div className="w-full bg-white/10 rounded-full h-2 mb-5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors ${pct > 80 ? 'bg-red-500' : 'bg-emerald-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {phase === 'preview' && (
                <motion.button onClick={startCountdown} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.4)]">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> Start Recording
                </motion.button>
              )}

              {phase === 'recording' && (
                <motion.button onClick={stopRecording} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-black rounded-2xl flex items-center gap-2">
                  <Square size={18} /> Stop Recording
                </motion.button>
              )}

              {phase === 'review' && (
                <>
                  <motion.button onClick={retry} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-slate-300 font-bold rounded-2xl flex items-center gap-2">
                    <RotateCcw size={16} /> Redo
                  </motion.button>
                  <motion.button onClick={proceed} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.4)]">
                    <CheckCircle size={18} /> Use This Take <ArrowRight size={16} />
                  </motion.button>
                </>
              )}
            </div>

            {phase === 'review' && (
              <p className="text-center text-slate-500 text-xs mt-4 font-medium">
                Happy with it? Click "Use This Take" to submit and continue. Or redo it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
