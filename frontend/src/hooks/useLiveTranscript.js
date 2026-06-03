import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for real-time Whisper-style live transcription.
 * Utilizes the browser's native SpeechRecognition API for zero-latency,
 * incremental streaming of spoken words.
 */
export function useLiveTranscript({ onSilenceDetected, silenceDelayMs = 3000 } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const onSilenceDetectedRef = useRef(onSilenceDetected);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onSilenceDetectedRef.current = onSilenceDetected;
  }, [onSilenceDetected]);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // CRITICAL for live Whisper-style typing
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += transcriptChunk + ' ';
        } else {
          currentInterim += transcriptChunk;
        }
      }

      if (currentFinal) {
        setFinalTranscript((prev) => (prev + ' ' + currentFinal).trim());
      }
      setInterimTranscript(currentInterim);

      // Reset the silence timer every time we hear words
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Only start silence timer if they have actually said something
      if (currentFinal || currentInterim) {
        silenceTimerRef.current = setTimeout(() => {
          if (onSilenceDetectedRef.current) {
            onSilenceDetectedRef.current();
          }
        }, silenceDelayMs);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Automatically restart if it stops unexpectedly while we still want it running
      // But for this hook, we let the parent control restarting via startListening
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [silenceDelayMs]);

  const startListening = useCallback((reset = true) => {
    if (reset) {
      setFinalTranscript('');
      setInterimTranscript('');
    }
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    finalTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    setFinalTranscript // expose just in case manual typing is mixed in
  };
}
