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
// FaceLandmarker moved to visionWorker.js to unblock main thread

export function useHumanBehavior(
  videoRef,
  onVisionSignal,          // → feeds integrity engine (silent, no UI)
  { enabled = false } = {},
  onPostureHint = null     // → optional callback for candidate-facing gentle hints
) {
  const [status, setStatus] = useState('idle');
  const mountedRef = useRef(false);
  const workerRef = useRef(null);
  const rafId = useRef(null);
  const lastCheckTime = useRef(0);

  // Streak trackers
  const offScreenStreak = useRef(0);
  const noFaceStreak = useRef(0);
  const postureYawStreak = useRef(0);
  const posturePitchStreak = useRef(0); // [STRICT-9] Down-pitch streak for phone-on-lap
  const multiplePeopleStreak = useRef(0);

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

  const processResults = useCallback((results) => {
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
        multiplePeopleStreak.current += 1;
        if (multiplePeopleStreak.current === 1) {
          _fireSignal('multiple_people', { note: 'Multiple faces detected in frame!' });
        }
        if (multiplePeopleStreak.current >= 10) {
          _fireSignal('multiple_people_critical', { note: 'Multiple faces present for >10 seconds. Terminating.' });
        }
      } else {
        multiplePeopleStreak.current = 0;
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

        // [STRICT-3] Tightened thresholds
        const gazedOff =
          lookOutLeft  > 0.50 ||
          lookOutRight > 0.50 ||
          lookInLeft   > 0.48 ||
          lookInRight  > 0.48 ||
          lookUp       > 0.55 ||
          lookDown     > 0.65;

        if (gazedOff) {
          offScreenStreak.current += 1;
          if (offScreenStreak.current === 2) {
            _fireSignal('off_screen_gaze', { note: 'Off-screen gaze detected.' });
            metricsRef.current.look_away_count += 1;
            onPostureHint && onPostureHint('gaze', 'Please keep your eyes on the screen during the interview.');
          }
          if (offScreenStreak.current === 5) {
            _fireSignal('continuous_off_screen', { note: 'Sustained off-screen gaze.' });
            onPostureHint && onPostureHint('gaze_critical', 'Please maintain focus on the interview screen.');
          }
        } else {
          offScreenStreak.current = Math.max(0, offScreenStreak.current - 1);
        }
      }

      // ── POSTURE TRACKING (TRANSFORMATION MATRIX) ─────────────────────────
      if (results.facialTransformationMatrixes?.length > 0) {
        const matrix = results.facialTransformationMatrixes[0].data;
        const yaw   = Math.atan2(matrix[8],  matrix[0])  * (180 / Math.PI);
        const pitch = Math.atan2(-matrix[9], matrix[10]) * (180 / Math.PI);

        framesProcessed.current += 1;
        if (baselineYaw.current === null) {
          baselineYaw.current   = yaw;
          baselinePitch.current = pitch;
        } else {
          baselineYaw.current   = EMA_ALPHA * yaw   + (1 - EMA_ALPHA) * baselineYaw.current;
          baselinePitch.current = EMA_ALPHA * pitch + (1 - EMA_ALPHA) * baselinePitch.current;
        }

        if (framesProcessed.current >= 5) {
          const yawDiff   = Math.abs(yaw   - baselineYaw.current);
          const pitchDiff = pitch - baselinePitch.current;

          // Yaw
          if (yawDiff > 20) {
            postureYawStreak.current += 1;
            if (postureYawStreak.current === 2) {
              _fireSignal('posture_warning', { note: `Head turned ${yawDiff.toFixed(0)}° sideways.`, yaw_diff: yawDiff });
              onPostureHint && onPostureHint('posture', 'Please face forward and maintain a comfortable, straight posture.');
            }
            if (postureYawStreak.current === 5) {
              _fireSignal('posture_critical', { note: `Sustained head rotation ${yawDiff.toFixed(0)}°.` });
              onPostureHint && onPostureHint('posture_critical', 'Please look directly at the screen to continue your interview.');
            }
          } else {
            postureYawStreak.current = Math.max(0, postureYawStreak.current - 1);
          }

          // Pitch
          if (pitchDiff > 25) {
            posturePitchStreak.current += 1;
            if (posturePitchStreak.current === 2) {
              _fireSignal('posture_warning', { note: `Head tilted down ${pitchDiff.toFixed(0)}°.`, pitch_diff: pitchDiff });
              onPostureHint && onPostureHint('posture', 'Please sit upright and keep your head level for the camera.');
            }
            if (posturePitchStreak.current === 5) {
              _fireSignal('posture_critical', { note: `Sustained downward head tilt ${pitchDiff.toFixed(0)}°.` });
              onPostureHint && onPostureHint('posture_critical', 'Please keep your eyes on the screen and maintain good posture.');
            }
          } else {
            posturePitchStreak.current = Math.max(0, posturePitchStreak.current - 1);
          }
        }
      }
    }
  }, [onVisionSignal, onPostureHint, _fireSignal]);

  const initModel = useCallback(async () => {
    try {
      setStatus('loading');
      console.log('%c[Vision Engine] Starting Web Worker for MediaPipe...', 'color:#00D1FF;font-weight:bold');
      
      const worker = new Worker(new URL('../workers/visionWorker.js', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, results, error } = e.data;
        if (type === 'INIT_SUCCESS') {
          console.log('%c[Vision Engine] Worker Ready. Strict mode active.', 'color:#00D1FF;font-weight:bold');
          setStatus('active');
        } else if (type === 'INIT_ERROR') {
          console.error("[Vision Engine] Worker init failed", error);
          setStatus('error');
        } else if (type === 'FRAME_RESULTS') {
          processResults(results);
        } else if (type === 'FRAME_ERROR') {
          console.warn("[Vision Engine] Frame processing error:", error);
        }
      };

      worker.postMessage({ type: 'INIT' });

    } catch (e) {
      console.error("[Vision Engine] Failed to start worker", e);
      setStatus('error');
    }
  }, [processResults]);

  const stop = useCallback(() => {
    mountedRef.current = false;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CLOSE' });
      workerRef.current = null;
    }
    setStatus('idle');
  }, []);

  const detectFrame = useCallback(async () => {
    if (!mountedRef.current || !videoRef.current || !workerRef.current) return;

    // Strict 1 FPS Throttle
    const now = performance.now();
    if (now - lastCheckTime.current < 1000) {
      rafId.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastCheckTime.current = now;

    const video = videoRef.current;
    if (video.readyState >= 2) {
      try {
        // Grab a frame and transfer it to the worker
        const imageBitmap = await createImageBitmap(video);
        workerRef.current.postMessage(
          { type: 'PROCESS_FRAME', imageBitmap, timestamp: now },
          [imageBitmap] // Transfer ownership to worker (zero-copy)
        );
      } catch (err) {
        console.warn("[Vision Engine] Failed to grab frame:", err);
      }
    }
    rafId.current = requestAnimationFrame(detectFrame);
  }, []);

  const start = useCallback(async () => {
    mountedRef.current = true;
    if (status === 'idle') await initModel();
    if (workerRef.current) {
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
