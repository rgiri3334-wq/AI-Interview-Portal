/**
 * hooks/useInterviewWebSocket.js
 * Enterprise-grade WebSocket hook for the Live Interview engine.
 *
 * Features:
 *   - Automatic reconnection with exponential backoff (max 30s)
 *   - Heartbeat ping every 25s to prevent proxy/load-balancer timeout
 *   - Clean ref-based architecture (no stale closures)
 *   - Dispatches typed events: analysis, assessment_complete, assessment_error, pong
 *   - Never leaks connections on unmount
 *
 * Author: Aditya Singh
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = (candidateId) => {
  const defaultWs = `ws://${window.location.hostname}:8000/ws/interview/${candidateId}`;
  return import.meta.env.VITE_WS_URL 
    ? `${import.meta.env.VITE_WS_URL}/ws/interview/${candidateId}` 
    : defaultWs;
};

const PING_INTERVAL_MS  = 25_000;
const MAX_BACKOFF_MS    = 30_000;
const BASE_BACKOFF_MS   = 1_000;

export function useInterviewWebSocket(candidateId, { onAnalysis, onAssessment, onAssessing, onError } = {}) {
  const wsRef             = useRef(null);
  const pingTimerRef      = useRef(null);
  const reconnectTimerRef = useRef(null);
  const attemptRef        = useRef(0);
  const mountedRef        = useRef(true);

  // Stable refs for callbacks (avoids re-creating on every render)
  const onAnalysisRef   = useRef(onAnalysis);
  const onAssessmentRef = useRef(onAssessment);
  const onAssessingRef  = useRef(onAssessing);
  const onErrorRef      = useRef(onError);
  useEffect(() => { onAnalysisRef.current   = onAnalysis;   }, [onAnalysis]);
  useEffect(() => { onAssessmentRef.current = onAssessment; }, [onAssessment]);
  useEffect(() => { onAssessingRef.current  = onAssessing;  }, [onAssessing]);
  useEffect(() => { onErrorRef.current      = onError;      }, [onError]);

  const [connected, setConnected] = useState(false);

  const clearTimers = () => {
    if (pingTimerRef.current)      clearInterval(pingTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
  };

  const connect = useCallback(() => {
    if (!candidateId || !mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL(candidateId));
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      setConnected(true);
      console.log('%c[WS] Connected to interview engine', 'color:#00ff88;font-weight:bold');

      // Heartbeat to keep connection alive through proxies
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'analysis':
            onAnalysisRef.current?.(msg);
            break;
          case 'assessing':
            onAssessingRef.current?.(msg);
            break;
          case 'assessment_complete':
            onAssessmentRef.current?.(msg);
            break;
          case 'assessment_error':
            onErrorRef.current?.(msg.detail || 'Assessment failed');
            break;
          case 'pong':
            // Heartbeat acknowledged, connection is alive
            break;
          case 'error':
            console.warn('[WS] Server error:', msg.detail);
            break;
          default:
            break;
        }
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    };

    ws.onclose = (event) => {
      clearInterval(pingTimerRef.current);
      setConnected(false);
      if (!mountedRef.current) return;

      if (event.wasClean) {
        console.log('[WS] Connection closed cleanly');
        return;
      }

      // Exponential backoff reconnect
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** attemptRef.current, MAX_BACKOFF_MS);
      attemptRef.current += 1;
      console.warn(`[WS] Disconnected. Reconnecting in ${delay}ms (attempt ${attemptRef.current})…`);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      // onclose will fire after onerror and handle reconnect
    };
  }, [candidateId]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  // ── Public API ────────────────────────────────────────────────────────

  const sendTranscript = useCallback((text, durationSec = 30) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transcript',
        data: text,
        duration: durationSec,
      }));
    }
  }, []);

  const submitAnswerViaWS = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'submit_answer', ...payload }));
      return true;
    }
    return false; // caller should fall back to HTTP
  }, []);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended interview');
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  return { connected, sendTranscript, submitAnswerViaWS, disconnect };
}
