/**
 * PreFlightCheck.jsx — Sprint 2
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

function CheckRow({ icon, label, status, detail }) {
  const colors = {
    [STATUS.IDLE]:    'text-slate-400 bg-slate-50 border-slate-200',
    [STATUS.TESTING]: 'text-blue-600 bg-blue-50 border-blue-200',
    [STATUS.PASS]:    'text-emerald-700 bg-emerald-50 border-emerald-200',
    [STATUS.FAIL]:    'text-red-600 bg-red-50 border-red-200',
    [STATUS.WARN]:    'text-amber-700 bg-amber-50 border-amber-200',
  };
  const badges = {
    [STATUS.IDLE]:    '—',
    [STATUS.TESTING]: '…',
    [STATUS.PASS]:    '✓ Pass',
    [STATUS.FAIL]:    '✗ Fail',
    [STATUS.WARN]:    '⚠ Slow',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${colors[status]}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          {detail && <p className="text-xs opacity-75 mt-0.5">{detail}</p>}
        </div>
      </div>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[status]}`}>
        {status === STATUS.TESTING
          ? <span className="inline-flex items-center gap-1">
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
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-slate-500 font-medium w-16">Mic Level</span>
      <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          animate={{ width: `${Math.max(level * 100, 2)}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
      {level > 0.05
        ? <span className="text-xs text-emerald-600 font-bold w-16">Detected ✓</span>
        : <span className="text-xs text-slate-400 w-16">Speak now...</span>
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
        // Fetch a small known payload with cache bust to test latency
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
        // Network errors on no-cors are expected on some browsers — treat as warn not fail
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
    // Camera AND Mic must both pass. Network is advisory only.
    setCanBegin(camStatus === STATUS.PASS && micStatus === STATUS.PASS && checksDone);
  }, [camStatus, micStatus, checksDone]);

  // ── Handle "Begin Interview" ──────────────────────────────────────────────
  const handleBegin = () => {
    // Release preflight streams first — LiveInterview will acquire fresh ones
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-center py-10 px-4">
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* ── LEFT: Live Camera Preview ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          {/* Camera preview box */}
          <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-200">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)', display: camStatus === STATUS.PASS ? 'block' : 'none' }}
            />
            {camStatus !== STATUS.PASS && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <svg className="w-16 h-16 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
                {camStatus === STATUS.TESTING && <p className="text-sm font-semibold">Requesting camera...</p>}
                {camStatus === STATUS.FAIL    && <p className="text-sm font-semibold text-red-400">Camera unavailable</p>}
                {camStatus === STATUS.IDLE    && <p className="text-sm">Camera preview</p>}
              </div>
            )}

            {/* LIVE badge */}
            {camStatus === STATUS.PASS && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE PREVIEW
              </div>
            )}
          </div>

          {/* Mic level visualizer — only shown when mic is passing */}
          <AnimatePresence>
            {micStatus === STATUS.PASS && micStreamRef.current && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm"
              >
                <p className="text-sm font-bold text-slate-700 mb-1">🎙 Microphone Test</p>
                <p className="text-xs text-slate-500 mb-2">Speak into your microphone to verify audio is working.</p>
                <MicVolumeBar stream={micStreamRef.current} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tip box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 text-sm text-blue-800">
            <p className="font-bold mb-1">💡 Tips for a smooth interview</p>
            <ul className="text-xs space-y-1 text-blue-700 list-disc list-inside">
              <li>Use a well-lit, quiet room</li>
              <li>Look directly at the camera, not the screen</li>
              <li>Use Chrome or Edge for best performance</li>
              <li>Close other tabs to free up resources</li>
            </ul>
          </div>
        </motion.div>

        {/* ── RIGHT: Check Panel ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-5"
        >
          {/* Header */}
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Pre-Interview Check</p>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Hi {candidateName.split(' ')[0]}, let's verify your setup
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Role: <span className="font-semibold text-slate-700">{jobRole}</span>
              {' · '}We need camera and microphone access to begin.
            </p>
          </div>

          {/* Checks */}
          <div className="flex flex-col gap-3">
            {/* Camera */}
            <div>
              <CheckRow
                icon="📷"
                label="Camera"
                status={camStatus}
                detail={camDetail}
              />
              {camStatus === STATUS.FAIL && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={retryCamera}
                  className="mt-2 text-xs font-bold text-[#EF4444] hover:underline ml-1"
                >
                  → Try Again
                </motion.button>
              )}
            </div>

            {/* Microphone */}
            <div>
              <CheckRow
                icon="🎙"
                label="Microphone"
                status={micStatus}
                detail={micDetail}
              />
              {micStatus === STATUS.FAIL && (
                <motion.button
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={retryMic}
                  className="mt-2 text-xs font-bold text-[#EF4444] hover:underline ml-1"
                >
                  → Try Again
                </motion.button>
              )}
            </div>

            {/* Network */}
            <CheckRow
              icon="🌐"
              label="Network Speed"
              status={netStatus}
              detail={netDetail}
            />
          </div>

          {/* Status summary */}
          <AnimatePresence mode="wait">
            {checksDone && !canBegin && (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium"
              >
                ⚠ Camera and microphone are both required for the interview.
                Please resolve the issues above and click "Try Again".
              </motion.div>
            )}
            {checksDone && canBegin && netStatus === STATUS.WARN && (
              <motion.div
                key="warn"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium"
              >
                ⚠ Your connection is slow. The interview will work, but responses may take a moment.
              </motion.div>
            )}
            {checksDone && canBegin && netStatus !== STATUS.WARN && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium"
              >
                ✅ All checks passed. Your setup is ready for the interview.
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Interview Rules ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
          >
            {/* Header bar */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 flex items-center gap-2">
              <span className="text-white text-base">📋</span>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-widest">Interview Rules</h3>
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
              ].map(({ num, text }) => (
                <li key={num} className="flex items-start gap-3 text-xs text-slate-700 font-medium leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-red-50 border border-red-100 text-red-600 text-[10px] font-black flex items-center justify-center mt-0.5">{num}</span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="px-5 pb-4">
              <p className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3">
                Violations are flagged automatically. Serious breaches may result in disqualification.
              </p>
            </div>
          </motion.div>

          {/* Begin Interview Button */}
          <motion.button
            onClick={() => {
              if (canBegin && !showCompliance) {
                setShowCompliance(true);
              }
            }}
            disabled={!canBegin}
            whileHover={canBegin ? { scale: 1.02 } : {}}
            whileTap={canBegin ? { scale: 0.98 } : {}}
            className={`w-full py-4 rounded-2xl text-base font-bold shadow-lg transition-all relative overflow-hidden ${
              canBegin
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {canBegin && (
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700 skew-x-12 pointer-events-none" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {!checksDone
                ? <><svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Running Checks...</>
                : canBegin
                ? <> Begin Interview <span className="text-red-200">→</span></>
                : 'Fix Issues Above to Continue'
              }
            </span>
          </motion.button>

          <p className="text-xs text-slate-400 text-center">
            By beginning the interview you consent to camera and audio recording for assessment purposes.
          </p>
        </motion.div>
      </div>

      {/* Compliance Overlay */}
      <AnimatePresence>
        {showCompliance && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="bg-red-600 px-6 py-4 text-white">
                <h3 className="text-xl font-bold">Candidate Guidelines & Compliance</h3>
                <p className="text-red-100 text-sm mt-1">Please acknowledge the following rules before beginning.</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3 text-sm text-slate-700 font-medium mb-6">
                  <li className="flex gap-3">
                    <span className="text-red-500 text-lg leading-none">✓</span>
                    You must remain clearly visible in the camera frame at all times.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 text-lg leading-none">✓</span>
                    Do not use secondary devices (phones, tablets) or multiple monitors.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 text-lg leading-none">✓</span>
                    Eye movements and posture are actively monitored to ensure fairness.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 text-lg leading-none">✓</span>
                    Switching browser tabs or using Developer Tools is strictly prohibited.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 text-lg leading-none">✓</span>
                    Ensure you are in a quiet, brightly lit room with no other individuals present.
                  </li>
                </ul>

                <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      checked={complianceChecked}
                      onChange={(e) => setComplianceChecked(e.target.checked)}
                    />
                  </div>
                  <span className="text-sm text-slate-700 select-none">
                    I agree to the guidelines above and consent to AI-assisted proctoring and behavioral analysis for the duration of this interview.
                  </span>
                </label>

                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    onClick={() => setShowCompliance(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleBegin}
                    disabled={!complianceChecked}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                      complianceChecked 
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30 hover:shadow-lg' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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
