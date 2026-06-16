/**
 * hooks/useHumanBehavior.js — v3.0 STRICT PROCTORING ENGINE
 * =============================================================================
 * STRICT MODE CHANGES (v3 over v2):
 *
 *  [STRICT-1] Yaw threshold reduced: 35° → 20° (catches looking at side phone)
 *  [STRICT-2] Pitch tracking ADDED: looking DOWN at phone on lap now detected
 *  [STRICT-3] Eye gaze threshold reduced: 0.65 → 0.50 (catches subtle glances)
 *  [STRICT-4] Posture streak fires at 2 frames (was 3) — 2-second response time
 *  [STRICT-5] Eye streak fires at 2 frames (was 2, now fires a mild nudge too)
 *  [STRICT-6] Continuous signals fire at 5 frames (was 6) for faster escalation
 *  [STRICT-7] Separate onPostureHint callback for candidate-facing gentle message
 *             — completely hides the proctoring system from the candidate
 *  [STRICT-8] noFaceStreak fires at 2 frames (was 3) for faster no-face detection
 *  [STRICT-9] Phone detection: down pitch > 25° + face still visible = looking at lap device
 * =============================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function useHumanBehavior(
  videoRef,
  onVisionSignal,          // → feeds integrity engine (silent, no UI)
  { enabled = false } = {},
  onPostureHint = null     // → optional callback for candidate-facing gentle hints
) {
  const [status, setStatus] = useState('idle');
  const mountedRef = useRef(false);
  const landmarkerRef = useRef(null);
  const rafId = useRef(null);
  const lastVideoTime = useRef(-1);
  const lastCheckTime = useRef(0);

  // Streak trackers
  const offScreenStreak = useRef(0);
  const noFaceStreak = useRef(0);
  const postureYawStreak = useRef(0);
  const posturePitchStreak = useRef(0); // [STRICT-9] Down-pitch streak for phone-on-lap

  // [BUG-3 FIX] EMA baseline
  const baselineYaw = useRef(null);
  const baselinePitch = useRef(null);
  const framesProcessed = useRef(0);
  const EMA_ALPHA = 0.015; // Even slower adaptation — baseline locks better on strict mode

  // Cooldown: prevent firing same signal repeatedly every frame
  const lastSignalTime = useRef({});
  const SIGNAL_COOLDOWN_MS = 8000; // Each signal type fires at most once every 8s

  const metricsRef = useRef({
    emotion:         'Neutral',
    attention_score: 95,
    look_away_count: 0,
    face_detected:   true,
    suspicion_level: 'low',
  });

  const _canFire = useCallback((key) => {
    const now = Date.now();
    const last = lastSignalTime.current[key] || 0;
    if (now - last < SIGNAL_COOLDOWN_MS) return false;
    lastSignalTime.current[key] = now;
    return true;
  }, []);

  const _fireSignal = useCallback((key, meta) => {
    if (!_canFire(key)) return;
    onVisionSignal && onVisionSignal(key, meta);
  }, [onVisionSignal, _canFire]);

  const initModel = useCallback(async () => {
    try {
      setStatus('loading');
      console.log('%c[Vision Engine] Initializing MediaPipe FaceLandmarker...', 'color:#00D1FF;font-weight:bold');
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 2
      });
      console.log('%c[Vision Engine] Ready. Strict mode active.', 'color:#00D1FF;font-weight:bold');
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

    // Strict 1 FPS Throttle
    const now = performance.now();
    if (now - lastCheckTime.current < 1000) {
      rafId.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastCheckTime.current = now;

    const video = videoRef.current;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      const results = landmarkerRef.current.detectForVideo(video, now);
      const faces = results.faceLandmarks || [];

      // ── NO FACE DETECTED ──────────────────────────────────────────────────
      if (faces.length === 0) {
        noFaceStreak.current += 1;
        metricsRef.current.face_detected = false;

        // [STRICT-8] Fires at 2s instead of 3s
        if (noFaceStreak.current === 2) {
          _fireSignal('movement_warning', { note: 'Candidate not visible in frame.' });
          // Gentle nudge to candidate — no proctoring language
          onPostureHint && onPostureHint('nudge', 'Please ensure your face is clearly visible in the camera.');
        }
        if (noFaceStreak.current === 6) {
          _fireSignal('seat_abandonment', { note: 'Candidate missing for 6+ seconds.' });
        }
      } else {
        // Face back in frame — reset
        metricsRef.current.face_detected = true;
        noFaceStreak.current = 0;

        // ── MULTIPLE PEOPLE ─────────────────────────────────────────────────
        if (faces.length > 1) {
          _fireSignal('multiple_people', { note: 'Multiple faces detected in frame!' });
        }

        // ── EYE TRACKING (BLENDSHAPES) ──────────────────────────────────────
        if (results.faceBlendshapes?.length > 0) {
          const shapes = results.faceBlendshapes[0].categories;
          const get = (name) => shapes.find(s => s.categoryName === name)?.score || 0;

          // All 8 directional gaze components — both eyes, all directions
          const lookOutLeft   = get('eyeLookOutLeft');   // left eye → left
          const lookOutRight  = get('eyeLookOutRight');  // right eye → right
          const lookInLeft    = get('eyeLookInLeft');    // left eye → right (nose side)
          const lookInRight   = get('eyeLookInRight');   // right eye → left (nose side)
          const lookUp        = get('eyeLookUpLeft');
          const lookDown      = (get('eyeLookDownLeft') + get('eyeLookDownRight')) / 2;

          // [STRICT-3] Tightened thresholds: 0.65 → 0.50 for horizontal, 0.55 for up, 0.60 for down
          // Down is higher because downward gaze happens naturally when thinking
          const gazedOff =
            lookOutLeft  > 0.50 ||   // looking hard left
            lookOutRight > 0.50 ||   // looking hard right
            lookInLeft   > 0.48 ||   // inward left eye (eyes right)
            lookInRight  > 0.48 ||   // inward right eye (eyes left)
            lookUp       > 0.55 ||   // looking up
            lookDown     > 0.65;     // looking down (raised threshold — normal thinking)

          if (gazedOff) {
            offScreenStreak.current += 1;

            // [STRICT-5] Fire gentle nudge at 2 frames
            if (offScreenStreak.current === 2) {
              _fireSignal('off_screen_gaze', { note: 'Off-screen gaze detected.' });
              metricsRef.current.look_away_count += 1;
              // Gentle candidate hint — phrased as ergonomics, not surveillance
              onPostureHint && onPostureHint('gaze', 'Please keep your eyes on the screen during the interview.');
            }
            // [STRICT-6] Continuous fires at 5 frames (was 6)
            if (offScreenStreak.current === 5) {
              _fireSignal('continuous_off_screen', { note: 'Sustained off-screen gaze.' });
              onPostureHint && onPostureHint('gaze_critical', 'Please maintain focus on the interview screen.');
            }
          } else {
            // Decay: −1 per clean frame
            offScreenStreak.current = Math.max(0, offScreenStreak.current - 1);
          }
        }

        // ── POSTURE TRACKING (TRANSFORMATION MATRIX) ─────────────────────────
        if (results.facialTransformationMatrixes?.length > 0) {
          const matrix = results.facialTransformationMatrixes[0].data;

          // Column-major 4×4 matrix extraction:
          // Yaw   (left/right head turn): atan2(m[8],  m[0])
          // Pitch (up/down nod):          atan2(-m[9], m[10])   ← [STRICT-9] ADDED
          const yaw   = Math.atan2(matrix[8],  matrix[0])  * (180 / Math.PI);
          const pitch = Math.atan2(-matrix[9], matrix[10]) * (180 / Math.PI);

          framesProcessed.current += 1;

          // EMA baseline seed
          if (baselineYaw.current === null) {
            baselineYaw.current   = yaw;
            baselinePitch.current = pitch;
          } else {
            baselineYaw.current   = EMA_ALPHA * yaw   + (1 - EMA_ALPHA) * baselineYaw.current;
            baselinePitch.current = EMA_ALPHA * pitch + (1 - EMA_ALPHA) * baselinePitch.current;
          }

          // Only flag after 5s warm-up
          if (framesProcessed.current >= 5) {
            const yawDiff   = Math.abs(yaw   - baselineYaw.current);
            const pitchDiff = pitch - baselinePitch.current; // signed: positive = tilting down

            // ── YAW: Looking sideways (side phone, extra monitor) ──────────
            // [STRICT-1] Threshold: 35° → 20°
            if (yawDiff > 20) {
              postureYawStreak.current += 1;
              // [STRICT-4] Fire at 2 frames (was 3)
              if (postureYawStreak.current === 2) {
                _fireSignal('posture_warning', {
                  note: `Head turned ${yawDiff.toFixed(0)}° sideways — possible side device.`,
                  yaw_diff: yawDiff,
                });
                // Friendly ergonomics-framed hint — NO mention of proctoring
                onPostureHint && onPostureHint('posture', 'Please face forward and maintain a comfortable, straight posture.');
              }
              if (postureYawStreak.current === 5) {
                _fireSignal('posture_critical', {
                  note: `Sustained head rotation ${yawDiff.toFixed(0)}° — continued side-viewing.`,
                });
                onPostureHint && onPostureHint('posture_critical', 'Please look directly at the screen to continue your interview.');
              }
            } else {
              postureYawStreak.current = Math.max(0, postureYawStreak.current - 1);
            }

            // ── PITCH: Looking DOWN (phone on lap) ──────────────────────────
            // [STRICT-9] NEW: pitchDiff > 25° = head tilted down substantially
            if (pitchDiff > 25) {
              posturePitchStreak.current += 1;
              if (posturePitchStreak.current === 2) {
                _fireSignal('posture_warning', {
                  note: `Head tilted down ${pitchDiff.toFixed(0)}° — possible phone on lap.`,
                  pitch_diff: pitchDiff,
                });
                onPostureHint && onPostureHint('posture', 'Please sit upright and keep your head level for the camera.');
              }
              if (posturePitchStreak.current === 5) {
                _fireSignal('posture_critical', {
                  note: `Sustained downward head tilt ${pitchDiff.toFixed(0)}°.`,
                });
                onPostureHint && onPostureHint('posture_critical', 'Please keep your eyes on the screen and maintain good posture.');
              }
            } else {
              posturePitchStreak.current = Math.max(0, posturePitchStreak.current - 1);
            }
          }
        }
      }
    }
    rafId.current = requestAnimationFrame(detectFrame);
  }, [onVisionSignal, onPostureHint, _fireSignal]);

  const start = useCallback(async () => {
    mountedRef.current = true;
    if (status === 'idle') await initModel();
    if (landmarkerRef.current) {
      rafId.current = requestAnimationFrame(detectFrame);
    }
  }, [status, initModel, detectFrame]);

  useEffect(() => {
    if (enabled && status !== 'active' && status !== 'loading') start();
    if (!enabled && status === 'active') stop();
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [enabled, status, start, stop]);

  return { status, metricsRef, getMetrics: () => metricsRef.current, stop };
}
