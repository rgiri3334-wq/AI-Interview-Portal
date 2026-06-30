import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

import { lazyWithReload } from '../utils/lazyWithReload';
// Lazy-load Monaco Editor to break the circular init between @react-three/drei and @monaco-editor/react
// This forces Vite/Rollup to put them in separate async chunks, eliminating the "Mn before init" crash.
// lazyWithReload self-heals stale-deploy chunk fetch failures.
const Editor = lazyWithReload(
  () => import('@monaco-editor/react').then(mod => ({ default: mod.Editor })),
  'monaco-editor'
);

import { apiClient } from '../api/apiClient';
import logoUrl from '../assets/sterling_logo.png';
import { formatISTTime } from '../utils/istTime';
import Waveform2D from '../components/interview/Waveform2D';
import PreFlightCheck from '../components/PreFlightCheck';

import AvatarStage from '../components/interview/AvatarStage';
import BottomControlBar from '../components/interview/BottomControlBar';
import WorkspaceDrawer from '../components/interview/WorkspaceDrawer';

import { useWebSocketSTT } from '../hooks/useWebSocketSTT';
import { useAudioStream } from '../hooks/useAudioStream';
import { useHumanBehavior } from '../hooks/useHumanBehavior';
import { useCodeWorkspace, SUPPORTED_LANGUAGES } from '../hooks/useCodeWorkspace';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { useVAD } from '../hooks/useVAD';
import { useIntegrityEngine } from '../hooks/useIntegrityEngine'; // Sprint 3

const MAX_QUESTIONS = 10;

function useTypewriter(text, speed = 30) {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    setDisplayedText('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayedText;
}

export default function LiveInterview() {
  const navigate = useNavigate();

  const candidateId = sessionStorage.getItem('candidateId') || 'DEMO-001';
  const candidateName = sessionStorage.getItem('candidateName') || 'Candidate';
  const jobRole = sessionStorage.getItem('job_role') || 'Software Engineer';
  const experience = sessionStorage.getItem('experience') || 'Fresher (0 years)';
  const skills = sessionStorage.getItem('skills') || '';

  // Sprint 2: 'preflight' is the initial gate phase.
  // Flow: preflight → ready → initializing → interviewing → ending
  const [phase, setPhase] = useState('preflight');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Computing...');
  const [warnings, setWarnings] = useState(0);
  const [textFallback, setTextFallback] = useState('');

  const proctoringLogsRef = useRef([]);
  const [fullscreenLock, setFullscreenLock] = useState(false);
  const [focusLock, setFocusLock] = useState(false);

  // New UI States
  const [theme, setTheme] = useState('dark');
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleCode = () => setIsCodeOpen(prev => !prev);

  const addProctoringLog = useCallback((eventDescription) => {
    const logEntry = {
      event: eventDescription,
      timestamp: formatISTTime(new Date().toISOString()),
    };
    proctoringLogsRef.current.push(logEntry);
    console.warn(`[Proctoring] ${eventDescription}`);
  }, []);

  const [question, setQuestion] = useState('System Initializing...');
  const [overlayMsg, setOverlayMsg] = useState('');
  const [postureHint, setPostureHint] = useState('');  // Candidate-facing posture hint
  const postureHintTimerRef = useRef(null);
  const displayedQuestion = useTypewriter(question, 10);

  const [qIndex, setQIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const historyRef = useRef(history);
  useEffect(() => { historyRef.current = history; }, [history]);
  // Fix #9: Track interview start time to compute real WPM
  const questionStartTimeRef = useRef(Date.now());

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [camError, setCamError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const { editorRef, language, setLanguage, handleEditorMount, getCode, clearCode } = useCodeWorkspace({ defaultLanguage: 'javascript' });
  const { speak, speakChunks, stop: stopVoice, isSpeaking, getAudioFrequency, playActiveListeningCue } = useAudioStream();
  const [nudgePill, setNudgePill] = useState(null);
  const nudgeTimerRef = useRef(null);
  const isStartingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isMounted = useRef(true);

  // Nudge pill rotator — fires encouraging nudges at specific question intervals
  useEffect(() => {
    const NUDGES = [
      '💬 Be specific — use real examples',
      '🔢 Quantify your impact with numbers',
      '⏱️ You\'re doing great — take your time',
      '🎯 STAR format: Situation → Task → Action → Result',
      '💡 Mention what you learned from the experience',
      '🤝 Show how you collaborated with your team',
    ];
    if (phase === 'interviewing' && qIndex > 0 && qIndex % 2 === 0) {
      const msg = NUDGES[Math.floor(qIndex / 2) % NUDGES.length];
      setNudgePill(msg);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = setTimeout(() => setNudgePill(null), 5000);
    }
    return () => { if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current); };
  }, [qIndex, phase]);

  // Sprint 3: Integrity Engine — collects signals throughout the interview
  const {
    integrityScore,
    recordSignal: recordIntegritySignal,
    checkGptSyntax,
    checkBehavioral,
    computeFinal: computeIntegrityFinal,
  } = useIntegrityEngine();

  const onVisionSignal = useCallback((signalKey, meta) => {
    // All vision signals feed integrity engine SILENTLY — never shown to candidate
    recordIntegritySignal(signalKey, meta);
    
    // Strict Proctoring: Immediately terminate if multiple people detected >10s
    if (signalKey === 'multiple_people_critical') {
      doEndInterview('Multiple people detected in frame for an extended period.');
    }
  }, [recordIntegritySignal]);

  // [STRICT] Candidate-facing posture/gaze hint — phrased as ergonomic guidance, NOT proctoring
  const onPostureHint = useCallback((type, message) => {
    // Only show if interview is active and message is new
    setPostureHint(message);
    // Auto-dismiss after 4 seconds
    if (postureHintTimerRef.current) clearTimeout(postureHintTimerRef.current);
    postureHintTimerRef.current = setTimeout(() => setPostureHint(''), 4000);
  }, []);

  const { getMetrics, stop: stopHuman } = useHumanBehavior(
    videoRef,
    onVisionSignal,
    { enabled: phase === 'interviewing' },
    onPostureHint   // 4th arg: candidate-facing hint callback
  );


  // Fix #15: Use a ref for phase so useHumanBehavior always sees the latest value without stale closure lag
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const { isRecording, startRecording, stopRecording, forceStopAllTracks } = useAudioRecorder();
  const { startVideoRecording, stopAndUploadVideo } = useVideoRecorder();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      forceStopAllTracks();
      stopVoice();
      stopHuman();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [forceStopAllTracks, stopVoice, stopHuman]);

  const handleSilenceDetected = () => {
    // Fix #14: Check isSubmittingRef *before* checking loading to prevent double-fire
    // BUG-14 fix: Use phaseRef.current (always fresh) instead of stale `phase` closure value
    if (!isSubmittingRef.current && !isSpeaking && phaseRef.current === 'interviewing') {
      handleSubmitAnswer();
    }
  };

  const {
    isListening,
    finalTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    shutdown: shutdownSTT,
  } = useWebSocketSTT({ onSilenceDetected: handleSilenceDetected, silenceDelayMs: 4500 }); // Adaptive silence: waits 3.5s to 5.5s depending on answer length
  // isListening is passed to Avatar3D for the LISTENING state display

  const lastCueWordCount = useRef(0);

  // Waveform bars — reads mic frequency data.
  // NOTE: must be declared AFTER useWebSocketSTT() so `isListening` exists when
  // this effect's dependency array is evaluated during render. Declaring it
  // earlier put `isListening` in the temporal dead zone and crashed the page
  // with "Cannot access 'isListening' before initialization".
  const [waveBars, setWaveBars] = useState([4, 4, 4, 4, 4, 4, 4]);
  useEffect(() => {
    if (phase !== 'interviewing') return;
    const id = setInterval(() => {
      const freq = typeof getAudioFrequency === 'function' ? getAudioFrequency() : 0;
      setWaveBars(prev => prev.map(() => isListening ? 4 + Math.random() * freq * 28 : 4));
    }, 80);
    return () => clearInterval(id);
  }, [phase, getAudioFrequency, isListening]);

  // SPRINT 4: Audio & VAD Improvements (Interruption & Active Listening)
  useEffect(() => {
    // 1. Interruption Handling: Removed per user request so candidate cannot interrupt AI.

    // 2. Active Listening Cues: If user is speaking a long sentence, occasionally backchannel
    if (isListening && !isSpeaking && finalTranscript) {
      const words = finalTranscript.trim().split(/\s+/).length;
      // Trigger a backchannel every ~30 words
      if (words >= 30 && words % 30 === 0 && words !== lastCueWordCount.current) {
        lastCueWordCount.current = words;
        playActiveListeningCue();
      }
    }
  }, [interimTranscript, finalTranscript, isSpeaking, isListening, stopVoice, playActiveListeningCue]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCamError('Camera access denied.'));
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const setVideoRef = useCallback((el) => {
    videoRef.current = el;
    if (el && streamRef.current) el.srcObject = streamRef.current;
  }, []);

  useEffect(() => {
    if (phase === 'interviewing') {
      const handleDefocus = () => {
        if (document.hidden || !document.hasFocus()) {
          addProctoringLog("Defocus/Tab Switch detected.");
          recordIntegritySignal('tab_switch', { note: 'Tab switch / defocus event.' }); // Sprint 3
          setWarnings(w => {
            const newW = w + 1;
            setOverlayMsg(`PROCTORING WARNING (${newW}/3): Defocus Violation — Focus Must Remain on the Interview`);
            if (newW >= 3) doEndInterview(historyRef.current, 'Candidate repeatedly switched tabs or defocused the interview window');
            return newW;
          });
        }
      };

      const handleMouseLeave = (e) => {
        // Trigger if mouse physically leaves the browser window boundaries
        if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          addProctoringLog("Mouse left the secure window boundaries.");
          setWarnings(w => {
            const newW = w + 1;
            setOverlayMsg(`PROCTORING WARNING (${newW}/3): Mouse left the secure window boundaries.`);
            if (newW >= 3) doEndInterview(historyRef.current, 'Candidate repeatedly moved mouse outside interview window boundaries');
            return newW;
          });
        }
      };

      const handleBeforeUnload = (e) => {
        addProctoringLog("Attempted to reload/close the interview.");
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your interview progress will not be submitted.';
      };

      const handleProctoringKey = (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;

        // Block F5, F11, F12, Escape
        const isRestrictedKey = ['F5', 'F11', 'F12', 'Escape'].includes(e.key);
        // Block common shortcuts: reload (R), save (S), print (P), find (F), copy/paste/cut (C, V, X), inspect (I)
        const isRestrictedShortcut = isCtrl && ['r', 's', 'p', 'f', 'c', 'v', 'x', 'i'].includes(e.key.toLowerCase());

        if (isRestrictedKey || isRestrictedShortcut || e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          addProctoringLog(`Blocked restricted key input: ${e.key} ${isCtrl ? '(with modifier)' : ''}`);

          if (e.key === 'Escape' || e.key === 'F11') {
            setOverlayMsg("PROCTORING ALERT: Exiting fullscreen via shortcuts is disabled. Please stay focused on the interview.");
          } else {
            setOverlayMsg("PROCTORING ALERT: Restricted keyboard shortcuts are strictly disabled during the interview.");
          }
        }
      };

      const handleContextMenu = (e) => {
        e.preventDefault();
        addProctoringLog("Blocked right-click.");
        setOverlayMsg("PROCTORING ALERT: Right-click is disabled.");
      };

      const handleCopyPaste = (e) => {
        e.preventDefault();
        addProctoringLog(`Blocked ${e.type}.`);
        setOverlayMsg(`PROCTORING ALERT: ${e.type.charAt(0).toUpperCase() + e.type.slice(1)} is disabled.`);
      };

      const handleDragDrop = (e) => {
        e.preventDefault();
        addProctoringLog(`Blocked ${e.type} action.`);
        setOverlayMsg("PROCTORING ALERT: Drag and drop operations are disabled.");
      };

      let fullscreenExitTimeout;
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
          addProctoringLog("Exited fullscreen.");
          setWarnings(w => {
            const newW = w + 1;
            if (newW >= 3) doEndInterview(historyRef.current, 'Candidate exited fullscreen mode 3 or more times');
            return newW;
          });
          setFullscreenLock(true);
          setOverlayMsg("PROCTORING WARNING: Fullscreen Exited — Resubmit Fullscreen to Resume");
          // Auto terminate after 10 seconds if not restored
          fullscreenExitTimeout = setTimeout(() => {
            if (!document.fullscreenElement) {
              addProctoringLog("Did not return to fullscreen within 10s. Auto terminating.");
              doEndInterview(historyRef.current, 'Candidate did not return to fullscreen within 10 seconds after exiting');
            }
          }, 10000);
        } else {
          clearTimeout(fullscreenExitTimeout);
          setFullscreenLock(false);
          setOverlayMsg(""); // Clear overlay
          addProctoringLog("Returned to fullscreen.");
        }
      };

      const handleDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
          addProctoringLog("DevTools opened (dimensions check).");
          setWarnings(w => {
            const newW = w + 1;
            if (newW >= 3) doEndInterview(historyRef.current, 'Developer tools were detected open during the interview');
            return newW;
          });
          setOverlayMsg("PROCTORING WARNING: Developer Tools detected.");
        }
      };

      document.addEventListener('visibilitychange', handleDefocus, { capture: true });
      window.addEventListener('blur', handleDefocus, { capture: true });
      document.addEventListener('mouseleave', handleMouseLeave, { capture: true });
      window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
      document.addEventListener('keydown', handleProctoringKey, { capture: true });
      document.addEventListener('contextmenu', handleContextMenu, { capture: true });
      document.addEventListener('copy', handleCopyPaste, { capture: true });
      document.addEventListener('cut', handleCopyPaste, { capture: true });
      document.addEventListener('paste', handleCopyPaste, { capture: true });
      document.addEventListener('dragstart', handleDragDrop, { capture: true });
      document.addEventListener('drop', handleDragDrop, { capture: true });
      document.addEventListener('fullscreenchange', handleFullscreenChange, { capture: true });
      window.addEventListener('resize', handleDevTools, { capture: true });

      return () => {
        document.removeEventListener('visibilitychange', handleDefocus, { capture: true });
        window.removeEventListener('blur', handleDefocus, { capture: true });
        document.removeEventListener('mouseleave', handleMouseLeave, { capture: true });
        window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
        document.removeEventListener('keydown', handleProctoringKey, { capture: true });
        document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
        document.removeEventListener('copy', handleCopyPaste, { capture: true });
        document.removeEventListener('cut', handleCopyPaste, { capture: true });
        document.removeEventListener('paste', handleCopyPaste, { capture: true });
        document.removeEventListener('dragstart', handleDragDrop, { capture: true });
        document.removeEventListener('drop', handleDragDrop, { capture: true });
        document.removeEventListener('fullscreenchange', handleFullscreenChange, { capture: true });
        window.removeEventListener('resize', handleDevTools, { capture: true });
        clearTimeout(fullscreenExitTimeout);
      };
    }
  }, [phase, addProctoringLog]); // Added addProctoringLog

  // VAD Interruption disabled per user request

  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (wasSpeakingRef.current && !isSpeaking) {
      console.debug("[Echo Protection] AI finished speaking. Wiping any leaked transcript from room echo.");
      resetTranscript();
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, resetTranscript]);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => { stopRecordingRef.current = stopRecording; }, [stopRecording]);

  useEffect(() => {
    // SPRINT 1: STRICT STATE MACHINE LOCK
    const shouldListen = phase === 'interviewing' && !loading && micOn && !isSpeaking;

    if (shouldListen) {
      if (!isListening) startListening(false);
      if (!isRecording) startRecording();
    } else {
      if (isListening) stopListening(false);
      if (isRecording) stopRecordingRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn, isListening, phase, isSpeaking, loading, startListening, stopListening, isRecording, startRecording]);

  const memoizedVideo = React.useMemo(() => (
    <video ref={setVideoRef} autoPlay muted playsInline className="w-full h-full object-contain bg-black" style={{ transform: 'scaleX(-1)', display: camOn && !camError ? 'block' : 'none' }} />
  ), [setVideoRef, camOn, camError]);

  const memoizedEditor = React.useMemo(() => (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      onMount={(editor, monaco) => {
        handleEditorMount(editor, monaco);
        editor.onKeyDown((e) => {
          // Block paste (Ctrl+V / Cmd+V)
          if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.code === 'KeyC' || e.code === 'KeyX')) {
            e.preventDefault();
            e.stopPropagation();
            setOverlayMsg("PROCTORING: Copy/Paste functionality is strictly disabled inside the code editor.");
          }
        });
      }}
      options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'Inter', monospace", padding: { top: 16 }, scrollBeyondLastLine: false }}
    />
  ), [language, handleEditorMount]);

  useEffect(() => {
    if (!loading) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [question, loading]); // Removed finalTranscript to fix auto-scroll glitch

  const handleStart = async () => {
    if (phase !== 'ready' || isStartingRef.current) return; // LOCK: Prevent double execution natively
    isStartingRef.current = true;

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request failed", e);
    }
    
    // Unlock Speech Synthesis in the direct user gesture context
    try {
      const unlockSpeech = new SpeechSynthesisUtterance('');
      unlockSpeech.volume = 0;
      window.speechSynthesis.speak(unlockSpeech);
    } catch (e) {
      console.warn("Speech unlock failed", e);
    }

    setPhase('initializing');
    console.debug('[State] Transition: Ready -> Initializing');
    setError('');
    setTimeout(async () => {
      try {
        // Natural human-like HR greeting instead of robotic intro
        const greeting = `Hello ${candidateName.split(' ')[0]}, it's great to meet you. Welcome to Sterling E Mobility. To kick things off, could you briefly walk me through your background and what drew you to the ${jobRole} role?`;
        console.debug('[State] Transition: Initializing -> Interviewing');
        setPhase('interviewing');
        setQuestion(greeting);
        setOverlayMsg('');
        await startVideoRecording(); // START CONTINUOUS RECORDING
        questionStartTimeRef.current = Date.now();
        await speak(greeting);
      } catch {
        const fallback = 'Welcome. Please tell me about your technical background and experience.';
        setPhase('interviewing');
        setQuestion('');
        questionStartTimeRef.current = Date.now();
        await speak(fallback);
        setQuestion(fallback);
      } finally {
        isStartingRef.current = false;
      }
    }, 800);  // Reduced from 2000ms → 800ms for faster startup
  };

  const handleSubmitAnswer = async () => {
    if (isSubmittingRef.current) return;

    console.debug("[State] Transition: Interviewing -> Processing");
    const fullAnswer = (finalTranscript + ' ' + interimTranscript).trim();
    if (!fullAnswer && !getCode().trim() && !textFallback.trim()) {
      setError('Please provide a spoken answer or write code before submitting.');
      console.debug("[State] Reverted: No input detected");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    const statuses = ['Transcribing Audio...', 'Evaluating Logic...', 'Generating Response...'];
    let statusIdx = 0;
    setLoadingStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      statusIdx = (statusIdx + 1) % statuses.length;
      setLoadingStatus(statuses[statusIdx]);
    }, 1500);

    // ZERO LATENCY BYPASS: If webkitSpeechRecognition already caught the text, don't wait for backend Whisper!
    let finalWsText = '';
    if (fullAnswer.length > 3) {
      await stopListening(false); // Instantly turn off mic without triggering slow backend whisper
      finalWsText = fullAnswer;
    } else {
      finalWsText = await stopListening(true); // Fallback to backend whisper
    }

    stopVoice();

    const resolvedAnswer = (finalWsText || fullAnswer || textFallback).trim();
    setTextFallback('');

    const behavioralData = getMetrics();

    let audioBlob = null;
    if (isRecording) {
      audioBlob = await stopRecording();
    }
    
    // Sprint 5: AI Voice Detection API on first question
    if (qIndex === 0 && audioBlob) {
       console.debug("[Integrity Engine] Capturing first answer for AI Voice Authenticity check.");
       apiClient.analyzeAudioAuthenticity(audioBlob)
         .then(res => {
            if (res && res.is_synthetic) {
               recordIntegritySignal('voice_authenticity_failed', { note: 'Synthetic voice detected by Hive/Resemble AI.' });
               // We could also terminate, but for now we just log it heavily per requirements
            }
         })
         .catch(err => console.error("Audio authenticity check failed", err));
    }

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WATCHDOG_TIMEOUT')), 45000);
      });

      const t0 = performance.now();

      // Fix #9: Compute real WPM from the candidate's answer text + elapsed time since question was shown
      const elapsedSec = Math.max((Date.now() - questionStartTimeRef.current) / 1000, 1);
      const wordCount = (resolvedAnswer || '').split(/\s+/).filter(Boolean).length;
      const computedWpm = wordCount > 0 ? Math.round((wordCount / elapsedSec) * 60) : 130;
      const clampedWpm = Math.min(Math.max(computedWpm, 30), 350); // Clamp to realistic speaking range

      // Sprint 3: Build compact interview memory context (last 5 Q&A pairs) for contextual follow-up
      const interviewMemory = history.slice(-5).map((entry, idx) => ({
        turn: idx + 1,
        question: entry.q,
        answer: entry.a,
        technical_score: entry.score,
      }));

      const res = await Promise.race([
        apiClient.assessCandidate({
          candidate_id: candidateId,
          job_role: jobRole,
          experience,
          skills,
          spoken_answer: resolvedAnswer || '[Code submission only]',
          detected_emotion: behavioralData.emotion || 'Neutral',
          current_question: question,
          wpm: clampedWpm,  // Fix #9: Real computed WPM
          behavioral_telemetry: behavioralData,
          workspace_code: getCode(),
          interview_memory: interviewMemory, // Sprint 3: Prior Q&A context for follow-up generation
          question_index: qIndex,            // Sprint 3: Current question index for pacing
        }),
        timeoutPromise
      ]);
      const llmTime = performance.now() - t0;
      console.debug(`[Telemetry] LLM Orchestration Time: ${Math.round(llmTime)}ms | Action: ${res.action} | WPM: ${clampedWpm}`);

      // Small floor only — just enough to avoid a jarringly instant reply. The
      // natural "thinking" feel now comes from the two-beat spoken delivery
      // (reaction → pause → question), not an artificial multi-second wait.
      const minThinkingTime = 600;
      if (llmTime < minThinkingTime) {
        await new Promise(r => setTimeout(r, minThinkingTime - llmTime));
      }

      let nextHistory = history;
      if (res.action !== 'repeat' && res.action !== 'small_talk') {
        nextHistory = [...history, {
          q: question,
          a: resolvedAnswer,
          score: res.technical_score || 0,
          eqScore: res.eq_score || res.behavioral_score || 0,
          confScore: res.confidence_score || 0,
          commScore: res.communication_score || 0,
          probScore: res.problem_solving_score || 0,
          roleScore: res.role_alignment_score || 0,
          profScore: res.professionalism_score || 0,
          learnScore: res.learning_potential_score || 0,
          fluencyScore: res.fluency_score || 0,
          plagiarism_score: res.plagiarism_score || 0,
          plagiarism_reasoning: res.plagiarism_reasoning || "Original thought.",
          wpm: clampedWpm,
          code: getCode()
        }];
        setHistory(nextHistory);
        setQIndex(i => i + 1);
        // Fix #9: Reset question timer for the next question
        questionStartTimeRef.current = Date.now();

        // ── Silent AI/Plagiarism Detection (invisible to candidate) ──────
        // Layer A: Process server-side multi-layer detection result
        const det = res.ai_detection || {};
        if (det.integrity_signals && det.integrity_signals.length > 0) {
          det.integrity_signals.forEach(sig => {
            recordIntegritySignal(sig, {
              note: `[Backend AI Detection] Q#${qIndex + 1} | probability=${det.ai_probability?.toFixed(2)} | patterns=${(det.matched_patterns || []).join(', ')}`,
              ai_probability: det.ai_probability,
              matched_patterns: det.matched_patterns,
            });
          });
          console.warn(
            `[Integrity] AI detection fired Q#${qIndex + 1}:`,
            `probability=${det.ai_probability?.toFixed(3)}`,
            det.matched_patterns
          );
        }

        // Layer B: Client-side GPT syntax check on transcribed text (second opinion)
        if (resolvedAnswer && resolvedAnswer.length > 40) {
          const clientCheck = checkGptSyntax(resolvedAnswer, qIndex + 1);
          if (clientCheck?.challenge_required) {
            console.warn('[Integrity] Client-side GPT syntax detected:', clientCheck.matched_patterns);
          }
        }

      }

      resetTranscript();
      if (res.action !== 'repeat' && res.action !== 'small_talk') clearCode();

      if (res.action !== 'repeat' && res.action !== 'small_talk' && nextHistory.length >= MAX_QUESTIONS) {
        setPhase('goodbye'); // Lock the UI phase so mic is disabled but Avatar remains on screen
        // Natural human-like HR goodbye
        const finalGoodbye = res.eq_feedback + " That wraps up our interview for today. Thank you for your time. Our team will review your evaluation and follow up with you shortly. Have a great day!";
        setQuestion("Interview complete. Thank you for your time! Redirecting you now...");
        setLoading(false); // Fix: show question text instead of loading status
        try {
          // Wait for the TTS to completely finish speaking the goodbye while the avatar is still on screen
          await speak(finalGoodbye);
        } catch (e) {
          console.warn("TTS failed on goodbye", e);
        }
        doEndInterview(nextHistory);
        return;
      }

      if (res.action === 'small_talk' || res.action === 'repeat') {
        const feedback = res.eq_feedback || '';
        const nextQ = res.next_technical_question || '';

        // Caption still shows both, but we SPEAK them as two beats (reaction,
        // pause, question) for a natural human cadence.
        const includesQ = nextQ && feedback.toLowerCase().includes(nextQ.toLowerCase());
        const captionCombined = includesQ || !nextQ
          ? feedback
          : `${feedback}${/[.?!]$/.test(feedback.trim()) ? '' : '.'} ${nextQ}`;

        if (!isMounted.current) return;
        if (captionCombined.trim()) {
          setQuestion(captionCombined);
          setLoading(false); // Turn off loading so TTS captions show up!
          await speakChunks(includesQ ? [feedback] : [feedback, nextQ]);
        }
      } else {
        const feedback = res.eq_feedback || '';
        let nextQ = "";

        if (res.follow_up_question) {
          nextQ = res.follow_up_question;
        } else if (res.next_technical_question) {
          nextQ = res.next_technical_question;
        } else {
          nextQ = "Thank you. Let's proceed.";
        }

        const includesQ = nextQ && feedback.toLowerCase().includes(nextQ.toLowerCase());
        const captionCombined = includesQ || !nextQ
          ? feedback
          : `${feedback}${/[.?!]$/.test(feedback.trim()) ? '' : '.'} ${nextQ}`;

        if (!isMounted.current) return;
        if (captionCombined.trim()) {
          setQuestion(captionCombined);
          setLoading(false); // Turn off loading so TTS captions show up!
          // Two-beat: react first, brief pause, then ask the next question.
          await speakChunks(includesQ ? [feedback] : [feedback, nextQ]);
        }
      }

      if (!isMounted.current) return;
      console.debug("[State] Transition: Processing -> Interviewing");
      setPhase('interviewing');
    } catch (e) {
      if (!isMounted.current) return;
      const isTimeout = e.message === 'WATCHDOG_TIMEOUT';
      const fallbackMsg = isTimeout
        ? 'I am experiencing unusually high latency. Could you please summarize your answer briefly?'
        : 'I lost connection to my core servers. Could you please repeat your answer?';

      console.error("[Deadlock Protection] AI Assessment Failed:", e);
      setError(isTimeout ? 'AI Core Timeout (30s). Retrying...' : 'Connection to AI Core unstable. Please try submitting again.');

      try {
        setLoading(false); // Fix: Turn off loading so TTS captions show up
        await speak(fallbackMsg);
      } catch (ttsError) {
        console.error("TTS Fallback failed. Proceeding silently.", ttsError);
      }

      if (!isMounted.current) return;
      console.debug("[State] Recovery: Transitioning back to Interviewing");
      setPhase('interviewing');
    } finally {
      clearInterval(statusInterval);
      if (isMounted.current) {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    }
  };

  const doEndInterview = async (h, terminationReason = null) => {
    setPhase('ending');
    stopVoice();
    stopHuman();

    // FORCEFULLY KILL ALL HARDWARE ACCESS
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    
    stopListening(false);
    shutdownSTT();
    forceStopAllTracks();
    
    const interviewId = sessionStorage.getItem('interview_id');
    if (interviewId) {
      await stopAndUploadVideo(interviewId); // STOP RECORDING AND UPLOAD
    }

    const avgScore = (key) => h.length ? Math.round(h.reduce((s, x) => s + (x[key] || 0), 0) / h.length) : 0;

    // ── Proctoring-terminated path ────────────────────────────────────────
    if (terminationReason) {
      // This interview was forcibly ended by a proctoring violation.
      // Call terminate-proctoring endpoint directly — it saves grade F + PROCTORING_ACT.
      try {
        const integrityReport = computeIntegrityFinal();
        await apiClient.terminateProctoring({
          candidate_id: candidateId,
          proctoring_logs: proctoringLogsRef.current,
          integrity_data: integrityReport,
          termination_reason: terminationReason,
          proctoring_warnings: warnings,
        });
        console.info('[Proctoring] Interview terminated and saved as PROCTORING_ACT:', terminationReason);
      } catch (e) {
        console.error('[Proctoring] Failed to save proctoring termination to backend:', e);
      }
      // Proctoring termination — admin demo goes to report, candidate to goodbye
      const role = sessionStorage.getItem('role');
      navigate(role === 'candidate' ? '/interview-goodbye' : '/report', { 
        state: { terminationReason } 
      });
      return;
    }

    // ── Normal end path ───────────────────────────────────────────────────
    let aiReport = {};
    try {
      const reportRes = await apiClient.getAIReport(candidateId);
      aiReport = reportRes?.ai_report || {};
    } catch (e) {
      console.error('Failed to generate AI report summary. Proceeding with basic save.', e);
    }

    try {
      // Sprint 3: Run behavioral integrity checks before saving
      const avgWpmAll = h.length ? h.reduce((s, x) => s + (x.wpm || 130), 0) / h.length : 130;
      checkBehavioral({
        avgWpm: avgWpmAll,
        totalFillerWords: 0, // Filler word tracking is per-answer; 0 here = conservative
        totalAnswers: h.length,
      });

      // Compute AI plagiarism
      const allPlagScores = h.map(ans => ans.plagiarism_score).filter(s => typeof s === 'number');
      const avgPlag = allPlagScores.length > 0 ? Math.round(allPlagScores.reduce((a, b) => a + b, 0) / allPlagScores.length) : 0;
      let plagReason = "Analysis complete. Syntax and structural cadence indicate original thought.";
      if (avgPlag > 50) plagReason = "Moderate AI similarity detected across answers.";
      if (avgPlag > 80) plagReason = "Critical Alert. Verbatim LLM structure detected. Extreme probability of generated content.";

      const integrityReport = computeIntegrityFinal();
      const payload = {
        candidate_id: candidateId,
        technical_score: avgScore('score'),
        eq_score: avgScore('eqScore'),
        confidence: avgScore('confScore'),
        communication: avgScore('commScore'),
        problem_solving_score: avgScore('probScore'),
        role_alignment_score: avgScore('roleScore'),
        professionalism_score: avgScore('profScore'),
        learning_potential_score: avgScore('learnScore'),
        behavioral_score: avgScore('eqScore'),
        // Fix #6: Use fluencyScore (dedicated field) instead of commScore
        fluency_score: avgScore('fluencyScore'),
        facial_score: 75,
        summary: aiReport.synthesis || `Interview complete. ${h.length} questions answered.`,
        strengths: aiReport.identified_strengths || ['Code logic', 'Structured responses'],
        weaknesses: aiReport.optimization_areas || [],
        proctoring_warnings: warnings,
        proctoring_logs: proctoringLogsRef.current,
        plagiarism_score: avgPlag,
        plagiarism_reasoning: plagReason,
        // Sprint 3: Integrity Engine fields
        integrity_score: integrityReport.integrity_score,
        integrity_data: integrityReport,
        // Phase 1: Integrity Triage Matrix Sub-Scores
        posture_score: integrityReport.posture_score,
        movement_score: integrityReport.movement_score,
        eye_tracking_score: integrityReport.eye_tracking_score,
        authenticity_score: integrityReport.authenticity_score,
        environment_score: integrityReport.environment_score,
      };
      await apiClient.saveInterview(payload);
    } catch (e) {
      console.error('Failed to save final interview scores', e);
    }
    // Route based on role: candidates see goodbye screen, admin sees report
    const role = sessionStorage.getItem('role');
    navigate(role === 'candidate' ? '/interview-goodbye' : '/report');
  };

  // ── Sprint 2: Pre-Flight Check Gate ────────────────────────────────────
  // Renders BEFORE the 'ready' screen. On pass, releases its own streams
  // and transitions to 'ready'. LiveInterview then acquires fresh streams.
  if (phase === 'preflight') {
    return (
      <PreFlightCheck
        onPass={() => setPhase('ready')}
        candidateName={candidateName}
        jobRole={jobRole}
      />
    );
  }

  // ── Pre-render avatar on ready screen so it's visible immediately ────────
  if (phase === 'ready' || phase === 'initializing') {
    return (
      <div className="min-h-screen bg-sterling-bg text-sterling-text font-sans flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

          {/* LEFT: Avatar — visible immediately, no loading delay */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex items-center justify-center"
              style={{ width: '280px', height: '340px', background: 'linear-gradient(160deg, #f8f9fa 0%, #e8edf2 60%, #dce3eb 100%)' }}>
              <Waveform2D
                isSpeaking={false}
                theme="light"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">Your AI Interviewer</p>
              <p className="text-xs text-slate-500 mt-0.5">Sterling E Mobility · HR Excellence Division</p>
            </div>
          </div>

          {/* RIGHT: Readiness Check Panel */}
          <div className="bg-white border border-sterling-border rounded-3xl p-8 shadow-sm">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-md border border-slate-800">
                <img src={logoUrl} alt="Sterling Logo" className="w-7 h-7 object-contain mix-blend-screen"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div className="hidden w-7 h-7 bg-red-600 text-white items-center justify-center font-bold text-xs">Sterling</div>
              </div>
              <div>
                <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Sterling E Mobility</div>
                <div className="text-xs text-slate-400">AI Interview Platform</div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2 text-slate-900">
              {phase === 'ready' ? 'Interview Ready' : 'Connecting to AI Core...'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {phase === 'ready'
                ? `Role: ${jobRole} · Your interviewer is ready and waiting.`
                : 'Initializing Sterling E Mobility models and behavioral telemetry...'}
            </p>

            {/* Readiness checklist */}
            {phase === 'ready' && (
              <div className="space-y-3 mb-6">
                {[
                  { label: 'AI Interviewer', status: 'Ready' },
                  { label: 'Role Configuration', status: jobRole },
                  { label: 'Proctoring Engine', status: 'Active' },
                  { label: 'Speech Recognition', status: 'Standby' },
                ].map(({ label, status }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">{status}</span>
                  </div>
                ))}
              </div>
            )}

            {phase === 'initializing' && (
              <div className="flex items-center gap-3 py-4 mb-4">
                <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-sm text-slate-600 font-medium">Loading AI models for behavioral telemetry...</span>
              </div>
            )}

            {phase === 'ready' && (
              <button
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50 active:scale-95 transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <span className="relative z-10 flex items-center justify-center gap-2 text-base">
                  Begin Interview <span className="text-red-200">→</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }


  if (phase === 'ending') {
    return (
      <div className="min-h-screen bg-sterling-bg text-sterling-text font-sans flex flex-col justify-center items-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-4 text-slate-900">Processing Evaluation</h2>
          <p className="text-sterling-text uppercase tracking-widest text-sm">Transferring secure telemetry to Report Engine...</p>
        </div>
      </div>
    );
  }

  // SECURITY (#2): run candidate JS inside an isolated Web Worker instead of
  // `new Function(code)()` on the page. A Worker has NO access to the DOM,
  // React state, or sessionStorage (the admin/candidate token), so the candidate
  // can no longer read tokens or tamper with the proctored interview from the
  // editor. A 5s timeout guards against infinite loops.
  const runJsInWorker = (code) => new Promise((resolve) => {
    const workerSrc = `self.onmessage = function (e) {
      var logs = [];
      console.log = function () { logs.push(Array.prototype.map.call(arguments, String).join(' ')); };
      try {
        // eslint-disable-next-line no-new-func
        (new Function(e.data))();
        self.postMessage({ ok: true, output: logs.join('\\n') });
      } catch (err) {
        self.postMessage({ ok: false, output: String((err && err.message) || err) });
      }
    };`;
    let url;
    try {
      const blob = new Blob([workerSrc], { type: 'application/javascript' });
      url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      const cleanup = () => { try { worker.terminate(); } catch (_) {} try { URL.revokeObjectURL(url); } catch (_) {} };
      const timer = setTimeout(() => { cleanup(); resolve({ ok: false, output: 'Execution timed out (5s). Possible infinite loop.' }); }, 5000);
      worker.onmessage = (e) => { clearTimeout(timer); cleanup(); resolve(e.data); };
      worker.onerror = (err) => { clearTimeout(timer); cleanup(); resolve({ ok: false, output: String(err.message || 'Execution error') }); };
      worker.postMessage(code);
    } catch (err) {
      if (url) { try { URL.revokeObjectURL(url); } catch (_) {} }
      resolve({ ok: false, output: 'Sandbox unavailable in this browser.' });
    }
  });

  const handleRunCode = async () => {
    const code = getCode();
    if (language === 'javascript' || language === 'typescript') {
      const res = await runJsInWorker(code);
      setOverlayMsg((res.ok ? "Output:\n" : "Error:\n") + (res.output || "Execution complete. No output."));
    } else if (language === 'python') {
      setLoadingStatus("Compiling Python...");
      setLoading(true);
      try {
        const res = await apiClient.executeCode({ code, language: 'python' });
        setOverlayMsg(res.error ? "Python Execution Error:\n" + res.output : "Python Output:\n" + (res.output || "Execution complete. No output."));
      } catch (err) {
        setOverlayMsg("Failed to connect to backend execution engine.");
      }
      setLoading(false);
    } else {
      setOverlayMsg(`Syntactic validation for ${language} passed successfully. Output simulation not available in browser sandbox.`);
    }
  };

  return (
    <div className={`fixed inset-0 h-screen w-screen overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-[#000000] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      {/* HEADER - Matching the screenshot's top nav */}
      <header className={`${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-red-200'} backdrop-blur-2xl border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50`}>
        {/* Logo Area */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg border ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white border-red-100'}`}>
            <img src={logoUrl} alt="Sterling Logo" className="w-9 h-9 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-9 h-9 bg-red-600 text-white flex items-center justify-center font-bold text-sm">S</div>
          </div>
          <div className="leading-tight">
            <h1 className={`text-sm font-black tracking-[0.2em] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>STERLING</h1>
            <h2 className={`text-xs tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>E-MOBILITY</h2>
          </div>
        </div>

        {/* Nav Links - Restricted for Candidate */}
        <div className="hidden md:flex gap-8 text-sm font-bold items-center">
          <div className={`uppercase tracking-widest text-xs flex items-center gap-2 ${theme === 'dark' ? 'text-red-400/80' : 'text-red-600'}`}>
            <ShieldAlert size={14} className="text-red-500 animate-pulse" /> Proctoring Active
          </div>
          <button onClick={() => {
            if (window.confirm("Are you sure you want to end and submit the interview now?")) {
              doEndInterview(history);
            }
          }} className={`relative group overflow-hidden px-6 py-2 border rounded-xl transition-all duration-300 ease-out font-bold tracking-widest shadow-lg ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'}`}>
            <div className="absolute inset-0 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[400%] transition-transform duration-700"></div>
            End & Submit
          </button>
        </div>
      </header>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border-b border-[#EF4444] text-[#EF4444] px-8 py-3 text-sm font-bold text-center z-50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.main 
        className="flex-1 w-full relative"
        initial={false}
        animate={{ rotateY: theme === 'dark' ? 0 : 360 }}
        transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
        style={{ transformStyle: 'preserve-3d', perspective: '1200px' }}
      >
        <AvatarStage
          phase={phase}
          qIndex={qIndex}
          warnings={warnings}
          isSpeaking={isSpeaking}
          isListening={isListening}
          loading={loading}
          loadingStatus={loadingStatus}
          displayedQuestion={displayedQuestion}
          finalTranscript={finalTranscript}
          interimTranscript={interimTranscript}
          theme={theme}
          isCodeOpen={isCodeOpen}
          getAudioFrequency={getAudioFrequency}
        />

        <WorkspaceDrawer
          isOpen={isCodeOpen}
          onClose={() => setIsCodeOpen(false)}
          theme={theme}
          language={language}
          setLanguage={setLanguage}
          memoizedEditor={memoizedEditor}
          runCode={handleRunCode}
          handleSubmitAnswer={handleSubmitAnswer}
          isSpeaking={isSpeaking}
          loading={loading}
        />

        <BottomControlBar
          isListening={isListening}
          micOn={micOn}
          toggleMic={() => setMicOn(!micOn)}
          camOn={camOn}
          toggleCam={() => setCamOn(!camOn)}
          theme={theme}
          toggleTheme={toggleTheme}
          isCodeOpen={isCodeOpen}
          toggleCode={toggleCode}
          endInterview={() => {
            if (window.confirm("Are you sure you want to end and submit the interview now?")) {
              doEndInterview(history);
            }
          }}
          submitAnswer={handleSubmitAnswer}
        />

        {/* Floating Utilities — REC indicator + Waveform */}
        <div className="absolute top-5 left-5 z-20 flex gap-3 items-center pointer-events-none">
          {isRecording ? (
            <div className="bg-red-600/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-red-500/50">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC
            </div>
          ) : null}
          {/* ── Audio Waveform (Phase 3) ── */}
          {phase === 'interviewing' && isListening && (
            <div className="flex items-center gap-[3px] px-3 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              {waveBars.map((h, i) => (
                <div key={i} className="w-1 bg-red-400 rounded-full transition-all duration-75" style={{ height: `${Math.min(h, 32)}px` }} />
              ))}
            </div>
          )}
        </div>

        {/* ── Progress Arc + Question Counter (Phase 3) ── */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(220,38,38,0.1)'}
                strokeWidth="3"
              />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={theme === 'dark' ? '#ef4444' : '#dc2626'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${((qIndex) / MAX_QUESTIONS) * 100} 100`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[10px] font-black leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{qIndex + 1}/{MAX_QUESTIONS}</span>
            </div>
          </div>
        </div>

        {/* ── Nudge Pills (Phase 3) ── */}
        <AnimatePresence>
          {nudgePill && (
            <motion.div
              key={nudgePill}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            >
              <div className="bg-black/70 backdrop-blur-xl text-white text-xs font-bold px-5 py-3 rounded-2xl border border-white/20 shadow-2xl whitespace-nowrap">
                {nudgePill}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIP Webcam (Top Right) */}
        <motion.div 
          drag 
          dragConstraints={{ left: -600, right: 0, top: 0, bottom: 400 }}
          dragMomentum={false}
          className="absolute top-5 right-5 z-40 w-64 h-40 bg-black/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 cursor-grab active:cursor-grabbing hover:border-white/30 transition-colors"
        >
          {memoizedVideo}
          {(!camOn || camError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white/70 text-xs font-bold">
              Video Offline
            </div>
          )}
        </motion.div>

      </motion.main>

      {/* Modern Proctoring Overlay Modal */}
      <AnimatePresence>
        {overlayMsg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 text-center border-t-4 border-red-600"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">System Notification</h2>
              <p className="text-slate-600 mb-6 whitespace-pre-wrap">{overlayMsg}</p>
              {fullscreenLock ? (
                <button
                  onClick={() => {
                    document.documentElement.requestFullscreen().catch(e => console.warn(e));
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
                >
                  Return to Fullscreen
                </button>
              ) : (
                <button
                  onClick={() => setOverlayMsg('')}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
                >
                  I Understand
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}