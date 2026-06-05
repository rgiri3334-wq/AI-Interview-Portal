/**
 * =============================================================================
 * AI Virtual Interview Platform — Enterprise API Gateway v5.0
 * =============================================================================
 * Architect: Aditya Singh
 * Features:
 *   - Centralized Axios instance
 *   - Automatic retry with exponential backoff (3 retries for 5xx + network errors)
 *   - Request ID tracing for log correlation
 *   - Normalized error responses (never crashes on non-JSON error bodies)
 *   - WebSocket helper with connection factory
 * =============================================================================
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Axios Instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Inject request ID for tracing ────────────────────
api.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  
  if (config.url?.startsWith('/api/admin')) {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  console.log(
    `%c[API] ${config.method?.toUpperCase()} ${config.url}`,
    'color: #00D1FF; font-weight: bold;'
  );
  return config;
});

// ── Response Interceptor: Normalize all errors ────────────────────────────
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const rawDetail =
      err.response?.data?.detail ||
      err.response?.data?.error  ||
      err.response?.data?.message ||
      err.message ||
      'Unknown API error';

    // FastAPI 422 validation errors return `detail` as an array of objects like:
    // [{ loc: ["body","password"], msg: "ensure this value has at least 6 characters" }]
    // Joining the `msg` fields gives a readable error string.
    let detail;
    if (Array.isArray(rawDetail)) {
      detail = rawDetail.map(e => e.msg || JSON.stringify(e)).join('; ');
    } else {
      detail = String(rawDetail);
    }

    if (detail !== 'Network Error') {
      console.error(
        `%c[API Error] ${status ? `HTTP ${status}` : 'Network'}: ${detail}`,
        'color: #ff6b35; font-weight: bold;'
      );
    }
    
    // Automatic 401 Session Purging
    if (status === 401) {
      sessionStorage.removeItem('adminToken');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }

    // Preserve HTTP status on the normalized error so withRetry can inspect it
    const normalized = new Error(detail);
    normalized.statusCode = status;
    return Promise.reject(normalized);
  }
);


// ── Retry Utility (manual exponential backoff — no extra dependency) ───────
async function withRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Do not retry on 4xx client errors (invalid request body etc.)
      // statusCode is set by our response interceptor above
      const status = err?.statusCode || err?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) throw err;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
        console.warn(`[API] Retry ${attempt + 1}/${retries} in ${delay.toFixed(0)}ms…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ── Enterprise API Surface ────────────────────────────────────────────────
export const apiClient = {
  // ── System Health ──────────────────────────────────────────────────────
  health: () => api.get('/'),
  systemStatus: () => api.get('/api/system/status'),

  // ── Candidate & Admin Operations ───────────────────────────────────────────────
  registerCandidate: (data) => withRetry(() => api.post('/api/auth/register', data)),
  loginCandidate: (data) => withRetry(() => api.post('/api/auth/login', data)),
  adminLogin: (data) => withRetry(() => api.post('/api/auth/admin-login', data)),

  // ── OTP Authentication (Sprint 1) ─────────────────────────────────────
  sendCandidateOtp:   (data) => withRetry(() => api.post('/api/auth/candidate/send-otp', data)),
  verifyCandidateOtp: (data) => withRetry(() => api.post('/api/auth/candidate/verify-otp', data)),
  applyForRole: (candidateId, data) => withRetry(() => api.post(`/api/candidates/${candidateId}/apply`, data)),
  getCandidate: (id) => api.get(`/api/candidates/${id}`),

  // ── AI Engine ─────────────────────────────────────────────────────────
  generateQuestion: (data) => withRetry(() => api.post('/generate-question', data)),
  assessCandidate:  (data) => withRetry(() => api.post('/api/interview/assess', data)),
  executeCode: (data) => api.post('/api/execute-code', data),

  // ── Whisper Transcription ─────────────────────────────────────────────
  transcribeAudio: (audioBlob) => {
    const form = new FormData();
    form.append('file', audioBlob, 'audio.webm');
    return withRetry(() =>
      api.post('/api/transcribe', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000,
      })
    );
  },

  // ── Resume Intelligence ───────────────────────────────────────────────
  uploadResume: (resumeId, interviewId, formData) =>
    withRetry(() =>
      api.post(`/api/resumes/${resumeId}/upload?interview_id=${interviewId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // Gemini resume parsing can take 10-20s
      })
    ),

  // ── Data Persistence ──────────────────────────────────────────────────
  saveInterview:      (data) => withRetry(() => api.post('/api/interviews/save', data)),
  getCandidateReport: (id) => api.get(`/api/reports/${id}`),
  getAIReport:        (id) => api.get(`/api/interview/ai-report/${id}`),
  getDashboardData:   () => api.get('/api/dashboard'),
  getLeaderboard:     () => api.get('/api/leaderboard'),
};

// ── WebSocket Factory ──────────────────────────────────────────────────────
// Prefer useInterviewWebSocket hook for new code.
// This factory is preserved for backward compatibility.
export const createInterviewSocket = (candidateId, onMessage) => {
  const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000');
  const ws = new WebSocket(`${wsUrl}/ws/interview/${candidateId}`);
  ws.onopen    = () => console.log('%c[WS] Connection established', 'color: #00ff88;');
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch {} };
  ws.onerror   = (e) => console.error('%c[WS Error]', 'color: #ff6b35;', e);
  ws.onclose   = () => console.log('%c[WS] Connection closed', 'color: #8B949E;');
  return ws;
};

export default api;
