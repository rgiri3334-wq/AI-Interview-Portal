/**
 * hooks/useHumanBehavior.js
 * =============================================================================
 * Lightweight Mock version of Behavioral Analysis.
 * Replaced heavy Human.js WebGL inference with a zero-CPU mock generator.
 * This ensures the application runs smoothly on machines without dedicated GPUs (like i3).
 * =============================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export function useHumanBehavior(videoRef, sendTelemetry, { enabled = false } = {}) {
  const telemetryTimer  = useRef(null);
  const mountedRef      = useRef(false);
  const [status, setStatus] = useState('idle');

  // Exposed latest metrics (mocked)
  const metricsRef = useRef({
    emotion:         'Neutral',
    attention_score: 95,
    look_away_count: 0,
    gaze_yaw:        0,
    gaze_pitch:      0,
    face_detected:   true,
    suspicion_level: 'low',
  });

  const start = useCallback(async () => {
    mountedRef.current = true;
    setStatus('active');
    console.log('%c[Behavior Mock] Active — zero CPU usage', 'color:#00D1FF;font-weight:bold');

    // Simulate subtle attention shifting
    telemetryTimer.current = setInterval(() => {
      if (sendTelemetry) {
        // Just oscillate attention slightly
        metricsRef.current.attention_score = 90 + Math.floor(Math.random() * 10);
        sendTelemetry(metricsRef.current);
      }
    }, 10_000);
  }, [sendTelemetry]);

  const stop = useCallback(() => {
    mountedRef.current = false;
    if (telemetryTimer.current) clearInterval(telemetryTimer.current);
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
