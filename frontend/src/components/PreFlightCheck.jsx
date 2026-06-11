/**
 * PreFlightCheck.jsx — Sprint 2 (Visual Revolution)
 *
 * Self-contained device gate that runs BEFORE the interview starts.
 * It acquires and tests camera + microphone, then releases the streams.
 * LiveInterview.jsx then acquires its own streams fresh.
 *
 * Props:
 *   onPass()        — called when the candidate clicks "Begin Interview"
 *                     (camera ✅ + mic ✅ required)
 *   candidateName   — shown in the greeting
 *   jobRole         — shown as context
 *
 * VISUAL REVOLUTION: Dark premium UI matching Landing/Login aesthetic.
 * All logic, checks, retry, compliance modal, mic visualizer — UNCHANGED.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Status constants ────────────────────────────────────────────────────────
const STATUS = {
  IDLE:    'idle',
  TESTING: 'testing',
  PASS:    'pass',
  FAIL:    'fail',
  WARN:    'warn',   // non-blocking (network slow)
};

// ── Animated Background ─────────────────────────────────────────────────────
function DarkBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Red glow orb — top right */}
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-red-600/20 blur-[120px] pointer-events-none" />

      {/* Subtle red orb — bottom left */}
      <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-red-800/10 blur-[100px] pointer-events-none" />

      {/* Top-left accent */}
      <div className="absolute top-0 left-0 w-96 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
    </div>
  );
}

// ── Check Row ───────────────────────────────────────────────────────────────
function CheckRow({ icon, label, status, detail }) {
  const styles = {
    [STATUS.IDLE]:    { row: 'border-white/10 bg-white/5',        badge: 'border-white/20 text-white/40',       dot: 'bg-white/20'     },
    [STATUS.TESTING]: { row: 'border-blue-500/30 bg-blue-500/10', badge: 'border-blue-400/40 text-blue-300',    dot: 'bg-blue-400'     },
    [STATUS.PASS]:    { row: 'border-emerald-500/30 bg-emerald-500/10', badge: 'border-emerald-400/40 text-emerald-300', dot: 'bg-emerald-400' },
    [STATUS.FAIL]:    { row: 'border-red-500/40 bg-red-500/10',   badge: 'border-red-400/40 text-red-300',      dot: 'bg-red-500'      },
    [STATUS.WARN]:    { row: 'border-amber-500/30 bg-amber-500/10', badge: 'border-amber-400/40 text-amber-300', dot: 'bg-amber-400'   },
  };
  const badges = {
    [STATUS.IDLE]:    '—',
    [STATUS.TESTING]: 'Testing',
    [STATUS.PASS]:    '✓ Pass',
    [STATUS.FAIL]:    '✗ Fail',
    [STATUS.WARN]:    '⚠ Slow',
  };
  const labelColors = {
    [STATUS.IDLE]:    'text-white/50',
    [STATUS.TESTING]: 'text-blue-200',
    [STATUS.PASS]:    'text-emerald-200',
    [STATUS.FAIL]:    'text-red-200',
    [STATUS.WARN]:    'text-amber-200',
  };

  const s = styles[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border backdrop-blur-sm transition-all ${s.row}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot} ${status === STATUS.TESTING ? 'animate-pulse' : ''}`} />
        <span className="text-base">{icon}</span>
        <div>
          <p className={`text-sm font-bold tracking-wide ${labelColors[status]}`}>{label}</p>
          {detail && <p className="text-xs text-white/40 mt-0.5 font-medium">{detail}</p>}
        </div>
      </div>
      <span className={`text-[10px] font-black px-3 py-1 rounded-full border backdrop-blur-sm ${s.badge}`}>
        {status === STATUS.TESTING
          ? <span className="inline-flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Testing
            </span>
          : badges[status]
        }
      </span>
    </motion.div>
  );
}

// ── Mic Volume Bar ──────────────────────────────────────────────────────────
function MicVolumeBar({ stream }) {
  const [level, setLevel] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setLevel(Math.min(avg / 80, 1)); // normalize 0‒1
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      source.disconnect();
      ctx.close();
    };
  }, [stream]);

  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="text-xs text-white/40 font-bold uppercase tracking-widest w-20">Mic Level</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
          animate={{ width: `${Math.max(level * 100, 2)}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
      {level > 0.05
        ? <span className="text-xs text-emerald-400 font-black w-20">Detected ✓</span>
        : <span className="text-xs text-white/30 w-20 font-medium">Speak now...</span>
      }
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function PreFlightCheck({ onPass, candidateName = 'Candidate', jobRole = 'Software Engineer' }) {
  // Per-check statuses
  const [camStatus,  setCamStatus]  = useState(STATUS.IDLE);
  const [micStatus,  setMicStatus]  = useState(STATUS.IDLE);
  const [netStatus,  setNetStatus]  = useState(STATUS.IDLE);

  // Per-check detail messages shown under labels
  const [camDetail,  setCamDetail]  = useState('');
  const [micDetail,  setMicDetail]  = useState('');
  const [netDetail,  setNetDetail]  = useState('');

  // Live camera preview
  const videoRef = useRef(null);
  const camStreamRef = useRef(null);
  const micStreamRef = useRef(null);

  const [checksDone, setChecksDone] = useState(false);
  const [canBegin, setCanBegin]     = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [complianceChecked, setComplianceChecked] = useState(false);

  // ── Release all preflight streams ────────────────────────────────────────
  const releaseStreams = useCallback(() => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => releaseStreams(), [releaseStreams]);

  // ── Run all checks sequentially on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function runChecks() {

      // ── CHECK 1: CAMERA ─────────────────────────────────────────────────
      setCamStatus(STATUS.TESTING);
      setCamDetail('Requesting camera permission...');
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { camStream.getTracks().forEach(t => t.stop()); return; }
        camStreamRef.current = camStream;
        if (videoRef.current) videoRef.current.srcObject = camStream;
        setCamStatus(STATUS.PASS);
        setCamDetail('Camera detected and live.');
      } catch (err) {
        if (cancelled) return;
        const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        setCamStatus(STATUS.FAIL);
        setCamDetail(
          denied
            ? 'Camera permission denied. Click the browser lock icon and allow camera access.'
            : `Camera error: ${err.name}. Make sure no other app is using it.`
        );
      }

      if (cancelled) return;
      await new Promise(r => setTimeout(r, 400));

      // ── CHECK 2: MICROPHONE ──────────────────────────────────────────────
      setMicStatus(STATUS.TESTING);
      setMicDetail('Requesting microphone permission...');
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { micStream.getTracks().forEach(t => t.stop()); return; }
        micStreamRef.current = micStream;
        setMicStatus(STATUS.PASS);
        setMicDetail('Microphone detected. Speak to test your level.');
      } catch (err) {
        if (cancelled) return;
        const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        setMicStatus(STATUS.FAIL);
        setMicDetail(
          denied
            ? 'Microphone permission denied. Click the browser lock icon and allow microphone access.'
            : `Microphone error: ${err.name}. Check your audio input device settings.`
        );
      }

      if (cancelled) return;
      await new Promise(r => setTimeout(r, 400));

      // ── CHECK 3: NETWORK SPEED ───────────────────────────────────────────
      setNetStatus(STATUS.TESTING);
      setNetDetail('Measuring connection speed...');
      try {
        const startTime = Date.now();
        await fetch(`https://www.google.com/favicon.ico?cb=${Date.now()}`, {
          mode: 'no-cors',
          cache: 'no-store',
        });
        const latencyMs = Date.now() - startTime;

        if (cancelled) return;
        if (latencyMs < 800) {
          setNetStatus(STATUS.PASS);
          setNetDetail(`Latency: ${latencyMs}ms — Connection is good.`);
        } else {
          setNetStatus(STATUS.WARN);
          setNetDetail(`Latency: ${latencyMs}ms — Connection is slow but interview will proceed.`);
        }
      } catch {
        if (cancelled) return;
        setNetStatus(STATUS.WARN);
        setNetDetail('Could not measure speed (may be a browser policy). Proceeding anyway.');
      }

      if (!cancelled) {
        setChecksDone(true);
      }
    }

    runChecks();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derive canBegin after each status change ──────────────────────────────
  useEffect(() => {
    setCanBegin(camStatus === STATUS.PASS && micStatus === STATUS.PASS && checksDone);
  }, [camStatus, micStatus, checksDone]);

  // ── Handle "Begin Interview" ──────────────────────────────────────────────
  const handleBegin = () => {
    releaseStreams();
    onPass();
  };

  const retryCamera = async () => {
    setCamStatus(STATUS.TESTING);
    setCamDetail('Retrying camera...');
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      camStreamRef.current = camStream;
      if (videoRef.current) videoRef.current.srcObject = camStream;
      setCamStatus(STATUS.PASS);
      setCamDetail('Camera detected and live.');
    } catch (err) {
      setCamStatus(STATUS.FAIL);
      setCamDetail(`Retry failed: ${err.name}. Please check browser permissions and try again.`);
    }
  };

  const retryMic = async () => {
    setMicStatus(STATUS.TESTING);
    setMicDetail('Retrying microphone...');
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = micStream;
      setMicStatus(STATUS.PASS);
      setMicDetail('Microphone detected. Speak to test your level.');
    } catch (err) {
      setMicStatus(STATUS.FAIL);
      setMicDetail(`Retry failed: ${err.name}. Please check browser permissions and try again.`);
    }
  };

  const firstName = candidateName.split(' ')[0];

  return (
    <div className="min-h-screen font-sans flex flex-col justify-center py-10 px-4 relative overflow-hidden">
      <DarkBackground />

      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative z-10">

        {/* ── LEFT: Live Camera Preview ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {/* Camera preview box */}
          <div className={`relative w-full aspect-video bg-black rounded-3xl overflow-hidden transition-all duration-500 ${
            camStatus === STATUS.PASS
              ? 'border-2 border-red-500/40 shadow-[0_0_40px_rgba(220,38,38,0.2)]'
              : 'border-2 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]'
          }`}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)', display: camStatus === STATUS.PASS ? 'block' : 'none' }}
            />

            {/* Camera-off placeholder */}
            {camStatus !== STATUS.PASS && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <svg className="w-9 h-9 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                </div>
                {camStatus === STATUS.TESTING && (
                  <div className="flex items-center gap-2 text-white/40">
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-widest">Requesting camera...</p>
                  </div>
                )}
                {camStatus === STATUS.FAIL && (
                  <p className="text-xs font-bold text-red-400/80 uppercase tracking-widest">Camera unavailable</p>
                )}
                {camStatus === STATUS.IDLE && (
                  <p className="text-xs text-white/20 uppercase tracking-widest font-bold">Camera Preview</p>
                )}
              </div>
            )}

            {/* LIVE badge */}
            {camStatus === STATUS.PASS && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 border border-white/10 text-white text-[10px] font-black px-3 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest"
              >
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                Live Preview
              </motion.div>
            )}

            {/* Red corner accent when live */}
            {camStatus === STATUS.PASS && (
              <>
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-red-500/60 rounded-tl-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-red-500/60 rounded-br-3xl pointer-events-none" />
              </>
            )}
          </div>

          {/* Mic level visualizer */}
          <AnimatePresence>
            {micStatus === STATUS.PASS && micStreamRef.current && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🎙</span>
                  <p className="text-sm font-black text-white/80 tracking-wide">Microphone Test</p>
                </div>
                <p className="text-xs text-white/30 mb-3 font-medium">Speak into your microphone to verify audio is working.</p>
                <MicVolumeBar stream={micStreamRef.current} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips box */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-4">
            <p className="text-sm font-black text-white/70 mb-2 flex items-center gap-2">
              <span>💡</span>
              <span className="uppercase tracking-widest text-xs">Tips for a smooth interview</span>
            </p>
            <ul className="space-y-1.5">
              {[
                'Use a well-lit, quiet room',
                'Look directly at the camera, not the screen',
                'Use Chrome or Edge for best performance',
                'Close other tabs to free up resources',
              ].map((tip, i) => (
                <li key={i} className="flex items-center gap-2.5 text-xs text-white/40 font-medium">
                  <span className="w-1 h-1 rounded-full bg-red-500/60 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* ── RIGHT: Check Panel ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="flex flex-col gap-5"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">
              ● Pre-Interview Check
            </p>
            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Hi <span className="text-red-500">{firstName}</span>, let's verify your setup
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-white/40 font-medium">Role:</span>
              <span className="text-xs font-black text-white/80 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {jobRole}
              </span>
              <span className="text-xs text-white/30 font-medium">· Camera & mic required to begin</span>
            </div>
          </motion.div>

          {/* Checks */}
          <div className="flex flex-col gap-3">
            {/* Camera */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <CheckRow icon="📷" label="Camera" status={camStatus} detail={camDetail} />
              {camStatus === STATUS.FAIL && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={retryCamera}
                  className="mt-2 ml-2 text-xs font-black text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  <span>↺</span> Try Again
                </motion.button>
              )}
            </motion.div>

            {/* Microphone */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <CheckRow icon="🎙" label="Microphone" status={micStatus} detail={micDetail} />
              {micStatus === STATUS.FAIL && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={retryMic}
                  className="mt-2 ml-2 text-xs font-black text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 uppercase tracking-wider"
                >
                  <span>↺</span> Try Again
                </motion.button>
              )}
            </motion.div>

            {/* Network */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <CheckRow icon="🌐" label="Network Speed" status={netStatus} detail={netDetail} />
            </motion.div>
          </div>

          {/* Status summary banners */}
          <AnimatePresence mode="wait">
            {checksDone && !canBegin && (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-500/10 border border-red-500/30 backdrop-blur-sm rounded-2xl px-5 py-3 text-sm text-red-300 font-medium flex items-start gap-3"
              >
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>Camera and microphone are both required. Resolve the issues above and click "Try Again".</span>
              </motion.div>
            )}
            {checksDone && canBegin && netStatus === STATUS.WARN && (
              <motion.div
                key="warn"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm rounded-2xl px-5 py-3 text-sm text-amber-300 font-medium flex items-start gap-3"
              >
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>Your connection is slow. The interview will work, but responses may take a moment.</span>
              </motion.div>
            )}
            {checksDone && canBegin && netStatus !== STATUS.WARN && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm rounded-2xl px-5 py-3 text-sm text-emerald-300 font-medium flex items-center gap-3"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                All checks passed. Your setup is ready for the interview.
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Interview Rules ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden"
          >
            {/* Header bar */}
            <div className="bg-gradient-to-r from-red-700 to-red-600 px-5 py-3 flex items-center gap-2.5">
              <span className="text-white text-sm">📋</span>
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Interview Rules</h3>
            </div>
            <ul className="px-5 py-4 space-y-2.5">
              {[
                { num: '01', text: 'Remain clearly visible in the camera frame at all times.' },
                { num: '02', text: 'Do not use secondary devices (phone, tablet, extra monitor).' },
                { num: '03', text: 'Eye movements, posture & gaze are actively monitored.' },
                { num: '04', text: 'Switching browser tabs or using DevTools is strictly prohibited.' },
                { num: '05', text: 'Sit in a quiet, well-lit room with no other individuals present.' },
                { num: '06', text: 'Speak clearly and at a natural pace — the AI transcribes live.' },
                { num: '07', text: 'Do not read from notes or use AI-assistance tools during the interview.' },
              ].map(({ num, text }, i) => (
                <motion.li
                  key={num}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  className="flex items-start gap-3 text-xs text-white/50 font-medium leading-relaxed"
                >
                  <span className="shrink-0 w-5 h-5 rounded-full bg-red-600/30 border border-red-500/40 text-red-400 text-[9px] font-black flex items-center justify-center mt-0.5">
                    {num}
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>
            <div className="px-5 pb-4">
              <p className="text-[10px] text-white/20 font-medium border-t border-white/5 pt-3">
                Violations are flagged automatically. Serious breaches may result in disqualification.
              </p>
            </div>
          </motion.div>

          {/* Begin Interview Button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            onClick={() => {
              if (canBegin && !showCompliance) {
                setShowCompliance(true);
              }
            }}
            disabled={!canBegin}
            whileHover={canBegin ? { scale: 1.02 } : {}}
            whileTap={canBegin ? { scale: 0.98 } : {}}
            className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg transition-all relative overflow-hidden ${
              canBegin
                ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] cursor-pointer'
                : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed shadow-none'
            }`}
          >
            {/* Shimmer sweep */}
            {canBegin && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.8, ease: 'easeInOut' }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {!checksDone
                ? <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Running Checks...
                  </>
                : canBegin
                ? <>Begin Interview <span className="opacity-70">→</span></>
                : 'Fix Issues Above to Continue'
              }
            </span>
          </motion.button>

          <p className="text-[10px] text-white/20 text-center font-medium">
            By beginning the interview you consent to camera and audio recording for assessment purposes.
          </p>
        </motion.div>
      </div>

      {/* ── Compliance Overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCompliance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="bg-[#111118] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Modal header */}
              <div className="bg-gradient-to-r from-red-700 to-red-600 px-6 py-5 text-white">
                <h3 className="text-lg font-black uppercase tracking-widest">Candidate Guidelines & Compliance</h3>
                <p className="text-red-200 text-xs mt-1 font-medium">Please acknowledge the following rules before beginning.</p>
              </div>

              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  {[
                    'You must remain clearly visible in the camera frame at all times.',
                    'Do not use secondary devices (phones, tablets) or multiple monitors.',
                    'Eye movements and posture are actively monitored to ensure fairness.',
                    'Switching browser tabs or using Developer Tools is strictly prohibited.',
                    'Ensure you are in a quiet, brightly lit room with no other individuals present.',
                  ].map((rule, i) => (
                    <li key={i} className="flex gap-3 text-sm text-white/60 font-medium">
                      <span className="text-red-500 shrink-0 font-black">✓</span>
                      {rule}
                    </li>
                  ))}
                </ul>

                {/* Compliance checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 transition-all">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                      checked={complianceChecked}
                      onChange={(e) => setComplianceChecked(e.target.checked)}
                    />
                  </div>
                  <span className="text-xs text-white/50 select-none font-medium leading-relaxed">
                    I agree to the guidelines above and consent to AI-assisted proctoring and behavioral analysis for the duration of this interview.
                  </span>
                </label>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setShowCompliance(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleBegin}
                    disabled={!complianceChecked}
                    className={`px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                      complianceChecked
                        ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                        : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
                    }`}
                  >
                    Acknowledge & Start
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
