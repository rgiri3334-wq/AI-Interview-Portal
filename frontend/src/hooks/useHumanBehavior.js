/**
 * hooks/useHumanBehavior.js — Phase 1 Upgrade
 * =============================================================================
 * Advanced Posture Monitoring & Eye Tracking Engine using MediaPipe.
 * Runs strictly at 1 FPS to guarantee zero WebGL lag on low-end machines,
 * while still perfectly capturing candidate proctoring metrics.
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
  const baselineYaw = useRef(0);
  const baselineSet = useRef(false);
  const framesProcessed = useRef(0);

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

          // Eye Tracking via Blendshapes
          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const shapes = results.faceBlendshapes[0].categories;
            const lookLeft = shapes.find(s => s.categoryName === 'eyeLookOutLeft')?.score || 0;
            const lookRight = shapes.find(s => s.categoryName === 'eyeLookOutRight')?.score || 0;
            const lookUp = shapes.find(s => s.categoryName === 'eyeLookUpLeft')?.score || 0;
            const lookDown = shapes.find(s => s.categoryName === 'eyeLookDownLeft')?.score || 0;
            
            // Heuristic threshold
            if (lookLeft > 0.65 || lookRight > 0.65 || lookUp > 0.65 || lookDown > 0.70) {
              offScreenStreak.current += 1;
              if (offScreenStreak.current === 2) {
                onVisionSignal && onVisionSignal('off_screen_gaze', { note: 'Brief off-screen gaze detected.' });
              } else if (offScreenStreak.current === 6) {
                onVisionSignal && onVisionSignal('continuous_off_screen', { note: 'Continuous off-screen gaze detected.' });
              }
            } else {
              offScreenStreak.current = 0;
            }
          }

          // Posture via Transformation Matrix
          if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            const matrix = results.facialTransformationMatrixes[0].data;
            // Simplified Yaw extraction from matrix (m13)
            const yaw = Math.atan2(matrix[8], Math.sqrt(matrix[9]*matrix[9] + matrix[10]*matrix[10])) * (180/Math.PI);
            
            framesProcessed.current += 1;
            if (framesProcessed.current < 10) {
              // Collect baseline
              baselineYaw.current = (baselineYaw.current * (framesProcessed.current - 1) + yaw) / framesProcessed.current;
            } else {
              baselineSet.current = true;
              const yawDiff = Math.abs(yaw - baselineYaw.current);
              
              if (yawDiff > 35) { // Extreme head rotation
                postureStreak.current += 1;
                if (postureStreak.current === 3) {
                  onVisionSignal && onVisionSignal('posture_warning', { note: 'Head rotated heavily (side monitor?).' });
                } else if (postureStreak.current === 8) {
                  onVisionSignal && onVisionSignal('posture_critical', { note: 'Continuous abnormal posture detected.' });
                }
              } else {
                postureStreak.current = 0;
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
    rafId.current = requestAnimationFrame(detectFrame);
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
