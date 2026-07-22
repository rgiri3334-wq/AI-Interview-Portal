/**
 * store/useInterviewStore.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Zustand store for fast-moving interview telemetry.
 * 
 * Purpose: Isolate high-frequency state (audio volume, eye tracking, network
 * metrics) from React's prop-driven re-render cycle. Components subscribe to
 * individual slices, so a 60fps volume change only re-renders the waveform,
 * not the entire LiveInterview page.
 *
 * Usage:
 *   import { useInterviewStore } from '../store/useInterviewStore';
 *   const volume = useInterviewStore(s => s.volumeLevel);  // subscribes ONLY to volume
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';

export const useInterviewStore = create((set) => ({
  // ── Audio Telemetry ──────────────────────────────────────────────────────
  volumeLevel: 0,          // 0.0–1.0, updated ~60fps from AudioAnalyser
  setVolumeLevel: (v) => set({ volumeLevel: v }),

  // ── Eye Tracking / Gaze Telemetry ──────────────────────────────────────
  eyeGazeX: 0.5,           // normalized 0–1 (center = 0.5)
  eyeGazeY: 0.5,
  setEyeGaze: (x, y) => set({ eyeGazeX: x, eyeGazeY: y }),

  // ── Network / WebSocket Telemetry ──────────────────────────────────────
  networkPing: 0,           // ms, updated every heartbeat cycle
  wsConnected: false,
  wsReconnecting: false,
  setNetworkPing: (ms) => set({ networkPing: ms }),
  setWsStatus: (connected, reconnecting) => set({ wsConnected: connected, wsReconnecting: reconnecting }),

  // ── Proctoring Signals ─────────────────────────────────────────────────
  proctoringAlerts: [],     // array of { type, message, timestamp }
  addProctoringAlert: (alert) =>
    set((state) => ({
      proctoringAlerts: [...state.proctoringAlerts.slice(-49), { ...alert, timestamp: Date.now() }],
    })),

  // ── Interview Phase (replaces prop-drilling) ───────────────────────────
  currentPhase: 'ready',    // 'ready' | 'initializing' | 'interviewing' | 'ending' | 'ended'
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
}));
