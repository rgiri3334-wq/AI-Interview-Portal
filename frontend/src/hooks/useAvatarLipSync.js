/**
 * useAvatarLipSync.js
 * Real-time lip sync driver — translates audio frequency into mouth morph values.
 * 
 * Returns a ref (not state) so it can be read inside useFrame without
 * causing React re-renders. The 3D rig reads mouthOpenRef.current directly.
 * 
 * Viseme mapping (simplified ARPABET → mouth-open scale):
 *   0       → closed  (M, B, P, rest)
 *   0.1-0.3 → slight  (F, V, TH)
 *   0.3-0.6 → mid     (E, I, short vowels)
 *   0.6-0.85→ open    (A, O, long vowels)
 *   0.85-1.0→ wide    (AH cry, exclamation)
 */
import { useRef, useCallback } from 'react';

export function useAvatarLipSync(getAudioFrequency) {
  // Written-to by the animation frame loop, read by the 3D rig's useFrame
  const mouthOpenRef     = useRef(0);
  const prevMouthRef     = useRef(0);
  const lipSyncActiveRef = useRef(true);

  /**
   * Called every animation frame by the 3D rig's useFrame.
   * Reads latest audio frequency, applies smoothing, returns mouth-open 0–1.
   */
  const updateLipSync = useCallback(() => {
    if (!lipSyncActiveRef.current || !getAudioFrequency) {
      mouthOpenRef.current = Math.max(0, mouthOpenRef.current - 0.08); // decay
      return mouthOpenRef.current;
    }

    const rawFreq = getAudioFrequency(); // 0–255

    // Map frequency energy to mouth-open scale with perceptual curve
    // Low frequencies (bass/consonants) → small mouth
    // High frequencies (vowels/sustains) → wider mouth
    let targetOpen = 0;
    if (rawFreq < 10) {
      targetOpen = 0;                               // Closed (silence / M B P)
    } else if (rawFreq < 50) {
      targetOpen = (rawFreq - 10) / 40 * 0.25;     // Slight (F V TH)
    } else if (rawFreq < 100) {
      targetOpen = 0.25 + (rawFreq - 50) / 50 * 0.35; // Mid (E I short)
    } else if (rawFreq < 160) {
      targetOpen = 0.6 + (rawFreq - 100) / 60 * 0.25; // Open (A O long)
    } else {
      targetOpen = 0.85 + (rawFreq - 160) / 95 * 0.15; // Wide (AH)
    }

    // Clamp
    targetOpen = Math.max(0, Math.min(1, targetOpen));

    // Smooth: blend toward target at different rates for open/close
    // Opening is fast (natural speech onset), closing is slower (natural decay)
    const alpha = targetOpen > prevMouthRef.current ? 0.45 : 0.25;
    const smoothed = prevMouthRef.current * (1 - alpha) + targetOpen * alpha;

    prevMouthRef.current = smoothed;
    mouthOpenRef.current = smoothed;
    return smoothed;
  }, [getAudioFrequency]);

  const enable  = useCallback(() => { lipSyncActiveRef.current = true; }, []);
  const disable = useCallback(() => { lipSyncActiveRef.current = false; }, []);

  return { mouthOpenRef, updateLipSync, enable, disable };
}
