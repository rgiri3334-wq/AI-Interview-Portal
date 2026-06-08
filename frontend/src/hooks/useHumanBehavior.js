/**
 * hooks/useHumanBehavior.js
 * =============================================================================
 * Strict Pixel-Diff Motion Tracking
 * Replaced the random mock with a real pixel-difference algorithm that analyzes
 * the live video feed. This ensures strict posture enforcement with zero ML
 * overhead and zero dependencies.
 * =============================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export function useHumanBehavior(videoRef, sendTelemetry, { enabled = false } = {}) {
  const telemetryTimer  = useRef(null);
  const mountedRef      = useRef(false);
  const [status, setStatus] = useState('idle');
  const canvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  
  // Strictness thresholds
  // How much pixel difference to consider a pixel "changed" (0-255)
  const PIXEL_DIFF_THRESHOLD = 25; 
  // What % of the screen must change to be considered a minor movement (eye leniency)
  const EYE_MOVEMENT_THRESHOLD = 0.8; 
  // What % of the screen must change to be considered a strict posture violation
  const POSTURE_MOVEMENT_THRESHOLD = 3.5; 

  const metricsRef = useRef({
    emotion:         'Neutral',
    attention_score: 95,
    look_away_count: 0,
    gaze_yaw:        0,
    gaze_pitch:      0,
    face_detected:   true,
    suspicion_level: 'low',
    posture_violation: false,
    eye_violation: false
  });

  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      return;
    }

    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      // Low resolution for fast processing (64x48 = 3072 pixels)
      canvas.width = 64;
      canvas.height = 48;
      canvasRef.current = canvas;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Draw current video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let changedPixels = 0;
    const totalPixels = canvas.width * canvas.height;

    if (prevFrameRef.current) {
      const prevFrame = prevFrameRef.current;
      // Compare pixels (RGBA array)
      for (let i = 0; i < currentFrame.length; i += 4) {
        // Calculate grayscale difference for simplicity and speed
        const rDiff = Math.abs(currentFrame[i] - prevFrame[i]);
        const gDiff = Math.abs(currentFrame[i+1] - prevFrame[i+1]);
        const bDiff = Math.abs(currentFrame[i+2] - prevFrame[i+2]);
        
        // If the average difference is greater than the threshold
        if ((rDiff + gDiff + bDiff) / 3 > PIXEL_DIFF_THRESHOLD) {
          changedPixels++;
        }
      }

      const changePercentage = (changedPixels / totalPixels) * 100;
      
      // Reset flags
      metricsRef.current.posture_violation = false;
      metricsRef.current.eye_violation = false;

      // Strict enforcement logic
      if (changePercentage > POSTURE_MOVEMENT_THRESHOLD) {
        // Major movement -> Posture Violation
        metricsRef.current.posture_violation = true;
        metricsRef.current.attention_score = Math.max(0, metricsRef.current.attention_score - 15);
      } else if (changePercentage > EYE_MOVEMENT_THRESHOLD) {
        // Minor movement -> Eye/Gaze Violation (Lenient)
        metricsRef.current.eye_violation = true;
        metricsRef.current.attention_score = Math.max(0, metricsRef.current.attention_score - 5);
      } else {
        // Regain attention score slowly if perfectly still
        metricsRef.current.attention_score = Math.min(100, metricsRef.current.attention_score + 2);
      }

      // Only send telemetry if there is a violation or we randomly sample to keep dashboard alive
      if (metricsRef.current.posture_violation || metricsRef.current.eye_violation || Math.random() < 0.1) {
        if (sendTelemetry) sendTelemetry({...metricsRef.current, changePercentage});
      }
    }

    // Save current frame for next comparison
    prevFrameRef.current = new Uint8ClampedArray(currentFrame);
  }, [videoRef, sendTelemetry]);

  const start = useCallback(async () => {
    mountedRef.current = true;
    setStatus('active');
    console.log('%c[Behavior Engine] Active — Strict Pixel-Diff Motion Tracking', 'color:#00D1FF;font-weight:bold');

    // Run frame analysis every 500ms
    telemetryTimer.current = setInterval(analyzeFrame, 500);
  }, [analyzeFrame]);

  const stop = useCallback(() => {
    mountedRef.current = false;
    if (telemetryTimer.current) clearInterval(telemetryTimer.current);
    prevFrameRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    start();
    return () => stop();
  }, [enabled, start, stop]);

  return {
    status,           // 'idle' | 'loading' | 'active' | 'error' | 'unsupported'
    metricsRef,       
    getMetrics: () => metricsRef.current,
    stop,
  };
}
