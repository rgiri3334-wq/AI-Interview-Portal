/**
 * hooks/useAIVoice.js
 * AI Voice Interviewer using browser Web Speech Synthesis API.
 * Zero cost, zero API key, works completely offline.
 *
 * The AI Interviewer speaks questions aloud with a natural, professional voice.
 * Features:
 *   - Selects best available system voice (prefers Google/Microsoft neural voices)
 *   - Configurable rate, pitch, and volume
 *   - Queue system: speaks one sentence at a time from a queue
 *   - Cancels any in-progress speech before speaking a new question
 *   - isSpeaking state exposed to animate the AI avatar
 *
 * Author: Aditya Singh
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Try to find the best quality MALE English voice (the AI interviewer is male).
// Mirrors the live-interview voice logic so the briefing and interview match.
const FEMALE_VOICE = /(Aria|Jenny|Zira|Hazel|Female|Samantha|Victoria|Susan|Catherine|Sonia|Libby|Michelle|Eva|Heera|Salli|Joanna|Kendra|Ivy|Neerja|Swara)/i;

const selectVoice = (voices) => {
  if (!voices.length) return null;

  return (
    voices.find(v => /Guy Online.*Natural/i.test(v.name))                                   ||
    voices.find(v => /(Andrew|Brian|Eric|Davis|Guy)/i.test(v.name) && v.lang.startsWith('en')) ||
    voices.find(v => v.name === 'Google UK English Male')                                    ||
    voices.find(v => /Daniel/i.test(v.name) && v.lang.startsWith('en'))                      ||
    voices.find(v => /(Microsoft David|Microsoft Mark|Alex|Fred|Rishi|Ravi|Prabhat)/i.test(v.name)) ||
    voices.find(v => v.lang.startsWith('en') && /\bmale\b/i.test(v.name) && !FEMALE_VOICE.test(v.name)) ||
    voices.find(v => v.lang.startsWith('en') && !FEMALE_VOICE.test(v.name))                  ||
    voices.find(v => v.lang.startsWith('en'))                                                ||
    voices[0]
  );
};

export function useAIVoice({ rate = 0.95, pitch = 0.95, volume = 1.0 } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady]       = useState(false);
  const voiceRef                    = useRef(null);
  const synthRef                    = useRef(null);
  const queueRef                    = useRef([]);
  const processingRef               = useRef(false);

  // Initialize synthesis engine and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[AIVoice] SpeechSynthesis not supported in this browser.');
      return;
    }
    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      voiceRef.current = selectVoice(voices);
      if (voiceRef.current) {
        console.log(`[AIVoice] Selected voice: "${voiceRef.current.name}" (${voiceRef.current.lang})`);
        setIsReady(true);
      }
    };

    // Voices may load asynchronously on first call
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;

    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const _processQueue = useCallback(() => {
    if (processingRef.current || !queueRef.current.length) return;
    if (!synthRef.current) return;

    processingRef.current = true;
    const { text, resolve, reject } = queueRef.current.shift();

    const utterance         = new SpeechSynthesisUtterance(text);
    // GC PROTECTION: Chrome bug destroys utterance mid-speech if not globally referenced
    window.__ttsUtterance   = utterance;

    utterance.voice         = voiceRef.current;
    utterance.rate          = rate;
    utterance.pitch         = pitch;
    utterance.volume        = volume;
    utterance.lang          = 'en-US';

    // Safety timeout: forcefully resolve if speech gets stuck
    const safetyTimeout = setTimeout(() => {
      if (processingRef.current) {
        console.warn('[AIVoice] Safety timeout triggered. Force resolving TTS.');
        setIsSpeaking(false);
        processingRef.current = false;
        resolve();
        _processQueue();
      }
    }, Math.max(10000, text.length * 100)); // ~10 seconds min, longer for big text

    utterance.onstart  = () => setIsSpeaking(true);
    utterance.onend    = () => {
      clearTimeout(safetyTimeout);
      setIsSpeaking(false);
      processingRef.current = false;
      resolve();
      _processQueue(); // process next in queue
    };
    utterance.onerror  = (e) => {
      clearTimeout(safetyTimeout);
      console.error('[AIVoice] Speech error:', e.error);
      setIsSpeaking(false);
      processingRef.current = false;
      resolve(); // Resolve anyway so it doesn't hang
      _processQueue();
    };

    synthRef.current.speak(utterance);
  }, [rate, pitch, volume]);

  /**
   * Speak a text string. Cancels any current speech and speaks immediately.
   * @param {string} text - The AI question or message to speak
   * @returns {Promise} Resolves when speech finishes or is cancelled
   */
  const speak = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (!synthRef.current || !text) {
        resolve();
        return;
      }
      
      // If there's an existing item in queue, resolve it early because we're cancelling
      if (queueRef.current.length > 0) {
        queueRef.current.forEach(item => item.resolve());
      }
      
      // Cancel current speech and clear queue
      synthRef.current.cancel();
      queueRef.current = [{ text, resolve, reject }];
      processingRef.current = false;
      setTimeout(_processQueue, 100); // brief delay for cancel to flush
    });
  }, [_processQueue]);

  /**
   * Add text to the speech queue without interrupting current speech.
   */
  const enqueue = useCallback((text) => {
    return new Promise((resolve, reject) => {
      if (!text) {
        resolve();
        return;
      }
      queueRef.current.push({ text, resolve, reject });
      _processQueue();
    });
  }, [_processQueue]);

  /**
   * Stop speaking immediately.
   */
  const stop = useCallback(() => {
    synthRef.current?.cancel();
    if (queueRef.current.length > 0) {
      queueRef.current.forEach(item => item.resolve());
    }
    queueRef.current = [];
    processingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return { speak, enqueue, stop, isSpeaking, isReady };
}
