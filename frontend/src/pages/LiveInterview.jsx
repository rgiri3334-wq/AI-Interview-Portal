import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { Editor } from '@monaco-editor/react';

import { apiClient } from '../api/apiClient';
import logoUrl from '../assets/sterling_logo.png';
import Avatar3D from '../components/Avatar3D';
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
      timestamp: new Date().toLocaleTimeString(),
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
  const { speak, stop: stopVoice, isSpeaking, getAudioFrequency, playActiveListeningCue } = useAudioStream();
  const isStartingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isMounted = useRef(true);



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

  const handleSilenceDetected = useCallback(() => {
    // Fix #14: Check isSubmittingRef *before* checking loading to prevent double-fire
    // BUG-14 fix: Use phaseRef.current (always fresh) instead of stale `phase` closure value
    if (!isSubmittingRef.current && !isSpeaking && phaseRef.current === 'interviewing') {
      handleSubmitAnswer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  const {
    isListening,
    finalTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    shutdown: shutdownSTT,
  } = useWebSocketSTT({ onSilenceDetected: handleSilenceDetected, silenceDelayMs: 4000 }); // Fix: Increased to 4000ms so candidate doesn't get cut off while pausing
  // isListening is passed to Avatar3D for the LISTENING state display

  const lastCueWordCount = useRef(0);

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

      // SPRINT 4: Artificial "Thinking" Delay
      // Enforce a minimum delay so the HR appears to actually think about the answer.
      // This prevents robotic, instant responses.
      const minThinkingTime = 2500 + Math.random() * 1500;
      if (llmTime < minThinkingTime) {
        setLoadingStatus("HR is reviewing your response...");
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
          // Fix #6: Store fluency_score separately so doEndInterview uses the right metric
          fluencyScore: res.fluency_score || 0,
          wpm: clampedWpm,  // Fix #9 / #16: persist wpm per answer
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
        setPhase('ending');
        // Natural human-like HR goodbye
        const finalGoodbye = res.eq_feedback + " That wraps up our interview for today. Thank you for your time. Our team will review your evaluation and follow up with you shortly. Have a great day!";
        setQuestion("Interview Complete. You may close this window.");
        setLoading(false); // Fix: show question text instead of loading status
        try {
          await speak(finalGoodbye);
          // Wait to ensure candidate hears the TTS before unmounting component
          await new Promise(r => setTimeout(r, 8000));
        } catch (e) {
          console.warn("TTS failed on goodbye", e);
        }
        doEndInterview(nextHistory);
        return;
      }

      if (res.action === 'small_talk' || res.action === 'repeat') {
        const feedback = res.eq_feedback || '';
        const nextQ = res.next_technical_question || '';

        let combined = feedback;
        if (nextQ && !feedback.toLowerCase().includes(nextQ.toLowerCase())) {
          combined += (combined.endsWith('.') || combined.endsWith('?') || combined.endsWith('!')) ? ` ${nextQ}` : `. ${nextQ}`;
        }

        if (!isMounted.current) return;
        if (combined.trim()) {
          setQuestion(combined);
          setLoading(false); // Fix: Turn off loading so TTS captions show up!
          await speak(combined);
        }
      } else {
        const feedback = res.eq_feedback;
        let nextQ = "";

        if (res.follow_up_question) {
          nextQ = res.follow_up_question;
        } else if (res.next_technical_question) {
          nextQ = res.next_technical_question;
        } else {
          nextQ = "Thank you. Let's proceed.";
        }

        let combined = feedback || '';
        if (nextQ && !combined.toLowerCase().includes(nextQ.toLowerCase())) {
          combined += (combined.endsWith('.') || combined.endsWith('?') || combined.endsWith('!')) ? ` ${nextQ}` : `. ${nextQ}`;
        }

        if (!isMounted.current) return;
        if (combined.trim()) {
          setQuestion(combined);
          setLoading(false); // Fix: Turn off loading so TTS captions show up!
          await speak(combined);
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
      navigate('/report');
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
    navigate('/report');
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
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200"
              style={{ width: '280px', height: '340px', background: 'linear-gradient(160deg, #f8f9fa 0%, #e8edf2 60%, #dce3eb 100%)' }}>
              <Avatar3D
                isSpeaking={false}
                isListening={false}
                isLoading={phase === 'initializing'}
                phase={phase}
                qIndex={0}
                warnings={0}
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

  const handleRunCode = async () => {
    const code = getCode();
    if (language === 'javascript' || language === 'typescript') {
      try {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));
        // eslint-disable-next-line no-new-func
        new Function(code)();
        console.log = originalLog;
        setOverlayMsg("Output:\n" + (logs.join('\n') || "Execution complete. No output."));
      } catch (e) {
        setOverlayMsg("Syntax Error:\n" + e.message);
      }
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
      {/* Cinematic ambient background glow */}
      {theme === 'dark' && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>
        </>
      )}

      {/* HEADER - Matching the screenshot's top nav */}
      <header className={`${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-red-200'} backdrop-blur-2xl border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50`}>
        {/* Logo Area */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black/60 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10">
            <img src={logoUrl} alt="Sterling Logo" className="w-9 h-9 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-9 h-9 bg-red-600 text-white flex items-center justify-center font-bold text-sm">S</div>
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-black tracking-[0.2em] text-white">STERLING</h1>
            <h2 className="text-xs tracking-widest text-slate-400">E-MOBILITY</h2>
          </div>
        </div>

        {/* Nav Links - Restricted for Candidate */}
        <div className="hidden md:flex gap-8 text-sm font-bold items-center">
          <div className="text-red-400/80 uppercase tracking-widest text-xs flex items-center gap-2">
            <ShieldAlert size={14} className="text-red-500 animate-pulse" /> Proctoring Active
          </div>
          <button onClick={() => {
            if (window.confirm("Are you sure you want to end and submit the interview now?")) {
              doEndInterview(history);
            }
          }} className="relative group overflow-hidden px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all duration-300 ease-out font-bold tracking-widest shadow-lg">
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
      <main className="flex-1 w-full relative">
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
          theme={theme}
          toggleTheme={toggleTheme}
          isCodeOpen={isCodeOpen}
          toggleCode={toggleCode}
          endInterview={() => {
            if (window.confirm("Are you sure you want to end and submit the interview now?")) {
              doEndInterview(history);
            }
          }}
        />

        {/* Floating Utilities */}
        <div className="absolute top-5 left-5 z-20 flex gap-3 items-center pointer-events-none">
          {isRecording ? (
            <div className="bg-red-600/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-red-500/50">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              REC
            </div>
          ) : null}
        </div>

        {/* Question Counter */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="bg-black/50 backdrop-blur-md text-white/80 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
            Question {qIndex + 1} of {MAX_QUESTIONS}
          </span>
        </div>

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
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <button onClick={(e) => { e.stopPropagation(); setMicOn(!micOn); }} className={`p-2 rounded-lg transition-colors ${micOn ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`} title={micOn ? "Mute Microphone" : "Unmute Microphone"}>
              {micOn ? '🎙️' : '🔇'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setCamOn(!camOn); }} className={`p-2 rounded-lg transition-colors ${camOn ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-red-500/80 hover:bg-red-500 text-white'}`} title={camOn ? "Stop Video" : "Start Video"}>
              {camOn ? '📹' : '📵'}
            </button>
          </div>
        </motion.div>

      </main>

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