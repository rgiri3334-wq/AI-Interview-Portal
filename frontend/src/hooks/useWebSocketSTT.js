import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for continuous audio streaming via WebSocket.
 * Replaces the brittle Web Speech API with an enterprise backend bridge.
 */
export function useWebSocketSTT({ onSilenceDetected, silenceDelayMs = 2000 } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const pendingResolveRef    = useRef(null);
  const wsRef                = useRef(null);
  const mediaRecorderRef     = useRef(null);
  const globalStreamRef      = useRef(null);
  const recognitionRef       = useRef(null);
  const silenceTimerRef      = useRef(null);
  const onSilenceDetectedRef = useRef(onSilenceDetected);
  const isListeningRef       = useRef(false);
  // DUPLICATE SPEECH FIX: Gate that prevents both local STT + WS backend
  // silence timers from both firing onSilenceDetected for the same answer.
  const silenceFiredRef      = useRef(false);

  useEffect(() => {
    onSilenceDetectedRef.current = onSilenceDetected;
  }, [onSilenceDetected]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL 
      ? `${import.meta.env.VITE_WS_URL}/ws/stt` 
      : `${protocol}//${window.location.hostname}:8000/ws/stt`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log("[WebSocket STT] Connected.");
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'interim') {
        // Backend interim overrides local if it has one (mostly just 'Listening...')
        // We rely on local recognitionRef for actual interim text
      } else if (data.type === 'final') {
        const newText = data.text;
        setFinalTranscript((prev) => (prev + ' ' + newText).trim());
        setInterimTranscript('');
        
        if (pendingResolveRef.current) {
          pendingResolveRef.current(newText);
          pendingResolveRef.current = null;
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        const currentLength = (finalTranscript + ' ' + newText).length;
        let adaptiveDelay = silenceDelayMs;
        if (currentLength < 30) adaptiveDelay += 1000;
        else if (currentLength > 200) adaptiveDelay -= 1000;
        
        // Reset the duplicate lock because new final text has arrived
        silenceFiredRef.current = false;

        silenceTimerRef.current = setTimeout(() => {
          // DUPLICATE FIX: Only fire once across all competing timers
          if (!silenceFiredRef.current && onSilenceDetectedRef.current) {
            silenceFiredRef.current = true;
            onSilenceDetectedRef.current();
          }
        }, adaptiveDelay);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("[WebSocket STT] Error:", error);
      if (pendingResolveRef.current) {
        pendingResolveRef.current('');
        pendingResolveRef.current = null;
      }
    };

    wsRef.current.onclose = () => {
      console.log("[WebSocket STT] Disconnected.");
      if (pendingResolveRef.current) {
        pendingResolveRef.current('');
        pendingResolveRef.current = null;
      }
      // BUGFIX: Auto-reconnect if it dropped unexpectedly while we should be listening
      if (isListeningRef.current) {
        console.log("[WebSocket STT] Unexpected drop, attempting reconnect...");
        setTimeout(() => connectWebSocket(), 1000);
      }
    };
  }, [silenceDelayMs]);

  const startListening = useCallback(async (reset = true) => {
    if (reset) {
      setFinalTranscript('');
      setInterimTranscript('');
      // Reset the silence-fire gate so a new answer can trigger submission
      silenceFiredRef.current = false;
    }

    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
      connectWebSocket();
    }

    // Initialize instant zero-latency local speech recognition for interim text
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let currentInterim = '';
        let hasText = false;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             setFinalTranscript(prev => (prev + ' ' + event.results[i][0].transcript).trim());
             hasText = true;
          } else {
             currentInterim += event.results[i][0].transcript;
             if (event.results[i][0].transcript.trim()) hasText = true;
          }
        }
        setInterimTranscript(currentInterim);
        
        // BUG 1 FIX: Silence Detection Auto-Submit & Adaptive Delay
        if (hasText) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          
          // Reset the duplicate lock because candidate resumed speaking
          silenceFiredRef.current = false;
          
          // Adaptive Silence: Wait longer if the candidate has barely spoken (thinking phase)
          const currentLength = finalTranscript.length + currentInterim.length;
          let adaptiveDelay = silenceDelayMs;
          if (currentLength < 30) adaptiveDelay += 1000; // Give them extra time if they just started
          else if (currentLength > 200) adaptiveDelay -= 1000; // Submit faster if they've spoken a lot
          
          silenceTimerRef.current = setTimeout(() => {
            // DUPLICATE FIX: Only fire once even if both local STT and WS backend timers compete
            if (!silenceFiredRef.current && onSilenceDetectedRef.current) {
              silenceFiredRef.current = true;
              onSilenceDetectedRef.current();
            }
          }, adaptiveDelay);
        }
      };
      
      try {
         recognitionRef.current.start();
      } catch (e) {
         console.warn("Local speech recognition failed to start:", e);
      }
    }

    try {
      let stream = globalStreamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        globalStreamRef.current = stream;
      }
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };

      // Send a chunk every 250ms for low-latency streaming
      mediaRecorderRef.current.start(500);
      setIsListening(true);
    } catch (err) {
      console.error("[WebSocket STT] Microphone access denied or failed:", err);
    }
  }, [connectWebSocket]);

  const stopListening = useCallback((triggerTranscription = true) => {
    return new Promise((resolve) => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      
      const doTrigger = () => {
        if (triggerTranscription && wsRef.current?.readyState === WebSocket.OPEN) {
          pendingResolveRef.current = resolve;
          wsRef.current.send(JSON.stringify({ action: "transcribe_now" }));
          
          setTimeout(() => {
            if (pendingResolveRef.current === resolve) {
               console.warn("[WebSocket STT] Backend transcription timed out, releasing lock.");
               pendingResolveRef.current = null;
               resolve('');
            }
          }, 8000);
        } else {
          resolve('');
        }
      };

      if (mediaRecorderRef.current && isListening && mediaRecorderRef.current.state !== 'inactive') {
        // BUGFIX: Wait for the final audio blob to flush before triggering transcription
        let triggered = false;
        const safeTrigger = () => {
          if (triggered) return;
          triggered = true;
          doTrigger();
        };
        
        mediaRecorderRef.current.onstop = safeTrigger;
        mediaRecorderRef.current.stop();
        // Do NOT stop tracks here. Reusing the stream prevents 500ms audio loss at the start of the next answer!
        
        // Safety Fallback: If onstop fails to fire (common Chrome bug when tracks are stopped)
        setTimeout(safeTrigger, 1000);
      } else {
        doTrigger();
      }
      
      setIsListening(false);
      isListeningRef.current = false; 
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    });
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  // Complete Unmount Cleanup (Memory Leak Protection)
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          if (globalStreamRef.current) {
            globalStreamRef.current.getTracks().forEach(track => track.stop());
          }
        } catch (e) {}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (pendingResolveRef.current) {
        pendingResolveRef.current('');
        pendingResolveRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    finalTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    setFinalTranscript
  };
}
