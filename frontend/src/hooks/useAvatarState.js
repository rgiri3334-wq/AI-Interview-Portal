/**
 * useAvatarState.js
 * Enterprise Avatar State Machine
 * 
 * Derives the avatar's emotional/behavioral state from interview signals.
 * All state transitions are smooth — no jarring cuts.
 * 
 * States:
 *   idle       → resting, soft breathing, random blinks
 *   listening  → forward lean, attentive gaze, subtle nods
 *   thinking   → head tilt up-left, slower blink rate
 *   speaking   → lip sync active, head bob, gesture
 *   processing → neutral waiting
 *   assertive  → lean forward, focused expression
 *   friendly   → warm smile morph
 */
import { useMemo } from 'react';

export const AVATAR_STATES = {
  IDLE:       'idle',
  LISTENING:  'listening',
  THINKING:   'thinking',
  SPEAKING:   'speaking',
  GREETING:   'greeting',   // first spoken turn → speaking + hand wave
  PROCESSING: 'processing',
  ASSERTIVE:  'assertive',
  FRIENDLY:   'friendly',
};

/**
 * Derives avatar state from interview signals.
 * @param {Object} signals
 * @param {boolean} signals.isSpeaking     - TTS currently playing
 * @param {boolean} signals.isListening    - Microphone active
 * @param {boolean} signals.isLoading      - AI thinking / API call in flight
 * @param {string}  signals.phase          - Interview phase: 'ready'|'interviewing'|'ending'
 * @param {number}  signals.qIndex         - Current question index
 * @param {number}  signals.warnings       - Proctoring warning count
 */
export function useAvatarState({ isSpeaking, isListening, isLoading, phase, qIndex, warnings }) {
  const avatarState = useMemo(() => {
    if (phase === 'ready' || phase === 'initializing') return AVATAR_STATES.FRIENDLY;
    if (phase === 'ending')                             return AVATAR_STATES.FRIENDLY;

    // First spoken turn (the greeting) → GREETING so the avatar waves hello.
    if (isSpeaking && phase === 'interviewing' && qIndex === 0) return AVATAR_STATES.GREETING;
    if (isSpeaking)   return AVATAR_STATES.SPEAKING;
    if (isLoading)    return AVATAR_STATES.THINKING;
    if (isListening)  return AVATAR_STATES.LISTENING;

    // Assertive mode: trigger after a technically complex question (Q4+)
    if (qIndex >= 4 && !isListening && !isSpeaking) return AVATAR_STATES.ASSERTIVE;

    return AVATAR_STATES.IDLE;
  }, [isSpeaking, isListening, isLoading, phase, qIndex, warnings]);

  return avatarState;
}
