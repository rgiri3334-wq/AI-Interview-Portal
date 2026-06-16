/**
 * hooks/useAudioRecorder.js
 * =============================================================================
 * Handles recording the candidate's microphone to a highly-compatible .webm blob.
 * This ensures we can send the raw audio to the backend Whisper endpoint for
 * maximum accuracy, bypassing the limitations of the browser's native STT.
 * =============================================================================
 * Author: Aditya Singh | Sterling AI AI Platform
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Try to use a standard webm codec, fallback if not available
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("[useAudioRecorder] Failed to start recording:", err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      let triggered = false;
      const finishStop = () => {
        if (triggered) return;
        triggered = true;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = []; // clear
        setIsRecording(false);
        // Stop all tracks to release mic icon and prevent memory leaks
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        resolve(audioBlob);
      };

      mediaRecorderRef.current.onstop = finishStop;
      mediaRecorderRef.current.stop();
      
      // Safety Fallback: If onstop fails to fire
      setTimeout(finishStop, 1000);
    });
  }, []);

  const forceStopAllTracks = useCallback(() => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    forceStopAllTracks
  };
}
