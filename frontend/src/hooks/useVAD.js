import { useEffect, useRef } from 'react';

export function useVAD(isSpeaking, onInterrupt) {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const rafIdRef = useRef(null);

  useEffect(() => {
    if (!isSpeaking) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const startVAD = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let activeFrames = 0;

        const checkAudio = () => {
          if (!isMounted) return;
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;

          // Threshold for "barge-in" - requires tuning
          if (avg > 30) {
            activeFrames++;
            // Require sustained sound (approx 300ms at 60fps = ~18 frames)
            if (activeFrames > 15) {
              onInterrupt();
              activeFrames = 0; // reset
            }
          } else {
            activeFrames = Math.max(0, activeFrames - 1); // decay
          }

          rafIdRef.current = requestAnimationFrame(checkAudio);
        };

        checkAudio();
      } catch (err) {
        console.warn("[VAD] Failed to acquire microphone for interrupt detection:", err);
      }
    };

    startVAD();

    return () => {
      isMounted = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current?.state !== 'closed') {
        audioCtxRef.current?.close();
      }
    };
  }, [isSpeaking, onInterrupt]);
}
