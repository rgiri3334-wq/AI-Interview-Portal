/**
 * hooks/useHumanBehavior.js — Phase 1 Upgrade (v2 — Patched)
 * =============================================================================
 * Advanced Posture Monitoring & Eye Tracking Engine using MediaPipe.
 * Runs strictly at 1 FPS to guarantee zero WebGL lag on low-end machines,
 * while still perfectly capturing candidate proctoring metrics.
 *
 * FIXES APPLIED (v2):
 *  [BUG-1] Eye blendshapes now include inward gaze (eyeLookInLeft/Right) so
 *           right-side gaze is correctly detected for both eyes.
 *  [BUG-2] Yaw extraction formula corrected: was atan2(m[8], sqrt(m[9]²+m[10]²))
 *           which computed PITCH (nodding). Now uses atan2(m[8], m[0]) for true
 *           lateral head-rotation (yaw).
 *  [BUG-3] Baseline now uses Exponential Moving Average (α=0.02) so it adapts
 *           slowly to the candidate's natural sitting position instead of locking
 *           after 10 frames.
 *  [BUG-4] offScreenStreak now decays by 1 per clean frame (min 0) instead of
 *           hard-resetting, preventing one-frame blink gaming.
 *  [BUG-7] Down-gaze now averages eyeLookDownLeft + eyeLookDownRight for both eyes.
 * =============================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function useHumanBehavior(videoRef, onVisionSignal, { enabled = false } = {}) {
  const [status, setStatus] = useState('idle');
  const mountedRef = useRef(false);
  const landmarkerRef = useRef(null);
  const rafId = useRef(null);
  const lastVideoTime = useRef(-1);
  const lastCheckTime = useRef(0);

  // State trackers for rolling logic
  const offScreenStreak = useRef(0);
  const noFaceStreak = useRef(0);
  const postureStreak = useRef(0);

  // [BUG-3 FIX] EMA baseline instead of locked 10-frame average
  const baselineYaw = useRef(null); // null = not yet initialised
  const framesProcessed = useRef(0);
  const EMA_ALPHA = 0.02; // Slow adaptation (≈50-frame half-life at 1 FPS)

  // Exposed latest metrics
  const metricsRef = useRef({
    emotion:         'Neutral',
    attention_score: 95,
    look_away_count: 0,
    face_detected:   true,
    suspicion_level: 'low',
  });

  const initModel = useCallback(async () => {
    try {
      setStatus('loading');
      console.log('%c[Vision Engine] Loading MediaPipe FaceLandmarker...', 'color:#00D1FF;font-weight:bold');
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU" // Will fallback to CPU if WebGL is overloaded
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 2 // Detect multiple faces
      });
      console.log('%c[Vision Engine] Ready.', 'color:#00D1FF;font-weight:bold');
      setStatus('active');
    } catch (e) {
      console.error("[Vision Engine] Init failed", e);
      setStatus('error');
    }
  }, []);

  const stop = useCallback(() => {
    mountedRef.current = false;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (landmarkerRef.current) {
      landmarkerRef.current.close();
      landmarkerRef.current = null;
    }
    setStatus('idle');
  }, []);

  const detectFrame = useCallback(() => {
    if (!mountedRef.current || !videoRef.current || !landmarkerRef.current) return;

    // Strict 1 FPS Throttling
    const now = performance.now();
    if (now - lastCheckTime.current < 1000) {
      rafId.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastCheckTime.current = now;

    const video = videoRef.current;
    if (video.readyState >= 2) {
      if (video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        const results = landmarkerRef.current.detectForVideo(video, now);

        // ── Analyze Results ──────────────────────────────────────────────
        const faces = results.faceLandmarks || [];

        if (faces.length === 0) {
          noFaceStreak.current += 1;
          metricsRef.current.face_detected = false;
          if (noFaceStreak.current === 3) {
            onVisionSignal && onVisionSignal('movement_warning', { note: 'Candidate out of frame.' });
          } else if (noFaceStreak.current === 8) {
            onVisionSignal && onVisionSignal('seat_abandonment', { note: 'Candidate missing for 8+ seconds.' });
          }
        } else {
          metricsRef.current.face_detected = true;
          noFaceStreak.current = 0;

          if (faces.length > 1) {
            onVisionSignal && onVisionSignal('multiple_people', { note: 'Multiple faces detected in frame!' });
          }

          // ── [BUG-1 FIX] Eye Tracking via Blendshapes ──────────────────
          // Uses all 4 directional gaze blendshapes per eye (left + right)
          // so both outward AND inward gaze is captured correctly.
          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const shapes = results.faceBlendshapes[0].categories;

            const getScore = (name) => shapes.find(s => s.categoryName === name)?.score || 0;

            // Outward = away from nose; Inward = toward nose
            const lookLeft  = getScore('eyeLookOutLeft');   // left eye looking leftward ✅
            const lookRight = getScore('eyeLookOutRight');  // right eye looking rightward ✅
            const lookInLeft  = getScore('eyeLookInLeft'); // left eye looking rightward (toward nose) ← BUG-1 fix
            const lookInRight = getScore('eyeLookInRight'); // right eye looking leftward (toward nose) ← BUG-1 fix
            const lookUp    = getScore('eyeLookUpLeft');
            // [BUG-7 FIX] Average both eyes for downward gaze
            const lookDown  = (getScore('eyeLookDownLeft') + getScore('eyeLookDownRight')) / 2;

            // Combined off-screen gaze: looking hard in any direction
            const gazedOff = lookLeft > 0.65
                          || lookRight > 0.65
                          || lookInLeft > 0.60   // threshold slightly lower for inward — less natural
                          || lookInRight > 0.60
                          || lookUp > 0.65
                          || lookDown > 0.70;

            if (gazedOff) {
              offScreenStreak.current += 1;
              if (offScreenStreak.current === 2) {
                onVisionSignal && onVisionSignal('off_screen_gaze', { note: 'Brief off-screen gaze detected.' });
                metricsRef.current.look_away_count += 1;
              } else if (offScreenStreak.current === 6) {
                onVisionSignal && onVisionSignal('continuous_off_screen', { note: 'Continuous off-screen gaze detected.' });
              }
            } else {
              // [BUG-4 FIX] Decay by 1 instead of hard-resetting to 0
              // Prevents a single blink-back frame from wiping a long gaze streak
              offScreenStreak.current = Math.max(0, offScreenStreak.current - 1);
            }
          }

          // ── [BUG-2 FIX] Posture via Transformation Matrix ─────────────
          // MediaPipe returns a column-major 4×4 matrix (16 floats).
          // Correct yaw (left-right head rotation) formula: atan2(m[8], m[0])
          // Previous code used atan2(m[8], sqrt(m[9]²+m[10]²)) = PITCH (nodding).
          if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            const matrix = results.facialTransformationMatrixes[0].data;

            // Column-major layout:
            // m[0]  m[4]  m[8]   m[12]
            // m[1]  m[5]  m[9]   m[13]
            // m[2]  m[6]  m[10]  m[14]
            // m[3]  m[7]  m[11]  m[15]
            //
            // Yaw (Y-axis rotation, head turning left/right):
            const yaw = Math.atan2(matrix[8], matrix[0]) * (180 / Math.PI);

            framesProcessed.current += 1;

            // [BUG-3 FIX] EMA baseline — initialise on first frame, then slowly adapt
            if (baselineYaw.current === null) {
              baselineYaw.current = yaw; // seed baseline
            } else {
              // EMA: new_baseline = α * current_yaw + (1-α) * old_baseline
              baselineYaw.current = EMA_ALPHA * yaw + (1 - EMA_ALPHA) * baselineYaw.current;
            }

            // Only start flagging after 5 frames (5 seconds) so baseline is stable
            if (framesProcessed.current >= 5) {
              const yawDiff = Math.abs(yaw - baselineYaw.current);

              if (yawDiff > 35) { // Extreme head rotation (>35° from personal baseline)
                postureStreak.current += 1;
                if (postureStreak.current === 3) {
                  onVisionSignal && onVisionSignal('posture_warning', { note: 'Head rotated heavily (side monitor?).' });
                } else if (postureStreak.current === 8) {
                  onVisionSignal && onVisionSignal('posture_critical', { note: 'Continuous abnormal posture detected.' });
                }
              } else {
                // Gradual decay: reduce streak by 1 (same as eye tracking fix)
                postureStreak.current = Math.max(0, postureStreak.current - 1);
              }
            }
          }
        }
      }
    }
    rafId.current = requestAnimationFrame(detectFrame);
  }, [onVisionSignal]);

  const start = useCallback(async () => {
    mountedRef.current = true;
    if (status === 'idle') {
      await initModel();
    }
    // Only start RAF loop if model initialised successfully
    if (landmarkerRef.current) {
      rafId.current = requestAnimationFrame(detectFrame);
    }
  }, [status, initModel, detectFrame]);

  useEffect(() => {
    if (enabled && status !== 'active' && status !== 'loading') {
      start();
    }
    if (!enabled && status === 'active') {
      stop();
    }
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled, status, start, stop]);

  return {
    status,
    metricsRef,
    getMetrics: () => metricsRef.current,
    stop,
  };
}
